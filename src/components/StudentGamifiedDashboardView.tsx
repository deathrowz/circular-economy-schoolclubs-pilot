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
  Search,
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
import { postWhatsAppWebhookClient } from '@/lib/client/platform-bridge';
import { StudentGamificationHero } from '@/components/StudentGamificationHero';

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

  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [expandedLeaderboardSchoolId, setExpandedLeaderboardSchoolId] = useState<string | null>(null);

  const filteredLeaderboard = leaderboard.filter((entry) => {
    if (!leaderboardSearch) return true;
    const q = leaderboardSearch.toLowerCase();
    return (
      entry.school.name.toLowerCase().includes(q) ||
      entry.school.city.toLowerCase().includes(q) ||
      entry.club.name.toLowerCase().includes(q) ||
      entry.club.circular_sector.toLowerCase().includes(q)
    );
  });

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
  const [botQuickActions, setBotQuickActions] = useState<Array<{ label: string; value: string; variant?: string }>>([
    { label: '📸 Log Activity', value: '/log_impact', variant: 'primary' },
    { label: '📊 Club Status', value: '/status', variant: 'secondary' },
    { label: '🏆 Leaderboard', value: '/leaderboard', variant: 'accent' },
    { label: '❓ Photo Guide', value: '/photo_guide', variant: 'secondary' },
  ]);
  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([
    {
      id: 'init-student-bot',
      sender: 'bot',
      text:
        `Ayubowan / Vanakkam! Logged in as ${currentStudentUser.login_code} (${school.name}).\n\n` +
        `📱 No typing required! Tap any button below to get started:\n` +
        `• 📸 Log New Activity — submit your uncompressed photo\n` +
        `• 📊 Our Club Status — view verified recycling & sales\n` +
        `• 🏆 View Leaderboard — see your school's national rank\n` +
        `• ❓ How to Send Photo — easy guide on preserving GPS`,
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
      const data = await postWhatsAppWebhookClient({
        phoneNumber: currentStudentUser.phone_number || '94771234501',
        studentId: currentStudentUser.id,
        clubId: club.id,
        ...payload,
      });

      if (data.stage) setBotStage(data.stage);
      if (data.quickActions) setBotQuickActions(data.quickActions);
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
       * Generic School Club Login Status Banner (Role-Locked)
       * ==================================================================== */}
      <div className="hai-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px_12px_12px_2px] bg-[#005FA3] text-[#9CF2F2] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            {school.code}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#005FA3]">
                Generic School Club Login • {school.name}
              </span>
              <span className="hai-cyan-pill font-mono text-[11px] font-bold">
                ID: {currentStudentUser.login_code}
              </span>
            </div>
            <p className="text-xs text-[#111010]/70 mt-0.5">
              Logged in to the official student eco club enterprise portal for {school.name} ({school.city}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#111010]/70">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Active Authenticated Session</span>
        </div>
      </div>

      {/* ====================================================================
       * Gamified School Hero Banner with Animated Badges & Progress Mechanics
       * ==================================================================== */}
      <StudentGamificationHero
        school={school}
        club={club}
        schoolEntry={schoolEntry}
        activeUser={currentStudentUser}
        leaderboard={leaderboard}
        approvedLogsCount={approvedLogs.length}
        onLogActivityClick={() => sendSchoolBotUpdate({ text: '/log_impact' }, '📸 Log New Activity')}
      />


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
       * Full 15-School Island-Wide Leaderboard & Friendly Rivalry Standings
       * ==================================================================== */}
      <section className="hai-card overflow-hidden space-y-0">
        <div className="bg-[#005FA3] text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#9CF2F2] text-[#005FA3] text-xs font-bold uppercase tracking-wider">
                🏆 Island-Wide Gamified Standings
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-xs font-mono">
                15 Sri Lankan Schools
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-[var(--font-jakarta)] tracking-tight">
              National School Leaderboard &amp; Friendly Rivalry
            </h3>
            <p className="text-xs text-white/80">
              Live composite rankings across all 15 schools based on verified waste diverted, student sales, and criteria scores.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center">
              <div className="text-[10px] text-[#9CF2F2] uppercase font-bold">Our School Rank</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                #{schoolEntry.rank} <span className="text-xs text-[#9CF2F2]">of 15</span>
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center">
              <div className="text-[10px] text-[#9CF2F2] uppercase font-bold">Our School Points</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {currentScore} <span className="text-xs text-[#9CF2F2]">pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rivalry Banner */}
        <div className="bg-[#E6F1FA] border-b border-[#005FA3]/20 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#005FA3] shrink-0" />
            <span>
              {aboveEntry ? (
                <>
                  Chasing <strong>#{aboveEntry.rank} {aboveEntry.school.name}</strong> ({aboveEntry.composite_leaderboard_score} pts) —{' '}
                  <strong className="text-[#005FA3]">
                    {(aboveEntry.composite_leaderboard_score - currentScore).toFixed(1)} pts needed to overtake #{aboveEntry.rank}!
                  </strong>
                </>
              ) : (
                <strong className="text-emerald-700">
                  🏆 Leading #1 Nationally in Sri Lanka! Continue recycling &amp; enterprise sales to stay on top!
                </strong>
              )}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#111010]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={leaderboardSearch}
              onChange={(e) => setLeaderboardSearch(e.target.value)}
              placeholder="Find school or district..."
              className="w-full hai-input pl-8 pr-3 py-1.5 text-xs bg-white"
            />
          </div>
        </div>

        {/* 15 Schools Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="h-10 border-b border-[#111010]/15 bg-[#F0F3F5] font-semibold text-[#111010]/75">
                <th className="py-2.5 px-4 w-14">Rank</th>
                <th className="py-2.5 px-4">School &amp; Student Enterprise</th>
                <th className="py-2.5 px-4 text-right">Recycled (kg)</th>
                <th className="py-2.5 px-4 text-right">Sales (Rs.)</th>
                <th className="py-2.5 px-4 text-right">Grant Tier</th>
                <th className="py-2.5 px-5 text-right">Composite Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111010]/10">
              {filteredLeaderboard.map((entry) => {
                const isOurSchool = entry.school.id === school.id;
                const isExpanded = expandedLeaderboardSchoolId === entry.school.id;

                return (
                  <React.Fragment key={entry.school.id}>
                    <tr
                      onClick={() =>
                        setExpandedLeaderboardSchoolId(isExpanded ? null : entry.school.id)
                      }
                      className={`h-14 transition cursor-pointer ${
                        isOurSchool
                          ? 'bg-[#9CF2F2]/35 hover:bg-[#9CF2F2]/50 border-l-4 border-l-[#005FA3] font-bold'
                          : 'hover:bg-[#E6F1FA]/60'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            isOurSchool
                              ? 'bg-[#005FA3] text-[#9CF2F2] ring-2 ring-[#005FA3]/30'
                              : entry.rank <= 3
                              ? 'bg-[#005FA3] text-[#9CF2F2]'
                              : 'bg-[#F0F3F5] text-[#111010] border border-[#111010]/15'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={isOurSchool ? 'text-[#005FA3] font-bold' : 'font-semibold text-[#111010]'}>
                            {entry.school.name}
                          </span>
                          <span className="text-[11px] text-[#111010]/60">({entry.school.city})</span>
                          {isOurSchool && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#005FA3] text-[#9CF2F2] uppercase tracking-wider">
                              ⭐ OUR SCHOOL
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#111010]/65 mt-0.5">
                          {entry.club.name} • {entry.club.circular_sector}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono text-[#14494F]">
                        {entry.verified_waste_kg} kg
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono text-[#111010]">
                        {formatLkr(entry.verified_revenue_usd)}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0F3F5] text-[#111010]/80">
                          {entry.topoff_funding_tier.split(' (')[0]}
                        </span>
                      </td>

                      <td className="py-2.5 px-5 text-right font-mono font-bold text-sm text-[#005FA3]">
                        {entry.composite_leaderboard_score} pts
                      </td>
                    </tr>

                    {/* Expandable Evaluation Breakdown */}
                    {isExpanded && (
                      <tr className="bg-[#FFFFFF]/90 border-b border-[#111010]/15">
                        <td colSpan={6} className="p-4">
                          <div className="bg-[#E6F1FA]/60 border border-[#005FA3]/20 rounded-xl p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between font-bold text-[#005FA3]">
                              <span>6 National Evaluation Criteria Breakdown for {entry.school.name}:</span>
                              <span>Total: {entry.composite_leaderboard_score} pts</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[11px]">
                              <div className="bg-white p-2 rounded border border-[#111010]/10">
                                <div className="text-[10px] text-[#111010]/60">Relevance (20%)</div>
                                <div className="font-bold font-mono text-[#005FA3]">{entry.criteria_scores.relevance}/100</div>
                              </div>
                              <div className="bg-white p-2 rounded border border-[#111010]/10">
                                <div className="text-[10px] text-[#111010]/60">Business (20%)</div>
                                <div className="font-bold font-mono text-[#005FA3]">{entry.criteria_scores.business}/100</div>
                              </div>
                              <div className="bg-white p-2 rounded border border-[#111010]/10">
                                <div className="text-[10px] text-[#111010]/60">Feasibility (15%)</div>
                                <div className="font-bold font-mono text-[#005FA3]">{entry.criteria_scores.feasibility}/100</div>
                              </div>
                              <div className="bg-white p-2 rounded border border-[#111010]/10">
                                <div className="text-[10px] text-[#111010]/60">Ownership (15%)</div>
                                <div className="font-bold font-mono text-[#005FA3]">{entry.criteria_scores.student_ownership}/100</div>
                              </div>
                              <div className="bg-white p-2 rounded border border-[#111010]/10">
                                <div className="text-[10px] text-[#111010]/60">Sustain (15%)</div>
                                <div className="font-bold font-mono text-[#005FA3]">{entry.criteria_scores.sustainability}/100</div>
                              </div>
                              <div className="bg-white p-2 rounded border border-[#111010]/10">
                                <div className="text-[10px] text-[#111010]/60">Commit (15%)</div>
                                <div className="font-bold font-mono text-[#005FA3]">{entry.criteria_scores.institutional_commitment}/100</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
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
                  WhatsApp Ingestion (+94 11 234 5678) • School GPS: {school.campus_lat.toFixed(4)}, {school.campus_lng.toFixed(4)}
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

          {/* Quick Photo & Touch Controls */}
          <div className="bg-white border-t border-[#111010]/12 p-4 space-y-3">
            {/* Contextual Quick-Action Buttons / Choice Chips */}
            {botQuickActions.length > 0 && (
              <div className="space-y-1.5 pb-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#005FA3]">
                  <span>✨ Tap to Select (No typing required):</span>
                  {botStage !== 'IDLE' && (
                    <button
                      onClick={() => sendSchoolBotUpdate({ text: '/cancel' }, '❌ Cancel')}
                      className="text-rose-700 hover:underline cursor-pointer text-[10px]"
                    >
                      ❌ Cancel Current Flow
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {botQuickActions.map((qa) => (
                    <button
                      key={qa.label}
                      disabled={isSending}
                      onClick={() => sendSchoolBotUpdate({ text: qa.value }, qa.label)}
                      className={`px-3 py-1.5 rounded-[8px_8px_8px_2px] text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                        qa.variant === 'danger'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                          : qa.variant === 'accent'
                          ? 'bg-[#14494F] hover:bg-[#005FA3] text-white border border-[#14494F]'
                          : qa.variant === 'secondary'
                          ? 'bg-[#F0F3F5] hover:bg-[#E6F1FA] text-[#111010] border border-[#111010]/15'
                          : 'bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 text-[#005FA3] border border-[#005FA3]/30'
                      }`}
                    >
                      <span>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Photo Testing Shortcuts */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-[#111010]/60 uppercase tracking-wider">
                Photo Upload Simulation:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  disabled={isSending}
                  onClick={() =>
                    sendSchoolBotUpdate(
                      { sentAsCompressedPhoto: true },
                      '📷 [Photo without location data]',
                      'Location Off (Rejected)'
                    )
                  }
                  className="p-2.5 rounded-[10px_10px_10px_2px] bg-rose-50 hover:bg-rose-100 border border-rose-300 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                    <CameraOff className="w-3.5 h-3.5 shrink-0" />
                    <span>1. Location Off</span>
                  </div>
                  <div className="text-[10px] text-rose-700/80 mt-0.5">
                    Photo must be taken directly at the school premises with location services enabled.
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
                      '📎 [Photo missing school coordinates]',
                      'Missing School Location'
                    )
                  }
                  className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] border border-[#111010]/20 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[#111010] font-bold text-xs">
                    <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-[#005FA3]" />
                    <span>2. Off-Campus Photo</span>
                  </div>
                  <div className="text-[10px] text-[#111010]/65 mt-0.5">
                    Photo must be taken directly at the school premises with location services enabled.
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
                      `📎 [Sent School Photo: ${school.code}_ACTIVITY_FILE.JPG]`,
                      'School Premises Verified'
                    )
                  }
                  className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 border border-[#005FA3]/30 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[#005FA3] font-bold text-xs">
                    <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                    <span>3. Verified School Photo</span>
                  </div>
                  <div className="text-[10px] text-[#111010]/70 mt-0.5">
                    Validates campus location &amp; logs activity
                  </div>
                </button>
              </div>
            </div>

            {/* Persistent Child-Friendly Touch Pad (Always available in IDLE) */}
            {botStage === 'IDLE' && (
              <div className="pt-1 border-t border-[#111010]/10">
                <div className="text-[10px] font-bold text-[#005FA3] uppercase tracking-wider mb-1.5">
                  WhatsApp Touch Keyboard (Student Mode):
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isSending}
                    onClick={() => sendSchoolBotUpdate({ text: '/log_impact' }, '📸 Log New Activity')}
                    className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#005FA3] text-[#9CF2F2] font-bold text-xs hover:bg-[#0B3E6E] transition cursor-pointer text-left flex items-center justify-between"
                  >
                    <span>📸 Log New Activity</span>
                    <span className="text-[10px] text-white/80">Tap here</span>
                  </button>
                  <button
                    disabled={isSending}
                    onClick={() => sendSchoolBotUpdate({ text: '/status' }, '📊 Our Club Status')}
                    className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] text-[#111010] font-bold text-xs border border-[#111010]/15 transition cursor-pointer text-left flex items-center justify-between"
                  >
                    <span>📊 Our Club Status</span>
                    <span className="text-[10px] text-[#005FA3]">Summary</span>
                  </button>
                  <button
                    disabled={isSending}
                    onClick={() => sendSchoolBotUpdate({ text: '/leaderboard' }, '🏆 View Leaderboard')}
                    className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#E9F5F4] hover:bg-[#9CF2F2]/60 text-[#14494F] font-bold text-xs border border-[#14494F]/30 transition cursor-pointer text-left flex items-center justify-between"
                  >
                    <span>🏆 View Leaderboard</span>
                    <span className="text-[10px] text-[#14494F]">Rankings</span>
                  </button>
                  <button
                    disabled={isSending}
                    onClick={() => sendSchoolBotUpdate({ text: '/photo_guide' }, '❓ How to Send Photo')}
                    className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] text-[#111010] font-bold text-xs border border-[#111010]/15 transition cursor-pointer text-left flex items-center justify-between"
                  >
                    <span>❓ How to Send Photo</span>
                    <span className="text-[10px] text-[#111010]/60">Guide</span>
                  </button>
                </div>
              </div>
            )}

            {/* Text Input Fallback */}
            <form onSubmit={handleSendText} className="flex items-center gap-2 pt-1 border-t border-[#111010]/10">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  botStage === 'AWAITING_ACTIVITY_TITLE'
                    ? 'Tap a button above or type custom activity title...'
                    : botStage === 'AWAITING_WASTE_KG'
                    ? 'Tap a button above or type weight in kg (e.g. 22)...'
                    : botStage === 'AWAITING_REVENUE_USD'
                    ? 'Tap a button above or type sales in Rs. (e.g. 12000)...'
                    : 'Tap a button above or type here...'
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
                  {((log.verified_documents && log.verified_documents.length > 0) || log.scored_via_whatsapp || log.scored_via_telegram) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {log.verified_documents && log.verified_documents.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#E6F1FA] text-[#005FA3] font-semibold border border-[#005FA3]/20">
                          <Receipt className="w-3 h-3" />
                          {log.verified_documents.length} Verified {log.verified_documents.length === 1 ? 'Doc' : 'Docs'}
                        </span>
                      )}
                      {(log.scored_via_whatsapp || log.scored_via_telegram) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                          <Bot className="w-3 h-3 text-emerald-600" />
                          Scored via WhatsApp
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
