import { ActivityCategory, ExifMetadata } from '@/types/domain';
import { createSampleExifDocumentBuffer, extractAndValidateExif } from '@/lib/exif/parser';
import { uploadDocumentBufferToS3 } from '@/lib/storage/s3';
import {
  createStudentImpactSubmission,
  dispatchTelegramNotification,
  getPlatformStore,
} from '@/lib/store/platform-store';

export type BotConversationStage =
  | 'IDLE'
  | 'AWAITING_DOCUMENT'
  | 'AWAITING_ACTIVITY_TITLE'
  | 'AWAITING_WASTE_KG'
  | 'AWAITING_REVENUE_USD';

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
  studentId?: string;
  clubId?: string;
  text?: string;
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

export interface BotHandlerResponse {
  ok: boolean;
  stage: BotConversationStage;
  botReply: string;
  exifExtracted?: ExifMetadata;
  s3Uploaded?: { s3Url: string; s3Key: string; mode: string };
  createdLogId?: string;
  rejectedReason?: string;
}

/**
 * Processes an incoming Telegram Bot update (webhook payload or interactive simulator)
 * strictly enforcing the 6-step Student Data Entry workflow and Metadata Constraint.
 */
export async function handleTelegramBotUpdate(
  update: IncomingTelegramUpdate
): Promise<BotHandlerResponse> {
  const sessions = getSessionMap();
  const chatKey = String(update.chatId);
  const store = getPlatformStore();

  const defaultStudent =
    store.users.find((u) => u.id === update.studentId) ||
    store.users.find((u) => u.role === 'student')!;
  const defaultClubId = update.clubId || defaultStudent.club_id || 'club-01';
  const club = store.clubs.find((c) => c.id === defaultClubId) || store.clubs[0];

  let session = sessions.get(chatKey) || {
    chatId: update.chatId,
    studentId: defaultStudent.id,
    clubId: club.id,
    stage: 'IDLE',
    updatedAt: new Date().toISOString(),
  };

  if (update.studentId) session.studentId = update.studentId;
  if (update.clubId) session.clubId = update.clubId;

  const text = (update.text || '').trim();

  // 1. Handle Commands (/start, /log_impact, /resubmit <id>, /status, /cancel)
  if (text.startsWith('/start') || text.startsWith('/help')) {
    session.stage = 'IDLE';
    sessions.set(chatKey, session);
    return {
      ok: true,
      stage: 'IDLE',
      botReply:
        `👋 Welcome to the Circular-Economy Student Enterprise Bot (${club.name} • ${club.school_code})!\n\n` +
        `📌 COMMANDS:\n` +
        `• /log_impact — Start logging a new circular activity, material weight (kg), and revenue ($)\n` +
        `• /resubmit <log_id> — Use your single (1x) resubmission attempt for a rejected transaction\n` +
        `• /status — Check your club's pending and approved logs\n\n` +
        `⚠️ METADATA CONSTRAINT: Always send photos as uncompressed "Documents/Files" (📎 Attach -> File), NEVER as standard compressed Photos, so EXIF GPS & Timestamp data remain intact.`,
    };
  }

  if (text.startsWith('/cancel')) {
    session = {
      chatId: update.chatId,
      studentId: session.studentId,
      clubId: session.clubId,
      stage: 'IDLE',
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);
    return {
      ok: true,
      stage: 'IDLE',
      botReply: '🔄 Active submission cancelled. Type /log_impact whenever you are ready to start again.',
    };
  }

  if (text.startsWith('/status')) {
    const clubLogs = store.impactLogs.filter((l) => l.club_id === session.clubId).slice(0, 4);
    const summaryLines = clubLogs.map(
      (l) =>
        `• [${l.id}] ${l.activity_title} — ${l.status.toUpperCase()} (${l.transaction_type.toUpperCase()}: $${l.revenue_usd}, ${l.waste_kg}kg)`
    );
    return {
      ok: true,
      stage: session.stage,
      botReply:
        `📊 Latest Submissions for ${club.name} (${club.school_code}):\n` +
        (summaryLines.length ? summaryLines.join('\n') : 'No submissions yet.'),
    };
  }

  if (text.startsWith('/resubmit')) {
    const parts = text.split(/\s+/);
    const parentId = parts[1];
    if (!parentId) {
      return {
        ok: false,
        stage: session.stage,
        botReply:
          '⚠️ Please specify the rejected Log ID to resubmit. Example: `/resubmit log-108`',
      };
    }

    const targetLog = store.impactLogs.find((l) => l.id === parentId);
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
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_DOCUMENT',
      botReply:
        `🔁 STEP 5 RESOLUTION LOOP — RESUBMISSION (Attempt 1 of 1) for "${targetLog.activity_title}" (${targetLog.id})\n` +
        `• Previous Rejection Reason: "${targetLog.rejection_reason}"\n\n` +
        `📎 STEP 1: Please attach your new evidence photo as an **Uncompressed Document/File** (NOT a compressed photo) with intact EXIF Timestamp & GPS coordinates.`,
    };
  }

  if (text.startsWith('/log_impact')) {
    session = {
      chatId: update.chatId,
      studentId: session.studentId,
      clubId: session.clubId,
      stage: 'AWAITING_DOCUMENT',
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'AWAITING_DOCUMENT',
      botReply:
        `🌱 **New Circular Impact Submission (${club.name})**\n\n` +
        `📎 **Step 1 of 4 (The Metadata Constraint):**\n` +
        `Please send your activity evidence photo as an **Uncompressed Document / File** (Paperclip 📎 → Document/File).\n` +
        `⚠️ *Do NOT send as a standard compressed photo — Telegram strips EXIF GPS & Timestamp data from standard photos, which will cause automatic rejection.*`,
    };
  }

  // 2. Enforce Metadata Constraint if user sends a standard compressed photo at ANY stage
  if (update.sentAsCompressedPhoto) {
    const exifCheck = await extractAndValidateExif(new Uint8Array(0), {
      sentAsCompressedPhoto: true,
    });

    await dispatchTelegramNotification({
      chatId: update.chatId,
      studentName: defaultStudent.full_name,
      telegramUsername: defaultStudent.telegram_username || '@student',
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

  // 3. Handle incoming Document/File attachment (`update.document`)
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
          lat: store.schools.find((s) => s.id === club.school_id)?.campus_lat ?? 45.523062,
          lng: store.schools.find((s) => s.id === club.school_id)?.campus_lng ?? -122.676482,
        }
      );
    }

    // Step 3: Extract EXIF data (timestamp and GPS coordinates). Reject if missing!
    const exifResult = await extractAndValidateExif(fileBuffer, {
      sentAsCompressedPhoto: false,
      mimeType: doc.mimeType,
      fileName: doc.fileName,
    });

    if (!exifResult.valid || !exifResult.metadata) {
      await dispatchTelegramNotification({
        chatId: update.chatId,
        studentName: defaultStudent.full_name,
        telegramUsername: defaultStudent.telegram_username || '@student',
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

    // Step 4: Upload the verified uncompressed file to S3
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
      botReply:
        `✅ **EXIF Verified & Document Archived to S3!**\n` +
        `• File: \`${doc.fileName}\` (Uncompressed Document)\n` +
        `• EXIF Timestamp: \`${exifResult.metadata.timestamp}\`\n` +
        `• EXIF GPS: \`${exifResult.metadata.lat.toFixed(5)}, ${exifResult.metadata.lng.toFixed(5)}\`\n` +
        `• S3 Key: \`${s3Upload.s3Key}\`\n\n` +
        `📝 **Step 2 of 4:** What is the **Activity Title / Description**? (e.g., *"Weekly PETG Bottle Extrusion Batch"* or *"Final Funding Pitch & B2B Delivery"*)`,
    };
  }

  // 4. Contextual Follow-Up Questions State Machine
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
      botReply:
        `♻️ **Step 3 of 4 (Environmental Metric):**\n` +
        `How many **kilograms (kg)** of circular waste/feedstock were diverted or upcycled during *"${session.activityTitle}"*?\n` +
        `*(Enter a number, e.g. ` +
        '`18.5`' +
        `)*`,
    };
  }

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
      botReply:
        `💵 **Step 4 of 4 (Financial Metric):**\n` +
        `How much **revenue ($ USD)** was generated from this activity?\n` +
        `*(Note: Transactions **> $50** or Final Pitches are classified as **Macro-Transactions** requiring both Teacher Endorsement and Expert Panel adjudication. Enter a number, e.g. ` +
        '`35`' +
        ` or ` +
        '`120`' +
        `)*`,
    };
  }

  if (session.stage === 'AWAITING_REVENUE_USD' && text) {
    const parsedRev = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedRev) || parsedRev < 0) {
      return {
        ok: false,
        stage: 'AWAITING_REVENUE_USD',
        botReply: '⚠️ Please enter a valid non-negative dollar amount (e.g., `32` or `150`).',
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

    // Step 6: POST complete record to Supabase / Platform Store as `status: 'pending'`
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
      description: `Logged via Telegram Bot: ${session.activityTitle} (${session.wasteKg} kg circular waste, $${parsedRev} revenue).`,
      wasteKg: session.wasteKg ?? 0,
      revenueUsd: parsedRev,
      isFinalPitch: session.activityCategory === 'final_funding_pitch',
      parentLogId: session.resubmitParentLogId,
    });

    // Reset session to IDLE
    session = {
      chatId: update.chatId,
      studentId: session.studentId,
      clubId: session.clubId,
      stage: 'IDLE',
      updatedAt: new Date().toISOString(),
    };
    sessions.set(chatKey, session);

    return {
      ok: true,
      stage: 'IDLE',
      createdLogId: createdLog.id,
      botReply:
        `🎉 **Submission Recorded in Supabase (\`status: pending\`)!**\n` +
        `• **Log ID:** \`${createdLog.id}\`${
          createdLog.resubmission_count > 0 ? ' *(Resubmission Attempt 1/1)*' : ''
        }\n` +
        `• **Routing Tier:** \`${createdLog.transaction_type.toUpperCase()}\` (${
          createdLog.transaction_type === 'macro'
            ? '>$50 / High-Stakes → Teacher Endorsement + Expert Panel Scoring'
            : '<=$50 Micro → Teacher Approval releases points + 10% Random Audit Safeguard'
        })\n` +
        `• **Metrics:** \`${createdLog.waste_kg} kg\` diverted (${createdLog.co2_saved_kg} kg CO₂e) | \`$${createdLog.revenue_usd.toFixed(
          2
        )}\` revenue\n` +
        `• **Campus Geofence:** \`${createdLog.campus_distance_meters}m\` from ${createdLog.school_code} (${
          createdLog.on_campus_verified ? '✅ On-Campus Verified' : '⚠️ Off-Campus Distance Flag'
        })`,
    };
  }

  return {
    ok: true,
    stage: session.stage,
    botReply:
      session.stage === 'AWAITING_DOCUMENT'
        ? '📎 Waiting for your **Uncompressed Document/File** photo attachment (with EXIF GPS & Timestamp). Or type /cancel.'
        : '💡 Type `/log_impact` to submit a new circular enterprise activity, `/resubmit <log_id>` to resubmit a rejected transaction, or `/status` to view your club ledger.',
  };
}
