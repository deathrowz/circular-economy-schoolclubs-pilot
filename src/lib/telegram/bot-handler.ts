import {
  ActivityCategory,
  CriteriaScores,
  DocumentCategory,
  ExifMetadata,
  LeaderboardSchoolScore,
  UserRole,
} from '@/types/domain';
import { createSampleExifDocumentBuffer, extractAndValidateExif } from '@/lib/exif/parser';
import { uploadDocumentBufferToS3 } from '@/lib/storage/s3';
import {
  attachTeacherVerifiedDocumentToLog,
  createStudentImpactSubmission,
  dispatchTelegramNotification,
  findOrFetchImpactLog,
  getPlatformStore,
  submitExpertScoresViaTelegram,
} from '@/lib/store/platform-store';
import { computeSchoolLeaderboard, formatLkr } from '@/lib/gamification/engine';
import { getSupabaseBrowserClient, getSupabaseServiceClient } from '@/lib/supabase/client';

export type BotConversationStage =
  | 'IDLE'
  | 'AWAITING_DOCUMENT'
  | 'AWAITING_ACTIVITY_TITLE'
  | 'AWAITING_WASTE_KG'
  | 'AWAITING_REVENUE_USD'
  | 'AWAITING_TEACHER_INVOICE_DOC'
  | 'AWAITING_EXPERT_CRITERIA_INPUT';

export interface TelegramBotSession {
  chatId: number | string;
  studentId: string;
  clubId: string;
  stage: BotConversationStage;
  resubmitParentLogId?: string;
  fileName?: string;
  mimeType?: string;
  s3Url?: string;
  s3Key?: string;
  exif?: ExifMetadata;
  activityTitle?: string;
  activityCategory?: ActivityCategory;
  wasteKg?: number;
  actorRole?: UserRole;
  actorId?: string;
  invoiceTargetLogId?: string;
  invoiceDocCategory?: DocumentCategory;
  expertScoreTargetLogId?: string;
  updatedAt: string;
}

const globalForBotSessions = globalThis as unknown as {
  __TELEGRAM_BOT_SESSIONS__?: Map<string, TelegramBotSession>;
};

function getSessionMap(): Map<string, TelegramBotSession> {
  if (!globalForBotSessions.__TELEGRAM_BOT_SESSIONS__) {
    globalForBotSessions.__TELEGRAM_BOT_SESSIONS__ = new Map();
  }
  return globalForBotSessions.__TELEGRAM_BOT_SESSIONS__;
}

export function getBotSession(chatId: number | string): TelegramBotSession | undefined {
  return getSessionMap().get(String(chatId));
}

export interface IncomingTelegramUpdate {
  chatId: number | string;
  actorId?: string;
  actorRole?: UserRole;
  studentId?: string;
  clubId?: string;
  text?: string;
  docCategory?: DocumentCategory;
  verifiedAmountLkr?: number;
  /**
   * True if user sent standard compressed Telegram Photo (`message.photo`) instead of `message.document`
   */
  sentAsCompressedPhoto?: boolean;
  /**
   * Document attachment (`message.document`)
   */
  document?: {
    fileName: string;
    mimeType: string;
    fileBufferBase64?: string;
    simulatedExif?: {
      timestamp?: string | null;
      lat?: number | null;
      lng?: number | null;
      deviceMake?: string;
      deviceModel?: string;
      stripExif?: boolean;
    };
  };
}

export interface TelegramKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramReplyMarkup {
  keyboard?: TelegramKeyboardButton[][];
  inline_keyboard?: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  is_persistent?: boolean;
  one_time_keyboard?: boolean;
}

export interface BotQuickAction {
  label: string;
  value: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
}

export const STUDENT_TOUCH_KEYBOARD: TelegramReplyMarkup = {
  keyboard: [
    [{ text: '📸 Log New Activity' }, { text: '📊 Our Club Status' }],
    [{ text: '🏆 View Leaderboard' }, { text: '❓ How to Send Photo' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

export const TEACHER_TOUCH_KEYBOARD: TelegramReplyMarkup = {
  keyboard: [
    [{ text: '📎 Upload Invoice / Receipt' }, { text: '📋 View Pending Queue' }],
    [{ text: '📊 Our Club Status' }, { text: '🏆 View Leaderboard' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

export const EXPERT_TOUCH_KEYBOARD: TelegramReplyMarkup = {
  keyboard: [
    [{ text: '🔍 Review Invoices' }, { text: '⚖️ Expert Scoring Queue' }],
    [{ text: '🏆 View Leaderboard' }, { text: '❓ Help' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

export interface BotHandlerResponse {
  ok: boolean;
  stage: BotConversationStage;
  botReply: string;
  replyMarkup?: TelegramReplyMarkup;
  quickActions?: BotQuickAction[];
  exifExtracted?: ExifMetadata;
  s3Uploaded?: { s3Url: string; s3Key: string; mode: string };
  createdLogId?: string;
  rejectedReason?: string;
  attachedDocId?: string;
  scoredPoints?: number;
}

/**
 * Processes an incoming Telegram Bot update (webhook payload or interactive simulator)
 * supporting:
 * 1. Student Activity Submission & EXIF verification
 * 2. Teacher Invoice / Sales Receipt Uploads & GIZ verification routing
 * 3. Expert Panel Review & Direct Selection Criteria Scoring via Telegram to Dashboard
 */
export async function handleTelegramBotUpdate(
  update: IncomingTelegramUpdate
): Promise<BotHandlerResponse> {
  const sessions = getSessionMap();
  const chatKey = String(update.chatId);
  const store = getPlatformStore();

  const callerUser =
    (update.actorId && store.users.find((u) => u.id === update.actorId)) ||
    (update.studentId && store.users.find((u) => u.id === update.studentId)) ||
    store.users.find((u) => u.role === (update.actorRole || 'student')) ||
    store.users[0];

  const defaultClubId =
    update.clubId || callerUser.club_id || 'club-01';
  const club =
    store.clubs.find((c) => c.id === defaultClubId) || store.clubs[0];

  let session = sessions.get(chatKey) || {
    chatId: update.chatId,
    studentId: callerUser.id,
    clubId: club.id,
    stage: 'IDLE',
    actorRole: update.actorRole || callerUser.role,
    actorId: callerUser.id,
    updatedAt: new Date().toISOString(),
  };

  if (update.actorId) {
    session.actorId = update.actorId;
    session.actorRole = callerUser.role;
  }
  if (update.studentId) session.studentId = update.studentId;
  if (update.clubId) session.clubId = update.clubId;

  const rawText = (update.text || '').trim();
  const lowerText = rawText.toLowerCase();

  // Normalize friendly button clicks and emojis to commands:
  let text = rawText;
  if (
    lowerText === '📸 log new activity' ||
    lowerText === 'log new activity' ||
    lowerText === 'log activity' ||
    lowerText === '📸 log activity' ||
    lowerText === 'log impact'
  ) {
    text = '/log_impact';
  } else if (
    lowerText === '📊 our club status' ||
    lowerText === 'our club status' ||
    lowerText === 'club status' ||
    lowerText === '📊 club status'
  ) {
    text = '/status';
  } else if (
    lowerText === '🏆 view leaderboard' ||
    lowerText === 'view leaderboard' ||
    lowerText === 'leaderboard' ||
    lowerText === '🏆 leaderboard'
  ) {
    text = '/leaderboard';
  } else if (
    lowerText === '❓ how to send photo' ||
    lowerText === 'how to send photo' ||
    lowerText === 'photo guide' ||
    lowerText === '❓ photo guide'
  ) {
    text = '/photo_guide';
  } else if (
    lowerText === '❌ cancel' ||
    lowerText === 'cancel'
  ) {
    text = '/cancel';
  } else if (
    lowerText === '📎 upload invoice / receipt' ||
    lowerText === 'upload invoice' ||
    lowerText === 'upload receipt'
  ) {
    text = '/upload_invoice';
  } else if (
    lowerText === '📋 view pending queue' ||
    lowerText === 'view pending queue' ||
    lowerText === 'pending queue'
  ) {
    text = '/invoices';
  } else if (
    lowerText === '🔍 review invoices' ||
    lowerText === 'review invoices'
  ) {
    text = '/expert_queue';
  } else if (
    lowerText === '⚖️ expert scoring queue' ||
    lowerText === 'expert scoring queue'
  ) {
    text = '/expert_queue';
  }

  // 1. Handle Help / Start Command
  if (text.startsWith('/start') || text.startsWith('/help')) {
    session.stage = 'IDLE';
    sessions.set(chatKey, session);
    return {
      ok: true,
      stage: 'IDLE',
      replyMarkup: STUDENT_TOUCH_KEYBOARD,
      quickActions: [
        { label: '📸 Log Activity', value: '/log_impact', variant: 'primary' },
        { label: '📊 Club Status', value: '/status', variant: 'secondary' },
        { label: '🏆 Leaderboard', value: '/leaderboard', variant: 'accent' },
        { label: '❓ Photo Guide', value: '/photo_guide', variant: 'secondary' },
      ],
      botReply:
        `👋 Welcome to the **Haritha Pasal Bot** (${club.name} • ${club.school_code})!\n\n` +
        `📱 **No typing required! Tap any button below to get started:**\n\n` +
        `• 📸 **Log New Activity** — Tap to submit your uncompressed photo\n` +
        `• 📊 **Our Club Status** — View your latest verified recycling & sales\n` +
        `• 🏆 **View Leaderboard** — See your school's current national rank\n` +
        `• ❓ **How to Send Photo** — Visual guide on preserving GPS coordinates`,
    };
  }

  // 1b. Friendly Photo Guide for Children
  if (text.startsWith('/photo_guide')) {
    return {
      ok: true,
      stage: session.stage,
      replyMarkup: STUDENT_TOUCH_KEYBOARD,
      quickActions: [
        { label: '📸 Log Activity Now', value: '/log_impact', variant: 'primary' },
        { label: '📊 Club Status', value: '/status', variant: 'secondary' },
      ],
      botReply:
        `📸 **HOW TO SEND PHOTOS (Easy Student Guide):**\n\n` +
        `1️⃣ Tap the **Paperclip 📎 icon** at the bottom of Telegram.\n` +
        `2️⃣ Choose **File / Document** (⚠️ Do NOT tap "Gallery / Photo"!).\n` +
        `3️⃣ Select the photo taken during your school recycling activity.\n\n` +
        `✨ **Why send as a File?**\n` +
        `Telegram automatically removes GPS coordinates from regular gallery photos. Sending as a **File / Document** keeps the school GPS coordinates intact so our system can verify that the activity happened on campus and award your school points!\n\n` +
        `👉 Ready? Tap **📸 Log New Activity** below to try!`,
    };
  }

  // 1c. Friendly Leaderboard Check
  if (text.startsWith('/leaderboard')) {
    const leaderboard = computeSchoolLeaderboard({
      schools: store.schools,
      clubs: store.clubs,
      impactLogs: store.impactLogs,
      config: store.gamificationConfig,
    });
    const topSchools = leaderboard.slice(0, 5);
    const ranks = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const lines = topSchools.map(
      (entry: LeaderboardSchoolScore, idx: number) =>
        `${ranks[idx] || '•'} **${entry.school.name}** (${entry.school.code})\n` +
        `   Score: **${entry.composite_leaderboard_score} pts** | Waste: **${entry.verified_waste_kg} kg** | Sales: **${formatLkr(entry.verified_revenue_usd)}**`
    );

    return {
      ok: true,
      stage: session.stage,
      replyMarkup: STUDENT_TOUCH_KEYBOARD,
      quickActions: [
        { label: '📸 Log Activity', value: '/log_impact', variant: 'primary' },
        { label: '📊 Our Club Status', value: '/status', variant: 'secondary' },
      ],
      botReply:
        `🏆 **CURRENT TOP 5 SRI LANKAN SCHOOLS:**\n\n` +
        lines.join('\n\n') +
        `\n\n🌐 View the full 15-school interactive index on the dashboard!`,
    };
  }

  // 2. Cancel Command
  if (text.startsWith('/cancel')) {
    session = {
      chatId: update.chatId,
      studentId: session.studentId,
      clubId: session.clubId,
      stage: 'IDLE',
      actorRole: session.actorRole,
      actorId: session.actorId,
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);
    return {
      ok: true,
      stage: 'IDLE',
      replyMarkup: STUDENT_TOUCH_KEYBOARD,
      quickActions: [
        { label: '📸 Log Activity', value: '/log_impact', variant: 'primary' },
        { label: '📊 Club Status', value: '/status', variant: 'secondary' },
        { label: '🏆 Leaderboard', value: '/leaderboard', variant: 'accent' },
      ],
      botReply: '🔄 Active operation cancelled. Tap any button below to continue!',
    };
  }

  // 3. Status Command
  if (text.startsWith('/status')) {
    const clubLogs = store.impactLogs.filter((l) => l.club_id === session.clubId).slice(0, 4);
    const summaryLines = clubLogs.map(
      (l) =>
        `• [${l.id}] ${l.activity_title} — ${l.status.toUpperCase()} (${l.transaction_type.toUpperCase()}: ${formatLkr(
          l.revenue_usd
        )}, ${l.waste_kg}kg)${
          l.verified_documents?.length ? ` [📄 ${l.verified_documents.length} Invoices Attached]` : ''
        }`
    );
    return {
      ok: true,
      stage: session.stage,
      replyMarkup: STUDENT_TOUCH_KEYBOARD,
      quickActions: [
        { label: '📸 Log Activity', value: '/log_impact', variant: 'primary' },
        { label: '🏆 Leaderboard', value: '/leaderboard', variant: 'accent' },
        { label: '❓ Photo Guide', value: '/photo_guide', variant: 'secondary' },
      ],
      botReply:
        `📊 **Latest Submissions for ${club.name} (${club.school_code}):**\n\n` +
        (summaryLines.length ? summaryLines.join('\n') : 'No submissions yet.') +
        `\n\n👉 Tap **📸 Log Activity** below to add a new submission!`,
    };
  }

  // 4. Invoices / Pending Verification Queue for Teachers & GIZ
  if (text.startsWith('/invoices') || text.startsWith('/expert_queue')) {
    try {
      const supabase = getSupabaseServiceClient() || getSupabaseBrowserClient();
      if (supabase) {
        const { data: dbLogs } = await supabase
          .from('impact_logs')
          .select('*')
          .in('status', ['pending', 'pending_expert_review', 'flagged'])
          .order('created_at', { ascending: false });

        if (dbLogs) {
          for (const d of dbLogs) {
            if (!store.impactLogs.some((l) => l.id === d.id)) {
              store.impactLogs.unshift({
                ...d,
                parent_log_id: d.resubmission_parent_log_id || d.parent_log_id,
                verified_documents: d.verified_documents || [],
                waste_kg: Number(d.waste_kg || 0),
                revenue_usd: Number(d.revenue_usd || 0),
                co2_saved_kg: Number(d.co2_saved_kg || 0),
                points_awarded: Number(d.points_awarded || 0),
                penalty_points: Number(d.penalty_points || 0),
                campus_distance_meters: Number(d.campus_distance_meters || 0),
              });
            }
          }
        }
      }
    } catch (_) {}

    const queue = store.impactLogs.filter(
      (l) =>
        l.status === 'pending_expert_review' ||
        (l.status === 'pending' && l.transaction_type === 'macro') ||
        (l.verified_documents && l.verified_documents.length > 0 && l.status !== 'approved')
    );

    const lines = queue.slice(0, 5).map((l) => {
      const docBadge = l.verified_documents?.length
        ? `[📄 Verified Invoice Uploaded by Teacher]`
        : `[⏳ Awaiting Teacher Invoice]`;
      return `• [${l.id}] ${l.school_name} — "${l.activity_title}" (${formatLkr(
        l.revenue_usd
      )}, ${l.waste_kg} kg) ${docBadge}\n  👉 Review: \`/review ${l.id}\` | Quick Score: \`/score ${l.id} 90 90 90 90 90 90\``;
    });

    return {
      ok: true,
      stage: session.stage,
      botReply:
        `📋 **GIZ & National Expert Review Queue (${queue.length} Active):**\n\n` +
        (lines.length ? lines.join('\n\n') : 'All invoices have been reviewed and scored!'),
    };
  }

  // 5. TEACHER PIPELINE: /upload_invoice <log_id> or /upload_doc <log_id>
  if (text.startsWith('/upload_invoice') || text.startsWith('/upload_doc')) {
    const parts = text.split(/\s+/);
    const targetLogId = parts[1];

    if (!targetLogId) {
      return {
        ok: false,
        stage: session.stage,
        botReply:
          '⚠️ Please specify the Log ID to attach the verified invoice to.\nExample: `/upload_invoice log-102`',
      };
    }

    const targetLog = await findOrFetchImpactLog(targetLogId);
    if (!targetLog) {
      return {
        ok: false,
        stage: session.stage,
        botReply: `❌ Log ID "${targetLogId}" not found.`,
      };
    }

    session.stage = 'AWAITING_TEACHER_INVOICE_DOC';
    session.invoiceTargetLogId = targetLog.id;
    session.invoiceDocCategory = 'sales_invoice';
    session.updatedAt = new Date().toISOString();
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_TEACHER_INVOICE_DOC',
      botReply:
        `👩‍🏫 **TEACHER INVOICE & RECEIPT VERIFICATION GATEWAY**\n` +
        `• Target: [${targetLog.id}] ${targetLog.school_name} — "${targetLog.activity_title}"\n` +
        `• Reported Sales: ${formatLkr(targetLog.revenue_usd)} | Waste: ${targetLog.waste_kg} kg\n\n` +
        `📎 **Please attach the verified document now:**\n` +
        `Send the Sales Invoice, Official Receipt, Canteen Sales Slip, or Waste Scale Ticket as a **Document/File** (PDF, PNG, or JPG).\n` +
        `Once received, the bot will verify and forward it directly to the GIZ & National Expert Panel channel for scoring.`,
    };
  }

  // 6. EXPERT TELEGRAM SCORING PIPELINE: /score <log_id> <r> <b> <f> <o> <s> <i>
  if (text.startsWith('/score')) {
    const parts = text.split(/\s+/);
    const logId = parts[1];
    const scoreVals = parts.slice(2).map((v) => Number(v));

    if (!logId || scoreVals.length < 6 || scoreVals.some((n) => isNaN(n) || n < 0 || n > 100)) {
      return {
        ok: false,
        stage: session.stage,
        botReply:
          `⚠️ **Invalid Score Command Format!**\n\n` +
          `Format: \`/score <log_id> <relevance> <business> <feasibility> <leadership> <sustainability> <commitment>\`\n` +
          `Each score must be a number between 0 and 100.\n\n` +
          `👉 Example:\n\`/score log-102 92 88 86 94 95 90\`\n\n` +
          `Or type \`/review ${logId || 'log-102'}\` to view transaction details first.`,
      };
    }

    const expertActorId =
      session.actorRole === 'expert_admin' || session.actorRole === 'super_admin'
        ? session.actorId || 'usr-expert-01'
        : 'usr-expert-01';

    const criteriaScores: CriteriaScores = {
      relevance: scoreVals[0],
      business: scoreVals[1],
      feasibility: scoreVals[2],
      student_ownership: scoreVals[3],
      sustainability: scoreVals[4],
      institutional_commitment: scoreVals[5],
    };

    try {
      const res = await submitExpertScoresViaTelegram({
        actorId: expertActorId,
        logId,
        criteriaScores,
        notesOrReason: `Scored directly via Telegram Bot command (/score) by ${callerUser.full_name}.`,
      });

      session.stage = 'IDLE';
      sessions.set(chatKey, session);

      return {
        ok: true,
        stage: 'IDLE',
        scoredPoints: res.pointsAwarded,
        botReply:
          `🏆 **SELECTION CRITERIA SCORED & SUBMITTED VIA TELEGRAM!**\n\n` +
          `• **Log ID:** \`${res.log.id}\` (${res.log.school_name})\n` +
          `• **Enterprise:** ${res.log.club_name} — "${res.log.activity_title}"\n` +
          `• **Evaluator:** ${res.log.expert_reviewer_name} (National Expert Panel)\n` +
          `• **Criteria Scores:**\n` +
          `  1. Relevance: \`${criteriaScores.relevance}/100\`\n` +
          `  2. Business Viability: \`${criteriaScores.business}/100\`\n` +
          `  3. Feasibility: \`${criteriaScores.feasibility}/100\`\n` +
          `  4. Student Leadership: \`${criteriaScores.student_ownership}/100\`\n` +
          `  5. Sustainability: \`${criteriaScores.sustainability}/100\`\n` +
          `  6. School Commitment: \`${criteriaScores.institutional_commitment}/100\`\n\n` +
          `✅ **Points Released:** \`+${res.pointsAwarded} pts\` posted live to the Leaderboard!\n` +
          `📊 Status: \`APPROVED\` on the School Platform Dashboard.`,
      };
    } catch (err) {
      return {
        ok: false,
        stage: session.stage,
        botReply: `❌ Error submitting criteria scores via Telegram: ${(err as Error).message}`,
      };
    }
  }

  // 7. EXPERT TELEGRAM REVIEW: /review <log_id>
  if (text.startsWith('/review')) {
    const parts = text.split(/\s+/);
    const logId = parts[1];

    if (!logId) {
      return {
        ok: false,
        stage: session.stage,
        botReply: '⚠️ Please specify the Log ID to review. Example: `/review log-102`',
      };
    }

    const log = await findOrFetchImpactLog(logId);
    if (!log) {
      return {
        ok: false,
        stage: session.stage,
        botReply: `❌ Log ID "${logId}" not found.`,
      };
    }

    const docsSummary = log.verified_documents?.length
      ? log.verified_documents
          .map(
            (d) =>
              `• 📄 **${d.file_name}** (${d.doc_category.replace(/_/g, ' ')})\n` +
              `  - Verified Amount: Rs. ${(d.verified_amount_lkr || 0).toLocaleString()}\n` +
              `  - Verified By: ${d.verified_by_teacher_name}\n` +
              `  - S3 Storage: \`${d.s3_url}\``
          )
          .join('\n')
      : '• ⚠️ *No teacher invoice document uploaded yet. Use /upload_invoice ' + log.id + ' to upload.*';

    session.expertScoreTargetLogId = log.id;
    session.stage = 'AWAITING_EXPERT_CRITERIA_INPUT';
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_EXPERT_CRITERIA_INPUT',
      botReply:
        `🔍 **EXPERT DOSSIER REVIEW (${log.id})**\n\n` +
        `• **School:** ${log.school_name} (${log.school_code})\n` +
        `• **Activity:** "${log.activity_title}"\n` +
        `• **Verified Revenue:** ${formatLkr(log.revenue_usd)}\n` +
        `• **Waste Recycled:** ${log.waste_kg} kg (${log.co2_saved_kg} kg CO₂e)\n` +
        `• **School GPS Verified:** ${log.campus_distance_meters}m on campus (${
          log.on_campus_verified ? '✅ Verified' : '⚠️ Flag'
        })\n\n` +
        `📑 **TEACHER-VERIFIED DOCUMENTATION:**\n${docsSummary}\n\n` +
        `⚖️ **SUBMIT SELECTION CRITERIA SCORES VIA TELEGRAM:**\n` +
        `Reply with the 6 scores separated by spaces:\n` +
        `👉 \`/score ${log.id} 92 88 86 94 95 90\`\n` +
        `*(Relevance, Business, Feasibility, Leadership, Sustainability, School Commitment)*`,
    };
  }

  // 8. Resubmit command
  if (text.startsWith('/resubmit')) {
    const parts = text.split(/\s+/);
    const parentId = parts[1];
    if (!parentId) {
      return {
        ok: false,
        stage: session.stage,
        botReply: '⚠️ Please specify the rejected Log ID to resubmit. Example: `/resubmit log-108`',
      };
    }

    const targetLog = await findOrFetchImpactLog(parentId);
    if (!targetLog) {
      return {
        ok: false,
        stage: session.stage,
        botReply: `❌ Log ID "${parentId}" not found.`,
      };
    }

    if (targetLog.status !== 'rejected') {
      return {
        ok: false,
        stage: session.stage,
        botReply: `⚠️ Log "${parentId}" has status "${targetLog.status}". Only rejected logs can enter the Step 5 Resolution Loop.`,
      };
    }

    if (targetLog.resubmission_count >= 1) {
      return {
        ok: false,
        stage: 'IDLE',
        rejectedReason: 'Single resubmission limit (1/1) already exhausted.',
        botReply:
          `🚫 RESOLUTION LOOP LOCKED: Log "${parentId}" has already used its single (1/1) allowed resubmission attempt. No further resubmissions are permitted for this transaction.`,
      };
    }

    session = {
      chatId: update.chatId,
      studentId: session.studentId,
      clubId: targetLog.club_id,
      stage: 'AWAITING_DOCUMENT',
      resubmitParentLogId: targetLog.id,
      actorRole: session.actorRole,
      actorId: session.actorId,
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_DOCUMENT',
      botReply:
        `🔁 STEP 5 RESOLUTION LOOP — RESUBMISSION (Attempt 1 of 1) for "${targetLog.activity_title}" (${targetLog.id})\n` +
        `• Previous Rejection Reason: "${targetLog.rejection_reason}"\n\n` +
        `📎 STEP 1: Please attach your new evidence photo as an **Uncompressed Document/File** with intact EXIF Timestamp & GPS coordinates.`,
    };
  }

  // 9. Log Impact command
  if (text.startsWith('/log_impact')) {
    session = {
      chatId: update.chatId,
      studentId: session.studentId,
      clubId: session.clubId,
      stage: 'AWAITING_DOCUMENT',
      actorRole: session.actorRole,
      actorId: session.actorId,
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_DOCUMENT',
      replyMarkup: {
        keyboard: [
          [{ text: '❓ How to Send Photo' }, { text: '❌ Cancel' }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      },
      quickActions: [
        { label: '❓ How to Send Photo', value: '/photo_guide', variant: 'secondary' },
        { label: '❌ Cancel', value: '/cancel', variant: 'danger' },
      ],
      botReply:
        `🌱 **New School Impact Submission (${club.name})**\n\n` +
        `📎 **Step 1 of 4 (Activity Photo):**\n` +
        `Tap the **Paperclip 📎 → Document/File** and choose your activity photo.\n\n` +
        `💡 *Why Document/File? Telegram removes GPS coordinates from regular photos. Sending as a Document/File keeps school GPS data intact!*\n\n` +
        `Tap **❓ How to Send Photo** below if you need a quick guide, or **❌ Cancel** at any time.`,
    };
  }

  // 10. Handle TEACHER INVOICE DOCUMENT UPLOAD (`AWAITING_TEACHER_INVOICE_DOC`)
  if (session.stage === 'AWAITING_TEACHER_INVOICE_DOC' && update.document) {
    const doc = update.document;
    const targetLogId = session.invoiceTargetLogId || 'log-102';
    const targetLog = await findOrFetchImpactLog(targetLogId);

    if (!targetLog) {
      session.stage = 'IDLE';
      sessions.set(chatKey, session);
      return { ok: false, stage: 'IDLE', botReply: '❌ Target transaction not found.' };
    }

    const teacherActorId =
      session.actorRole === 'teacher' || session.actorRole === 'super_admin'
        ? session.actorId || 'usr-teacher-01'
        : 'usr-teacher-01';

    let fileBuffer: Uint8Array;
    if (doc.fileBufferBase64) {
      const binaryStr =
        typeof atob === 'function'
          ? atob(doc.fileBufferBase64)
          : Buffer.from(doc.fileBufferBase64, 'base64').toString('binary');
      fileBuffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        fileBuffer[i] = binaryStr.charCodeAt(i);
      }
    } else {
      fileBuffer = new TextEncoder().encode(`INVOICE_EVIDENCE_${doc.fileName}`);
    }

    const s3Upload = await uploadDocumentBufferToS3({
      buffer: fileBuffer,
      schoolCode: targetLog.school_code,
      clubSlug: targetLog.club_name.toLowerCase().replace(/\s+/g, '-'),
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      exifTimestamp: new Date().toISOString(),
      exifLat: 6.9047,
      exifLng: 79.8612,
    });

    const docCategory: DocumentCategory =
      update.docCategory ||
      (doc.fileName.toLowerCase().includes('receipt')
        ? 'official_receipt'
        : doc.fileName.toLowerCase().includes('scale')
        ? 'waste_scale_ticket'
        : 'sales_invoice');

    const result = await attachTeacherVerifiedDocumentToLog({
      actorId: teacherActorId,
      logId: targetLog.id,
      docCategory,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      s3Url: s3Upload.s3Url,
      s3Key: s3Upload.s3Key,
      verifiedAmountLkr: update.verifiedAmountLkr || (targetLog.revenue_usd * 300),
      notes: `Verified by Supervising Teacher and uploaded via Telegram Bot.`,
      uploadedViaTelegram: true,
    });

    session.stage = 'IDLE';
    session.invoiceTargetLogId = undefined;
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'IDLE',
      attachedDocId: result.document.id,
      s3Uploaded: s3Upload,
      botReply:
        `📄 **TEACHER-VERIFIED INVOICE UPLOADED VIA TELEGRAM!**\n\n` +
        `• **Transaction:** [${targetLog.id}] ${targetLog.school_name} — "${targetLog.activity_title}"\n` +
        `• **Document:** \`${result.document.file_name}\` (${result.document.doc_category.replace(/_/g, ' ')})\n` +
        `• **Verified Amount:** Rs. ${(result.document.verified_amount_lkr || 0).toLocaleString()}\n` +
        `• **S3 Storage:** \`${result.document.s3_url}\`\n\n` +
        `📡 **PIPELINE STATUS:**\n` +
        `✅ Document forwarded automatically to the **GIZ & National Expert Panel** Telegram review channel!\n` +
        `Experts can now review this invoice and submit selection criteria scores directly via: \`/score ${targetLog.id} 92 88 86 94 95 90\``,
    };
  }

  // 11. Reject Compressed Photo if sent
  if (update.sentAsCompressedPhoto) {
    const exifCheck = await extractAndValidateExif(new Uint8Array(0), {
      sentAsCompressedPhoto: true,
    });

    await dispatchTelegramNotification({
      chatId: update.chatId,
      studentName: callerUser.full_name,
      telegramUsername: callerUser.telegram_username || '@student',
      type: 'METADATA_REJECTION',
      text: exifCheck.errorMessage!,
    });

    return {
      ok: false,
      stage: session.stage === 'IDLE' ? 'AWAITING_DOCUMENT' : session.stage,
      rejectedReason: exifCheck.errorCode,
      botReply: exifCheck.errorMessage!,
    };
  }

  // 12. Handle Student Evidence Photo Document (`AWAITING_DOCUMENT`)
  if (update.document) {
    const doc = update.document;
    let fileBuffer: Uint8Array;

    if (doc.fileBufferBase64) {
      const binaryStr =
        typeof atob === 'function'
          ? atob(doc.fileBufferBase64)
          : Buffer.from(doc.fileBufferBase64, 'base64').toString('binary');
      fileBuffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        fileBuffer[i] = binaryStr.charCodeAt(i);
      }
    } else {
      fileBuffer = createSampleExifDocumentBuffer(
        doc.simulatedExif || {
          timestamp: new Date().toISOString(),
          lat: store.schools.find((s) => s.id === club.school_id)?.campus_lat ?? 6.9047,
          lng: store.schools.find((s) => s.id === club.school_id)?.campus_lng ?? 79.8612,
        }
      );
    }

    const exifResult = await extractAndValidateExif(fileBuffer, {
      sentAsCompressedPhoto: false,
      mimeType: doc.mimeType,
      fileName: doc.fileName,
    });

    if (!exifResult.valid || !exifResult.metadata) {
      await dispatchTelegramNotification({
        chatId: update.chatId,
        studentName: callerUser.full_name,
        telegramUsername: callerUser.telegram_username || '@student',
        type: 'METADATA_REJECTION',
        text: exifResult.errorMessage || 'EXIF validation failed.',
      });

      return {
        ok: false,
        stage: 'AWAITING_DOCUMENT',
        rejectedReason: exifResult.errorCode,
        botReply:
          exifResult.errorMessage ||
          '❌ Submission rejected: Missing EXIF timestamp or GPS coordinates.',
      };
    }

    const s3Upload = await uploadDocumentBufferToS3({
      buffer: fileBuffer,
      schoolCode: club.school_code,
      clubSlug: club.slug,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      exifTimestamp: exifResult.metadata.timestamp,
      exifLat: exifResult.metadata.lat,
      exifLng: exifResult.metadata.lng,
    });

    session.fileName = doc.fileName;
    session.mimeType = doc.mimeType;
    session.s3Url = s3Upload.s3Url;
    session.s3Key = s3Upload.s3Key;
    session.exif = exifResult.metadata;
    session.stage = 'AWAITING_ACTIVITY_TITLE';
    session.updatedAt = new Date().toISOString();
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_ACTIVITY_TITLE',
      exifExtracted: exifResult.metadata,
      s3Uploaded: s3Upload,
      replyMarkup: {
        keyboard: [
          [{ text: '🍾 PET Bottle Sorting' }, { text: '🌱 Bio-Compost Harvest' }],
          [{ text: '📦 Recycled Paper Craft' }, { text: '🔌 Solar & E-Waste Lab' }],
          [{ text: '🥗 Organic Garden Harvest' }, { text: '❌ Cancel' }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      },
      quickActions: [
        { label: '🍾 PET Bottle Sorting', value: 'Canteen PET Bottle Sorting', variant: 'primary' },
        { label: '🌱 Bio-Compost Harvest', value: 'School Bio-Compost Harvest', variant: 'primary' },
        { label: '📦 Recycled Paper Craft', value: 'Recycled Paper Crafts Sale', variant: 'primary' },
        { label: '🔌 Solar & E-Waste Lab', value: 'Solar & E-Waste Repair Lab', variant: 'primary' },
        { label: '🥗 Organic Garden Harvest', value: 'Organic Garden Harvest Pola', variant: 'primary' },
        { label: '❌ Cancel', value: '/cancel', variant: 'danger' },
      ],
      botReply:
        `✅ **EXIF Verified & Document Uploaded!**\n` +
        `• File: \`${doc.fileName}\` (Uncompressed Document)\n` +
        `• EXIF Timestamp: \`${exifResult.metadata.timestamp}\`\n` +
        `• EXIF GPS: \`${exifResult.metadata.lat.toFixed(5)}, ${exifResult.metadata.lng.toFixed(5)}\` (${club.school_code})\n\n` +
        `📝 **Step 2 of 4: What is the Activity Name?**\n` +
        `👉 **Tap one of the buttons below** (or type a custom name):`,
    };
  }

  // 13. Contextual Follow-Up: Activity Title
  if (session.stage === 'AWAITING_ACTIVITY_TITLE' && text) {
    session.activityTitle = text;
    const lower = text.toLowerCase();
    if (lower.includes('pitch') || lower.includes('seed')) {
      session.activityCategory = 'final_funding_pitch';
    } else if (lower.includes('sale') || lower.includes('sold') || lower.includes('order')) {
      session.activityCategory = 'product_sales';
    } else if (lower.includes('collect') || lower.includes('sort') || lower.includes('harvest')) {
      session.activityCategory = 'waste_collection';
    } else {
      session.activityCategory = 'upcycled_production';
    }
    session.stage = 'AWAITING_WASTE_KG';
    session.updatedAt = new Date().toISOString();
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_WASTE_KG',
      replyMarkup: {
        keyboard: [
          [{ text: '5 kg' }, { text: '10 kg' }, { text: '20 kg' }],
          [{ text: '35 kg' }, { text: '50 kg' }, { text: '❌ Cancel' }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      },
      quickActions: [
        { label: '5 kg', value: '5 kg', variant: 'primary' },
        { label: '10 kg', value: '10 kg', variant: 'primary' },
        { label: '20 kg', value: '20 kg', variant: 'primary' },
        { label: '35 kg', value: '35 kg', variant: 'primary' },
        { label: '50 kg', value: '50 kg', variant: 'primary' },
        { label: '❌ Cancel', value: '/cancel', variant: 'danger' },
      ],
      botReply:
        `♻️ **Step 3 of 4: Waste Recycled (kg)**\n` +
        `Activity: *"${session.activityTitle}"*\n\n` +
        `How many kilograms of waste were collected or upcycled?\n` +
        `👉 **Tap a weight below** (or type your exact weight):`,
    };
  }

  // 14. Contextual Follow-Up: Waste KG
  if (session.stage === 'AWAITING_WASTE_KG' && text) {
    const parsedKg = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedKg) || parsedKg < 0) {
      return {
        ok: false,
        stage: 'AWAITING_WASTE_KG',
        botReply: '⚠️ Please enter a valid non-negative number for kilograms (e.g., `14.5` or `0`).',
      };
    }

    session.wasteKg = parsedKg;
    session.stage = 'AWAITING_REVENUE_USD';
    session.updatedAt = new Date().toISOString();
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_REVENUE_USD',
      replyMarkup: {
        keyboard: [
          [{ text: 'Rs. 0 (Free Recycle)' }, { text: 'Rs. 3,500' }],
          [{ text: 'Rs. 7,500' }, { text: 'Rs. 15,000' }],
          [{ text: 'Rs. 25,000' }, { text: '❌ Cancel' }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      },
      quickActions: [
        { label: 'Rs. 0 (Free Recycle)', value: 'Rs. 0', variant: 'secondary' },
        { label: 'Rs. 3,500', value: 'Rs. 3,500', variant: 'primary' },
        { label: 'Rs. 7,500', value: 'Rs. 7,500', variant: 'primary' },
        { label: 'Rs. 15,000', value: 'Rs. 15,000', variant: 'primary' },
        { label: 'Rs. 25,000', value: 'Rs. 25,000', variant: 'accent' },
        { label: '❌ Cancel', value: '/cancel', variant: 'danger' },
      ],
      botReply:
        `💵 **Step 4 of 4: Sales Revenue (Rs.)**\n` +
        `Recorded: *${session.wasteKg} kg*\n\n` +
        `How much money did your club earn from this activity?\n` +
        `👉 **Tap an amount below** (or type in Rs.):\n` +
        `*(Amounts > Rs. 15,000 require Teacher Invoice verification)*`,
    };
  }

  // 15. Contextual Follow-Up: Revenue & Final POST
  if (session.stage === 'AWAITING_REVENUE_USD' && text) {
    const parsedRev = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedRev) || parsedRev < 0) {
      return {
        ok: false,
        stage: 'AWAITING_REVENUE_USD',
        botReply: '⚠️ Please enter a valid sales amount (e.g., `9000` or `24000`).',
      };
    }

    if (!session.exif || !session.s3Url || !session.s3Key || !session.activityTitle) {
      session.stage = 'IDLE';
      sessions.set(chatKey, session);
      return {
        ok: false,
        stage: 'IDLE',
        botReply: '⚠️ Session expired. Please start over with /log_impact.',
      };
    }

    const normalizedRevenueUsd =
      parsedRev >= 1000 ? Number((parsedRev / 300).toFixed(2)) : parsedRev;

    const createdLog = await createStudentImpactSubmission({
      actorId: session.studentId,
      clubId: session.clubId,
      fileName: session.fileName || 'TELEGRAM_DOCUMENT_RAW.JPG',
      mimeType: session.mimeType || 'image/jpeg',
      isUncompressedDocument: true,
      s3Url: session.s3Url,
      s3Key: session.s3Key,
      exifTimestamp: session.exif.timestamp,
      exifLat: session.exif.lat,
      exifLng: session.exif.lng,
      exifDeviceMake: session.exif.deviceMake,
      exifDeviceModel: session.exif.deviceModel,
      activityTitle: session.activityTitle,
      activityCategory: session.activityCategory || 'upcycled_production',
      description: `Logged via Telegram Bot: ${session.activityTitle} (${session.wasteKg} kg recycled waste, ${formatLkr(normalizedRevenueUsd)} sales).`,
      wasteKg: session.wasteKg ?? 0,
      revenueUsd: normalizedRevenueUsd,
      isFinalPitch: session.activityCategory === 'final_funding_pitch',
      parentLogId: session.resubmitParentLogId,
    });

    session = {
      chatId: update.chatId,
      studentId: session.studentId,
      clubId: session.clubId,
      stage: 'IDLE',
      actorRole: session.actorRole,
      actorId: session.actorId,
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'IDLE',
      createdLogId: createdLog.id,
      replyMarkup: STUDENT_TOUCH_KEYBOARD,
      quickActions: [
        { label: '📸 Log Another Activity', value: '/log_impact', variant: 'primary' },
        { label: '📊 Our Club Status', value: '/status', variant: 'secondary' },
        { label: '🏆 View Leaderboard', value: '/leaderboard', variant: 'accent' },
      ],
      botReply:
        `🎉 **Activity Logged Successfully!**\n\n` +
        `• **Activity:** "${createdLog.activity_title}"\n` +
        `• **Log ID:** \`${createdLog.id}\`${
          createdLog.resubmission_count > 0 ? ' *(Resubmission Attempt 1/1)*' : ''
        }\n` +
        `• **Tier:** \`${createdLog.transaction_type.toUpperCase()}\` (${
          createdLog.transaction_type === 'macro'
            ? '>Rs. 15,000 → Teacher Invoice Upload + Expert Panel Review'
            : '<=Rs. 15,000 Micro → Teacher Approval awards points + 10% Random Audit'
        })\n` +
        `• **Impact:** \`${createdLog.waste_kg} kg\` recycled | \`${formatLkr(
          createdLog.revenue_usd
        )}\` sales\n` +
        `• **School GPS Check:** \`${createdLog.campus_distance_meters}m\` from ${createdLog.school_code} (${
          createdLog.on_campus_verified ? '✅ Verified on Campus' : '⚠️ Distance Flag'
        })\n\n` +
        `📌 **NEXT STEP FOR TEACHERS:** Once verified on campus, Supervising Teacher uploads invoice with: \`/upload_invoice ${createdLog.id}\``,
    };
  }

  return {
    ok: true,
    stage: session.stage,
    botReply:
      session.stage === 'AWAITING_DOCUMENT'
        ? '📎 Waiting for your **Uncompressed Document/File** photo attachment (with EXIF GPS & Timestamp). Or type /cancel.'
        : session.stage === 'AWAITING_TEACHER_INVOICE_DOC'
        ? '📎 Waiting for the verified sales invoice, receipt, or scale ticket file. Or type /cancel.'
        : '💡 Type `/log_impact` to submit an activity, `/upload_invoice <log_id>` to upload a teacher-verified receipt, `/review <log_id>` for expert review, or `/score <log_id> ...` to submit scores via Telegram.',
  };
}
