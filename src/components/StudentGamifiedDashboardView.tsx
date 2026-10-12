'use client';

import React, { useState } from 'react';
import {
  AlertOctagon,
  Award,
  Bot,
  CameraOff,
  CheckCircle2,
  CloudUpload,
  Coins,
  Flame,
  Leaf,
  MapPin,
  RefreshCw,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Club,
  GamificationConfig,
  ImpactLog,
  LeaderboardSchoolScore,
  School,
  UserProfile,
} from '@/types/domain';
import { formatLkr } from '@/lib/gamification/engine';
import { postTelegramWebhookClient } from '@/lib/client/platform-bridge';

interface StudentGamifiedDashboardViewProps {
  activeUser: UserProfile;
  allUsers: UserProfile[];
  schools: School[];
  clubs: Club[];
  impactLogs: ImpactLog[];
  leaderboard: LeaderboardSchoolScore[];
  config: GamificationConfig;
  onSwitchUser: (userId: string) => void;
  onRefreshSnapshot: (snapshot: any) => void;
}

interface ChatBubble {
  id: string;
  sender: 'student' | 'bot';
  text: string;
  timestamp: string;
  badge?: string;
  isError?: boolean;
}

export function StudentGamifiedDashboardView({
  activeUser,
  allUsers,
  schools,
  clubs,
  impactLogs,
  leaderboard,
  config,
  onSwitchUser,
  onRefreshSnapshot,
}: StudentGamifiedDashboardViewProps) {
  const studentUsers = allUsers.filter((u) => u.role === 'student');

  // Ensure we have a valid school/club even if user was previously a non-student role
  const currentStudentUser =
    activeUser.role === 'student'
      ? activeUser
      : studentUsers[0];

  const schoolEntry =
    leaderboard.find((e) => e.school.id === currentStudentUser.school_id) ||
    leaderboard[0];

  const school = schoolEntry.school;
  const club = schoolEntry.club;

  const schoolLogs = impactLogs.filter((l) => l.school_id === school.id);
  const approvedLogs = schoolLogs.filter((l) => l.status === 'approved');
  const pendingLogs = schoolLogs.filter(
    (l) => l.status === 'pending' || l.status === 'pending_expert_review'
  );
  const rejectedLogs = schoolLogs.filter((l) => l.status === 'rejected');

  // Calculate next tier & XP progress bar for gamification
  const currentScore = schoolEntry.composite_leaderboard_score;
  const nextTierInfo = (() => {
    if (currentScore >= 420) {
      return {
        currentLevel: 'Level 4 • Platinum Eco-Enterprise',
        nextLabel: 'Platinum Max Tier Unlocked (Rs. 1,050,000 Top-Off)',
        targetScore: 500,
        progressPct: Math.min(100, Math.round((currentScore / 500) * 100)),
        pointsNeeded: 0,
      };
    }
    if (currentScore >= 340) {
      return {
        currentLevel: 'Level 3 • Gold Circular Club',
        nextLabel: 'Next Unlock: Platinum Grant (Rs. 1,050,000)',
        targetScore: 420,
        progressPct: Math.min(100, Math.round((currentScore / 420) * 100)),
        pointsNeeded: Number((420 - currentScore).toFixed(1)),
      };
    }
    if (currentScore >= 260) {
      return {
        currentLevel: 'Level 2 • Silver School Club',
        nextLabel: 'Next Unlock: Gold Grant (Rs. 750,000)',
        targetScore: 340,
        progressPct: Math.min(100, Math.round((currentScore / 340) * 100)),
        pointsNeeded: Number((340 - currentScore).toFixed(1)),
      };
    }
    return {
      currentLevel: 'Level 1 • Rising Green Club',
      nextLabel: 'Next Unlock: Silver Grant (Rs. 450,000)',
      targetScore: 260,
      progressPct: Math.min(100, Math.round((currentScore / 260) * 100)),
      pointsNeeded: Number((260 - currentScore).toFixed(1)),
    };
  })();

  // Friendly Rivalry: School ranked right above and right below
  const aboveEntry =
    schoolEntry.rank > 1
      ? leaderboard.find((e) => e.rank === schoolEntry.rank - 1)
      : null;
  const belowEntry =
    schoolEntry.rank < leaderboard.length
      ? leaderboard.find((e) => e.rank === schoolEntry.rank + 1)
      : null;

  // 6 Gamified School Quests / Achievements
  const hasOnCampusStreak =
    approvedLogs.length > 0 && approvedLogs.every((l) => l.on_campus_verified);
  const hasMacroApproved = approvedLogs.some((l) => l.transaction_type === 'macro');
  const wasteTargetKg = 100;
  const wastePct = Math.min(
    100,
    Math.round((schoolEntry.verified_waste_kg / wasteTargetKg) * 100)
  );
  const salesTargetUsd = 100; // Rs. 30,000
  const salesPct = Math.min(
    100,
    Math.round((schoolEntry.verified_revenue_usd / salesTargetUsd) * 100)
  );

  const quests = [
    {
      id: 'q-gps',
      title: 'EXIF GPS Guardian',
      desc: 'All verified photos submitted as uncompressed Files inside school GPS radius',
      xp: '+50 XP',
      unlocked: hasOnCampusStreak,
      progressText: hasOnCampusStreak ? '100% On-Campus Verified' : 'Submit on-campus File',
      pct: hasOnCampusStreak ? 100 : 60,
    },
    {
      id: 'q-waste',
      title: '100 kg Zero-Waste Milestone',
      desc: 'Recycle 100 kg of school PET plastic, compost, paper, or e-waste',
      xp: '+100 XP',
      unlocked: schoolEntry.verified_waste_kg >= wasteTargetKg,
      progressText: `${schoolEntry.verified_waste_kg} / ${wasteTargetKg} kg`,
      pct: wastePct,
    },
    {
      id: 'q-sales',
      title: 'Haritha Pola Entrepreneur',
      desc: 'Reach Rs. 30,000 in verified student enterprise product sales',
      xp: '+100 XP',
      unlocked: schoolEntry.verified_revenue_usd >= salesTargetUsd,
      progressText: `${formatLkr(schoolEntry.verified_revenue_usd)} / Rs. 30,000`,
      pct: salesPct,
    },
    {
      id: 'q-macro',
      title: 'National Panel Pitch Star',
      desc: 'Complete a high-value sale (> Rs. 15,000) approved by the Expert Panel',
      xp: '+150 XP',
      unlocked: hasMacroApproved,
      progressText: hasMacroApproved ? 'Macro Pitch Approved' : 'Awaiting > Rs. 15,000 Sale',
      pct: hasMacroApproved ? 100 : 40,
    },
    {
      id: 'q-audit',
      title: 'Clean Audit Shield',
      desc: 'Zero fraud penalties in the 10% random National Panel audit',
      xp: 'Active Shield',
      unlocked: schoolEntry.penalty_points_deducted === 0,
      progressText:
        schoolEntry.penalty_points_deducted === 0
          ? '0 Penalty Points'
          : `-${schoolEntry.penalty_points_deducted} pts Penalty`,
      pct: schoolEntry.penalty_points_deducted === 0 ? 100 : 20,
    },
    {
      id: 'q-team',
      title: 'Active Student Committee',
      desc: `${club.active_members_count} student members actively logging circular activities`,
      xp: '+75 XP',
      unlocked: club.active_members_count >= 15,
      progressText: `${club.active_members_count} Active Students`,
      pct: Math.min(100, Math.round((club.active_members_count / 18) * 100)),
    },
  ];

  // Embedded Telegram Bot state for this school's single-user login
  const [botStage, setBotStage] = useState<string>('IDLE');
  const [chatInput, setChatInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([
    {
      id: 'init-student-bot',
      sender: 'bot',
      text:
        `Ayubowan / Vanakkam! Logged in as ${currentStudentUser.login_code} (${school.name}).\n\n` +
        `📸 Send your activity photo as a "Document / File" to preserve EXIF timestamp & school GPS (${school.campus_lat.toFixed(4)}, ${school.campus_lng.toFixed(4)}).\n` +
        `Click /log_impact below to earn points for ${school.name}!`,
      timestamp: '09:30 AM',
      badge: `${currentStudentUser.login_code} Connected`,
    },
  ]);

  const appendBubble = (bubble: Omit<ChatBubble, 'id' | 'timestamp'>) => {
    setChatHistory((prev) => [
      ...prev,
      {
        ...bubble,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  const sendSchoolBotUpdate = async (
    payload: Record<string, any>,
    studentDisplayMessage: string,
    studentBadge?: string
  ) => {
    setIsSending(true);
    appendBubble({
      sender: 'student',
      text: studentDisplayMessage,
      badge: studentBadge,
    });

    try {
      const data = await postTelegramWebhookClient({
        chatId: currentStudentUser.telegram_user_id || 800101,
        studentId: currentStudentUser.id,
        clubId: club.id,
        ...payload,
      });

      if (data.stage) setBotStage(data.stage);
      if (data.snapshot) onRefreshSnapshot(data.snapshot);

      appendBubble({
        sender: 'bot',
        text: data.botReply || data.error || 'No response from bot.',
        badge: data.createdLogId
          ? `Logged ${data.createdLogId} (Pending Teacher)`
          : undefined,
        isError: !data.ok,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;
    const text = chatInput.trim();
    setChatInput('');
    await sendSchoolBotUpdate({ text }, text);
  };

  return (
    <div className="space-y-8">
      {/* ====================================================================
       * 15-School Single-User Student Login Selector Bar
       * ==================================================================== */}
      <div className="hai-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px_12px_12px_2px] bg-[#005FA3] text-[#9CF2F2] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            {school.code}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#005FA3]">
                Single-User School Student Login (1 of 15 Schools)
              </span>
              <span className="hai-cyan-pill font-mono text-[11px] font-bold">
                ID: {currentStudentUser.login_code}
              </span>
            </div>
            <p className="text-xs text-[#111010]/70 mt-0.5">
              Each of the 15 schools has 1 dedicated student club login with live gamification, quests, and activity logging.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label
            htmlFor="student-school-login-select"
            className="text-xs font-semibold text-[#111010]/70"
          >
            Switch School Student Login (15):
          </label>
          <select
            id="student-school-login-select"
            value={currentStudentUser.id}
            onChange={(e) => onSwitchUser(e.target.value)}
            className="hai-input px-3.5 py-2 text-xs font-semibold text-[#111010] cursor-pointer"
          >
            {studentUsers.map((su) => (
              <option key={su.id} value={su.id}>
                {su.login_code} • {su.school_name} ({su.club_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ====================================================================
       * Gamified School Hero Banner (Stanford HAI Zeal Cobalt #005FA3)
       * ==================================================================== */}
      <section className="hai-zeal-banner p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#9CF2F2] text-[#005FA3] font-mono text-xs font-bold">
                National Rank #{schoolEntry.rank} of 15
              </span>
              <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/25">
                {nextTierInfo.currentLevel}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/15 text-[#9CF2F2] text-xs font-mono">
                {currentStudentUser.email}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold text-white font-[var(--font-jakarta)] tracking-tight">
              {school.name} — {club.name}
            </h2>
            <p className="text-sm text-white/85 max-w-2xl">
              {club.tagline} • Student Lead:{' '}
              <strong className="text-[#9CF2F2]">
                {club.org_chart[0]?.holder_name}
              </strong>{' '}
              • Teacher Validator:{' '}
              <strong className="text-white">
                {club.org_chart[3]?.holder_name}
              </strong>
            </p>
          </div>

          {/* Total School Score Badge */}
          <div className="bg-white/10 border border-white/25 rounded-[20px_20px_20px_4px] px-6 py-4 text-center shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#9CF2F2]">
              Total School Points
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
              {currentScore} <span className="text-lg font-normal text-[#9CF2F2]">pts</span>
            </div>
            <div className="text-xs text-white/80 mt-1">
              Grant Tier: <strong>{schoolEntry.topoff_funding_tier}</strong>
            </div>
          </div>
        </div>

        {/* Gamified XP / Seed Grant Unlock Progress Bar */}
        <div className="bg-white/10 border border-white/20 rounded-[18px_18px_18px_4px] p-5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#9CF2F2] flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              {nextTierInfo.nextLabel}
            </span>
            <span className="font-mono text-white font-semibold">
              {nextTierInfo.pointsNeeded > 0
                ? `${nextTierInfo.pointsNeeded} more pts needed to level up (${currentScore} / ${nextTierInfo.targetScore} pts)`
                : `Top Platinum Tier Achieved! (${currentScore} pts)`}
            </span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-black/25 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-[#9CF2F2] transition-all duration-500"
              style={{ width: `${nextTierInfo.progressPct}%` }}
            />
          </div>
        </div>

        {/* 4 School KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 border border-white/20 rounded-[16px_16px_16px_4px] p-4">
            <div className="text-xs text-[#9CF2F2] font-semibold flex items-center gap-1.5">
              <Leaf className="w-4 h-4" /> Our Waste Recycled
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {schoolEntry.verified_waste_kg} kg
            </div>
            <div className="text-[11px] text-white/75 mt-0.5">
              {schoolEntry.verified_co2_kg} kg CO₂e saved
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-[16px_16px_16px_4px] p-4">
            <div className="text-xs text-[#9CF2F2] font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Our Verified Sales
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {formatLkr(schoolEntry.verified_revenue_usd)}
            </div>
            <div className="text-[11px] text-white/75 mt-0.5">
              {approvedLogs.length} approved activities
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-[16px_16px_16px_4px] p-4">
            <div className="text-xs text-[#9CF2F2] font-semibold flex items-center gap-1.5">
              <Coins className="w-4 h-4" /> Seed Grant Unlocked
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1.5">
              {formatLkr(
                school.seed_funding_base_usd + schoolEntry.topoff_funding_amount_usd
              )}
            </div>
            <div className="text-[11px] text-white/75 mt-0.5">
              Rs. 450k Base + {formatLkr(schoolEntry.topoff_funding_amount_usd)} Top-Off
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-[16px_16px_16px_4px] p-4">
            <div className="text-xs text-[#9CF2F2] font-semibold flex items-center gap-1.5">
              <Target className="w-4 h-4" /> Rivalry Gap
            </div>
            <div className="text-base font-bold text-white mt-1.5 truncate">
              {aboveEntry
                ? `${(
                    aboveEntry.composite_leaderboard_score - currentScore
                  ).toFixed(1)} pts behind #${aboveEntry.rank}`
                : 'Leading #1 Nationally!'}
            </div>
            <div className="text-[11px] text-white/75 mt-0.5 truncate">
              {aboveEntry
                ? `Chasing ${aboveEntry.school.name}`
                : belowEntry
                ? `${(
                    currentScore - belowEntry.composite_leaderboard_score
                  ).toFixed(1)} pts ahead of #2`
                : ''}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * Gamified School Quests & Badges (6 Interactive School Badges)
       * ==================================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-semibold text-[#111010] font-[var(--font-jakarta)] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#005FA3]" />
              <span>School Club Quests &amp; Badges ({quests.filter((q) => q.unlocked).length}/6 Unlocked)</span>
            </h3>
            <p className="text-xs text-[#111010]/70">
              Complete circular-economy milestones as a school to unlock badges and climb the 15-school index
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quests.map((q) => (
            <div
              key={q.id}
              className={`hai-card p-5 flex flex-col justify-between gap-3 ${
                q.unlocked ? 'border-[#005FA3]/40' : 'opacity-90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      q.unlocked
                        ? 'bg-[#005FA3] text-[#9CF2F2]'
                        : 'bg-[#F0F3F5] text-[#111010]/65'
                    }`}
                  >
                    {q.unlocked ? '✓ Badge Unlocked' : 'In Progress'}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#005FA3]">
                    {q.xp}
                  </span>
                </div>

                <h4 className="mt-3 text-base font-bold text-[#111010] font-[var(--font-jakarta)]">
                  {q.title}
                </h4>
                <p className="text-xs text-[#111010]/70 mt-1 leading-relaxed">
                  {q.desc}
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[#14494F]">{q.progressText}</span>
                  <span className="font-mono text-[#005FA3]">{q.pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F0F3F5] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      q.unlocked ? 'bg-[#005FA3]' : 'bg-[#005FA3]/50'
                    }`}
                    style={{ width: `${q.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
       * School Activity Submission Bot & School Submissions Ledger
       * ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Direct School Activity Logger (7 cols) */}
        <div className="lg:col-span-7 hai-card flex flex-col overflow-hidden">
          <div className="bg-[#005FA3] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-[#9CF2F2]" />
              <div>
                <div className="text-sm font-bold text-white">
                  Log New Activity for {school.name}
                </div>
                <div className="text-[11px] text-[#9CF2F2]">
                  Telegram Bot (@HarithaPasalBot) • School GPS: {school.campus_lat.toFixed(4)}, {school.campus_lng.toFixed(4)}
                </div>
              </div>
            </div>

            <button
              onClick={() => sendSchoolBotUpdate({ text: '/log_impact' }, '/log_impact')}
              className="hai-btn-on-zeal px-3.5 py-1.5 text-xs font-mono cursor-pointer"
            >
              /log_impact
            </button>
          </div>

          {/* Chat History */}
          <div className="p-4 space-y-3 h-[310px] overflow-y-auto bg-[#F0F3F5]">
            {chatHistory.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${
                  item.sender === 'student' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-[16px_16px_16px_4px] px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed ${
                    item.sender === 'student'
                      ? 'bg-[#005FA3] text-white font-medium'
                      : item.isError
                      ? 'bg-rose-50 border border-rose-300 text-rose-900'
                      : 'bg-[#FFFFFF] border border-[#111010]/12 text-[#111010]'
                  }`}
                >
                  {item.badge && (
                    <div className="text-[10px] font-mono uppercase mb-1 pb-1 border-b border-current/20 font-bold">
                      {item.badge}
                    </div>
                  )}
                  {item.text}
                </div>
                <span className="text-[10px] text-[#111010]/60 mt-1 px-1">{item.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Quick Photo Submission Controls */}
          <div className="bg-white border-t border-[#111010]/12 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                disabled={isSending}
                onClick={() =>
                  sendSchoolBotUpdate(
                    { sentAsCompressedPhoto: true },
                    '📷 [Sent Compressed Photo]',
                    'Compressed Photo (Rejected)'
                  )
                }
                className="p-2.5 rounded-[10px_10px_10px_2px] bg-rose-50 hover:bg-rose-100 border border-rose-300 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                  <CameraOff className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Normal Photo</span>
                </div>
                <div className="text-[10px] text-rose-700/80 mt-0.5">
                  Rejected (EXIF stripped)
                </div>
              </button>

              <button
                disabled={isSending}
                onClick={() =>
                  sendSchoolBotUpdate(
                    {
                      document: {
                        fileName: 'NO_GPS_PHOTO.JPG',
                        mimeType: 'image/jpeg',
                        simulatedExif: {
                          timestamp: new Date().toISOString(),
                          lat: null,
                          lng: null,
                        },
                      },
                    },
                    '📎 [Sent File without GPS]',
                    'Missing GPS (Rejected)'
                  )
                }
                className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] border border-[#111010]/20 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#111010] font-bold text-xs">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-[#005FA3]" />
                  <span>2. Missing GPS</span>
                </div>
                <div className="text-[10px] text-[#111010]/65 mt-0.5">
                  Rejected (No coordinates)
                </div>
              </button>

              <button
                disabled={isSending}
                onClick={() =>
                  sendSchoolBotUpdate(
                    {
                      document: {
                        fileName: `${school.code}_ACTIVITY_FILE.JPG`,
                        mimeType: 'image/jpeg',
                        simulatedExif: {
                          timestamp: new Date().toISOString(),
                          lat: Number((school.campus_lat + 0.0001).toFixed(6)),
                          lng: Number((school.campus_lng - 0.0001).toFixed(6)),
                          deviceMake: 'Samsung',
                          deviceModel: 'Galaxy A54 (Uncompressed File)',
                        },
                      },
                    },
                    `📎 [Sent Valid File: ${school.code}_ACTIVITY_FILE.JPG]`,
                    'Valid On-Campus EXIF'
                  )
                }
                className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 border border-[#005FA3]/30 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#005FA3] font-bold text-xs">
                  <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                  <span>3. Valid School File</span>
                </div>
                <div className="text-[10px] text-[#111010]/70 mt-0.5">
                  Verifies GPS &amp; logs data
                </div>
              </button>
            </div>

            <form onSubmit={handleSendText} className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  botStage === 'AWAITING_ACTIVITY_TITLE'
                    ? 'Enter activity title...'
                    : botStage === 'AWAITING_WASTE_KG'
                    ? 'Enter waste recycled in kg (e.g. "22")...'
                    : botStage === 'AWAITING_REVENUE_USD'
                    ? 'Enter sales in Rs. (e.g. "12000")...'
                    : 'Click /log_impact or reply here...'
                }
                className="flex-1 hai-input px-3.5 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={isSending}
                className="hai-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right: School Submissions Status & 1x Resubmission Loop (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Rejected Logs Requiring 1x Resubmission */}
          {rejectedLogs.length > 0 && (
            <div className="hai-card p-5 border-rose-300 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase">
                <RefreshCw className="w-4 h-4" />
                <span>Action Required: 1x Resubmission Available ({rejectedLogs.length})</span>
              </div>
              {rejectedLogs.map((rLog) => (
                <div key={rLog.id} className="hai-chrome-box p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111010]">{rLog.activity_title}</span>
                    <span className="hai-tag font-mono text-[10px]">
                      {rLog.resubmission_count}/1 used
                    </span>
                  </div>
                  <p className="text-rose-700 text-[11px]">
                    Reason: &ldquo;{rLog.rejection_reason}&rdquo;
                  </p>
                  <button
                    onClick={() =>
                      sendSchoolBotUpdate(
                        { text: `/resubmit ${rLog.id}` },
                        `/resubmit ${rLog.id}`,
                        'Resubmit Entry'
                      )
                    }
                    className="w-full py-1.5 hai-btn-primary text-xs cursor-pointer"
                  >
                    Resubmit {rLog.id} Now →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* School's Activity Feed */}
          <div className="hai-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#005FA3] font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>{school.name} Activity Log ({schoolLogs.length})</span>
              </div>
              {pendingLogs.length > 0 && (
                <span className="hai-cyan-pill text-[11px] font-bold">
                  {pendingLogs.length} Pending Review
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {schoolLogs.map((log) => (
                <div key={log.id} className="hai-chrome-box p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.status === 'approved'
                          ? 'bg-[#005FA3] text-[#9CF2F2]'
                          : log.status === 'rejected' || log.status === 'fraud_revoked'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-[#9CF2F2] text-[#005FA3]'
                      }`}
                    >
                      {log.status.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono font-bold text-[#005FA3]">
                      {log.points_awarded > 0
                        ? `+${log.points_awarded} pts`
                        : log.penalty_points > 0
                        ? `-${log.penalty_points} pts`
                        : 'Pending pts'}
                    </span>
                  </div>
                  <div className="font-bold text-[#111010] text-sm">
                    {log.activity_title}
                  </div>
                  {((log.verified_documents && log.verified_documents.length > 0) || log.scored_via_telegram) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {log.verified_documents && log.verified_documents.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#E6F1FA] text-[#005FA3] font-semibold border border-[#005FA3]/20">
                          <Receipt className="w-3 h-3" />
                          {log.verified_documents.length} Verified {log.verified_documents.length === 1 ? 'Doc' : 'Docs'}
                        </span>
                      )}
                      {log.scored_via_telegram && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                          <Bot className="w-3 h-3 text-emerald-600" />
                          Scored via Telegram
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-[#111010]/70 font-mono">
                    <span>
                      {log.waste_kg} kg • {formatLkr(log.revenue_usd)}
                    </span>
                    <span>
                      <MapPin className="w-3 h-3 inline mr-0.5 text-[#14494F]" />
                      {log.campus_distance_meters}m
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
