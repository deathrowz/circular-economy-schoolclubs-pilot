'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Dice5,
  ExternalLink,
  FileText,
  Flag,
  Gavel,
  Lock,
  MapPin,
  Receipt,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  CriteriaScores,
  GamificationConfig,
  ImpactLog,
  LeaderboardSchoolScore,
  School,
  UserProfile,
} from '@/types/domain';
import { calculateMacroTransactionPoints, formatLkr } from '@/lib/gamification/engine';
import {
  fetchPlatformSnapshotClient,
  postPlatformActionClient,
} from '@/lib/client/platform-bridge';

interface VerificationEngineViewProps {
  activeUser: UserProfile;
  users: UserProfile[];
  schools: School[];
  impactLogs: ImpactLog[];
  config: GamificationConfig;
  leaderboard?: LeaderboardSchoolScore[];
  initialSubTab?: 'macro_scoring' | 'random_audit' | 'algorithm_config';
  hideRoleSwitcher?: boolean;
  onSwitchUser: (userId: string) => void;
  onRefreshSnapshot: (snapshot: any) => void;
}

export function VerificationEngineView({
  activeUser,
  users,
  schools,
  impactLogs,
  config,
  leaderboard,
  initialSubTab,
  hideRoleSwitcher,
  onSwitchUser,
  onRefreshSnapshot,
}: VerificationEngineViewProps) {
  const [expertSubTab, setExpertSubTab] = useState<
    'macro_scoring' | 'random_audit' | 'algorithm_config'
  >(
    initialSubTab ||
      (activeUser.role === 'super_admin' || activeUser.role === 'admin'
        ? 'algorithm_config'
        : 'macro_scoring')
  );

  const [teacherSubTab, setTeacherSubTab] = useState<'approvals' | 'leaderboard'>('approvals');
  const [teacherLeaderboardSearch, setTeacherLeaderboardSearch] = useState('');
  const [teacherExpandedSchoolId, setTeacherExpandedSchoolId] = useState<string | null>(null);

  const myTeacherSchoolEntry = leaderboard
    ? leaderboard.find((e) => e.school.id === activeUser.school_id) || leaderboard[0]
    : null;

  const aboveTeacherEntry =
    myTeacherSchoolEntry && leaderboard && myTeacherSchoolEntry.rank > 1
      ? leaderboard.find((e) => e.rank === myTeacherSchoolEntry.rank - 1)
      : null;

  const filteredTeacherLeaderboard = (leaderboard || []).filter((entry) => {
    if (!teacherLeaderboardSearch) return true;
    const q = teacherLeaderboardSearch.toLowerCase();
    return (
      entry.school.name.toLowerCase().includes(q) ||
      entry.school.city.toLowerCase().includes(q) ||
      entry.club.name.toLowerCase().includes(q) ||
      entry.club.circular_sector.toLowerCase().includes(q)
    );
  });

  React.useEffect(() => {
    if (initialSubTab) {
      setExpertSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [expertSchoolFilter, setExpertSchoolFilter] = useState<string>('all');
  const [forceRandomAuditOnApprove, setForceRandomAuditOnApprove] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [busyLogId, setBusyLogId] = useState<string | null>(null);
  const [copiedScoreCmd, setCopiedScoreCmd] = useState<string | null>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const handleManualLiveSync = async () => {
    setIsRefreshingLive(true);
    try {
      const freshSnapshot = await fetchPlatformSnapshotClient();
      onRefreshSnapshot(freshSnapshot);
      setFeedbackBanner({
        type: 'success',
        message: '🔄 Live sync completed: Latest WhatsApp Cloud API submissions updated from Supabase.',
      });
    } catch {
      setFeedbackBanner({
        type: 'error',
        message: 'Unable to reach database for live sync.',
      });
    } finally {
      setIsRefreshingLive(false);
    }
  };

  const [criteriaDrafts, setCriteriaDrafts] = useState<Record<string, CriteriaScores>>({});
  const [configDraft, setConfigDraft] = useState<GamificationConfig>(config);

  React.useEffect(() => {
    if (config) {
      setConfigDraft(config);
    }
  }, [config]);

  const getCriteriaForLog = (log: ImpactLog): CriteriaScores => {
    if (criteriaDrafts[log.id]) return criteriaDrafts[log.id];
    const school = schools.find((s) => s.id === log.school_id);
    return (
      log.criteria_scores || {
        relevance: 90,
        business: 88,
        feasibility: 86,
        student_ownership: 92,
        sustainability: 94,
        institutional_commitment: school?.institutional_commitment_score ?? 88,
      }
    );
  };

  const updateCriteriaDraft = (
    logId: string,
    field: keyof CriteriaScores,
    value: number,
    fallback: CriteriaScores
  ) => {
    setCriteriaDrafts((prev) => ({
      ...prev,
      [logId]: {
        ...(prev[logId] || fallback),
        [field]: value,
      },
    }));
  };

  const handleTeacherDecision = async (
    log: ImpactLog,
    decision: 'approve' | 'reject' | 'flag'
  ) => {
    setBusyLogId(log.id);
    setFeedbackBanner(null);
    try {
      const notesOrReason =
        decision === 'reject'
          ? rejectionReasons[log.id] || ''
          : reviewNotes[log.id] || '';

      const { resOk, data } = await postPlatformActionClient({
        actionType: 'TEACHER_REVIEW',
        actorId: activeUser.id,
        logId: log.id,
        decision,
        notesOrReason,
        forceRandomAuditSelection: forceRandomAuditOnApprove ? true : undefined,
      });

      if (!resOk || !data.ok) {
        setFeedbackBanner({
          type: 'error',
          message: data.error || 'Permission or Validation Error',
        });
      } else {
        onRefreshSnapshot(data.snapshot);
        const updatedLog: ImpactLog = data.result.log;
        if (decision === 'approve' && updatedLog.transaction_type === 'macro') {
          setFeedbackBanner({
            type: 'warning',
            message: `✅ Teacher endorsed "${updatedLog.activity_title}" (${formatLkr(
              updatedLog.revenue_usd
            )} > ${formatLkr(config.macro_revenue_threshold_usd)}). Forwarded to the National Panel for scoring!`,
          });
        } else if (decision === 'approve' && updatedLog.transaction_type === 'micro') {
          setFeedbackBanner({
            type: 'success',
            message: `✅ Approved! Added +${updatedLog.points_awarded} pts to ${updatedLog.school_name}. ${
              updatedLog.random_audit_selected
                ? '🎲 Selected in 10% random audit sample for National Panel check.'
                : ''
            }`,
          });
        } else if (decision === 'reject') {
          setFeedbackBanner({
            type: 'warning',
            message: `🔔 Rejected "${updatedLog.activity_title}". Sent reason to ${updatedLog.student_name} on WhatsApp for their 1x resubmission.`,
          });
        } else {
          setFeedbackBanner({
            type: 'warning',
            message: `🚩 Submission "${updatedLog.activity_title}" flagged for review.`,
          });
        }
      }
    } finally {
      setBusyLogId(null);
    }
  };

  const handleExpertAction = async (
    log: ImpactLog,
    action: 'approve_macro' | 'reject_macro' | 'audit_pass' | 'audit_fraud'
  ) => {
    setBusyLogId(log.id);
    setFeedbackBanner(null);
    try {
      const scores = getCriteriaForLog(log);
      const notesOrReason =
        action === 'reject_macro'
          ? rejectionReasons[log.id] || ''
          : reviewNotes[log.id] || '';

      const { resOk, data } = await postPlatformActionClient({
        actionType: 'EXPERT_ADJUDICATION',
        actorId: activeUser.id,
        logId: log.id,
        action,
        criteriaScores: scores,
        notesOrReason,
      });

      if (!resOk || !data.ok) {
        setFeedbackBanner({
          type: 'error',
          message: data.error || 'Adjudication failed',
        });
      } else {
        onRefreshSnapshot(data.snapshot);
        const updatedLog: ImpactLog = data.result.log;
        if (action === 'approve_macro') {
          setFeedbackBanner({
            type: 'success',
            message: `🏆 National Panel approved "${updatedLog.activity_title}" and awarded +${updatedLog.points_awarded} pts to ${updatedLog.school_name}!`,
          });
        } else if (action === 'reject_macro') {
          setFeedbackBanner({
            type: 'warning',
            message: `🔔 Rejected "${updatedLog.activity_title}". Student notified via WhatsApp for their single (1x) resubmission.`,
          });
        } else if (action === 'audit_pass') {
          setFeedbackBanner({
            type: 'success',
            message: `✅ 10% Random Audit Passed for "${updatedLog.activity_title}".`,
          });
        } else if (action === 'audit_fraud') {
          setFeedbackBanner({
            type: 'error',
            message: `🚨 Audit Penalty Applied: "${updatedLog.activity_title}" flagged as invalid. Points revoked and -${updatedLog.penalty_points} penalty points deducted from ${updatedLog.school_name}.`,
          });
        }
      }
    } finally {
      setBusyLogId(null);
    }
  };

  const handleSaveConfig = async () => {
    setFeedbackBanner(null);
    const { resOk, data } = await postPlatformActionClient({
      actionType: 'UPDATE_GAMIFICATION_CONFIG',
      actorId: activeUser.id,
      updates: configDraft,
    });
    if (!resOk || !data.ok) {
      setFeedbackBanner({ type: 'error', message: data.error });
    } else {
      onRefreshSnapshot(data.snapshot);
      setFeedbackBanner({
        type: 'success',
        message: '⚙️ Scoring weights updated and all 15 school rankings recalculated.',
      });
    }
  };

  const teacherPendingLogs = impactLogs.filter((l) => {
    if (l.status !== 'pending' && l.status !== 'flagged') return false;
    return l.school_id === activeUser.school_id;
  });

  const expertMacroQueue = impactLogs.filter(
    (l) => l.status === 'pending_expert_review' || l.status === 'flagged'
  );

  const expertRandomAuditQueue = impactLogs.filter(
    (l) => l.random_audit_selected && l.audit_status === 'pending_audit'
  );

  const filteredExpertMacroQueue = expertMacroQueue.filter(
    (l) => expertSchoolFilter === 'all' || l.school_id === expertSchoolFilter
  );

  const filteredExpertRandomAuditQueue = expertRandomAuditQueue.filter(
    (l) => expertSchoolFilter === 'all' || l.school_id === expertSchoolFilter
  );

  return (
    <div className="space-y-6">
      {/* Simple Role Switcher Bar */}
      <div className="hai-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hai-cyan-pill text-xs font-bold uppercase">
                Role: {activeUser.role.replace('_', ' ')}
              </span>
              {activeUser.login_code && (
                <span className="hai-tag text-xs font-mono font-bold">
                  ID: {activeUser.login_code}
                </span>
              )}
              {activeUser.school_name && (
                <span className="hai-tag text-xs font-mono font-bold">
                  School: {activeUser.school_name}
                </span>
              )}
            </div>
            <h2 className="mt-2.5 text-xl font-bold text-[#111010] font-[var(--font-jakarta)]">
              {activeUser.full_name}
            </h2>
            <p className="text-xs text-[#111010]/70 mt-0.5">
              {activeUser.role === 'teacher' &&
                `School Validator for ${activeUser.school_name}. Review student activity submissions, approve verified recycling & sales, or upload official bookshop/pola receipts.`}
              {(activeUser.role === 'expert_admin' ||
                activeUser.role === 'super_admin' ||
                activeUser.role === 'expert' ||
                activeUser.role === 'admin') &&
                `National Panel & GIZ Admin: Score school sales > ${formatLkr(
                  config.macro_revenue_threshold_usd
                )} across the 6 criteria, check the 10% random audit sample, and configure scoring weights.`}
              {(activeUser.role === 'student' || activeUser.role === 'mentor') &&
                'Read-only view. Reviewing permissions are restricted to registered School Teachers and National Expert Panel members.'}
            </p>

            {/* Non-interactive Locked School Badge for Teacher */}
            {activeUser.role === 'teacher' && (
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold tracking-tight shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{activeUser.school_name} — {myTeacherSchoolEntry?.club.name || activeUser.club_name || 'Eco Enterprise'}</span>
              </div>
            )}
          </div>

          {!hideRoleSwitcher &&
            (activeUser.role === 'super_admin' ||
              activeUser.role === 'expert_admin' ||
              activeUser.role === 'admin' ||
              activeUser.role === 'expert') && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  onSwitchUser('usr-giz-admin-01');
                  setFeedbackBanner(null);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                  activeUser.id === 'usr-giz-admin-01'
                    ? 'bg-[#005FA3] text-[#9CF2F2]'
                    : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/60 hover:text-[#005FA3]'
                }`}
              >
                Super Admin (GIZ)
              </button>

              <button
                onClick={() => {
                  onSwitchUser('usr-expert-01');
                  setFeedbackBanner(null);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                  activeUser.role === 'expert_admin' || activeUser.role === 'expert'
                    ? 'bg-[#005FA3] text-[#9CF2F2]'
                    : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/60 hover:text-[#005FA3]'
                }`}
              >
                Expert Panel (Dr. Nuwan)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`rounded-[18px_18px_18px_4px] border p-4 flex items-start justify-between gap-4 ${
            feedbackBanner.type === 'success'
              ? 'bg-[#E9F5F4] border-[#14494F]/30 text-[#14494F]'
              : feedbackBanner.type === 'warning'
              ? 'bg-[#FFFFFF] border-[#005FA3] text-[#005FA3]'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="text-xs sm:text-sm font-semibold">{feedbackBanner.message}</div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs font-bold underline shrink-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Read-Only Notice for Student or Mentor */}
      {(activeUser.role === 'student' || activeUser.role === 'mentor') && (
        <div className="hai-card p-8 text-center space-y-3">
          <Lock className="w-8 h-8 text-[#005FA3] mx-auto" />
          <h3 className="text-lg font-bold text-[#111010]">
            Approvals Restricted to Teachers &amp; National Panel
          </h3>
          <p className="text-xs text-[#111010]/70 max-w-lg mx-auto">
            Students submit data via WhatsApp Cloud API, and Mentors have read-only access. Switch to a Teacher or National Panel member below to test approvals:
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onSwitchUser('usr-teacher-01')}
              className="hai-btn-primary px-5 py-2.5 text-xs cursor-pointer"
            >
              Switch to Mrs. Kumari Senanayake (Teacher - Royal College)
            </button>
            <button
              onClick={() => onSwitchUser('usr-expert-01')}
              className="hai-btn-secondary px-5 py-2.5 text-xs cursor-pointer"
            >
              Switch to Dr. Nuwan Gunasekara (National Panel)
            </button>
          </div>
        </div>
      )}

      {/* TIER 1: TEACHER APPROVAL & GAMIFICATION WORKBENCH */}
      {activeUser.role === 'teacher' && (
        <div className="space-y-6">
          {/* Teacher's School Live Gamified Standing Banner */}
          {myTeacherSchoolEntry && (
            <div className="bg-white border-2 border-[#005FA3] rounded-[20px_20px_20px_4px] p-6 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold uppercase tracking-wider">
                      ⭐ Your School: {activeUser.school_name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#E6F1FA] text-[#005FA3] text-xs font-mono font-bold border border-[#005FA3]/30">
                      National Rank #{myTeacherSchoolEntry.rank} of 15
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0F3F5] text-[#111010]/80 border border-[#111010]/15">
                      {myTeacherSchoolEntry.topoff_funding_tier.split(' (')[0]}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-[#111010] font-[var(--font-jakarta)] tracking-tight">
                    {myTeacherSchoolEntry.club.name} • {myTeacherSchoolEntry.school.code} ({myTeacherSchoolEntry.school.city})
                  </h3>

                  <p className="text-xs sm:text-sm text-[#111010]/80">
                    {aboveTeacherEntry ? (
                      <>
                        Rivalry Gap: <strong>#{aboveTeacherEntry.rank} {aboveTeacherEntry.school.name}</strong> has {aboveTeacherEntry.composite_leaderboard_score} pts —{' '}
                        <strong className="text-[#005FA3]">
                          {(aboveTeacherEntry.composite_leaderboard_score - myTeacherSchoolEntry.composite_leaderboard_score).toFixed(1)} pts needed to overtake #{aboveTeacherEntry.rank}!
                        </strong>{' '}
                        Approving on-campus student logs awards up to +65 pts immediately to climb the leaderboard.
                      </>
                    ) : (
                      <strong className="text-emerald-700">
                        🏆 National Leader! {activeUser.school_name} is currently holding Rank #1 across all 15 Sri Lankan schools!
                      </strong>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="bg-[#E6F1FA] border border-[#005FA3]/25 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                    <div className="text-[10px] uppercase font-bold text-[#005FA3]">Total Points</div>
                    <div className="text-2xl font-extrabold text-[#005FA3] font-mono mt-0.5">
                      {myTeacherSchoolEntry.composite_leaderboard_score} <span className="text-xs">pts</span>
                    </div>
                  </div>

                  <div className="bg-[#E6F1FA] border border-[#005FA3]/25 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                    <div className="text-[10px] uppercase font-bold text-[#14494F]">Recycled</div>
                    <div className="text-2xl font-extrabold text-[#14494F] font-mono mt-0.5">
                      {myTeacherSchoolEntry.verified_waste_kg} <span className="text-xs">kg</span>
                    </div>
                  </div>

                  <div className="bg-[#E6F1FA] border border-[#005FA3]/25 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
                    <div className="text-[10px] uppercase font-bold text-[#111010]/70">Sales (Rs.)</div>
                    <div className="text-2xl font-extrabold text-[#111010] font-mono mt-0.5">
                      {formatLkr(myTeacherSchoolEntry.verified_revenue_usd)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tabs: Approvals Queue vs 15-School Leaderboard */}
          <div className="flex flex-wrap gap-2 border-b border-[#111010]/15 pb-3">
            <button
              onClick={() => setTeacherSubTab('approvals')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                teacherSubTab === 'approvals'
                  ? 'bg-[#005FA3] text-[#9CF2F2]'
                  : 'bg-[#FFFFFF] text-[#111010]/80 border border-[#111010]/15'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Our School Pending Approvals ({teacherPendingLogs.length})</span>
            </button>

            <button
              onClick={() => setTeacherSubTab('leaderboard')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                teacherSubTab === 'leaderboard'
                  ? 'bg-[#005FA3] text-[#9CF2F2]'
                  : 'bg-[#FFFFFF] text-[#111010]/80 border border-[#111010]/15'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>National 15-School Leaderboard &amp; Standings ({leaderboard?.length || 15})</span>
            </button>
          </div>

          {teacherSubTab === 'approvals' && (
            <div className="space-y-5">
          <div className="hai-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#005FA3]" />
                <span className="text-sm font-semibold text-[#111010]">
                  Pending Submissions for {activeUser.school_name} ({teacherPendingLogs.length})
                </span>
              </div>
              <button
                onClick={handleManualLiveSync}
                disabled={isRefreshingLive}
                title="Fetch latest student submissions from WhatsApp & Supabase"
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 text-[#005FA3] border border-[#005FA3]/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingLive ? 'animate-spin text-[#005FA3]' : ''}`} />
                <span>{isRefreshingLive ? 'Syncing...' : 'Sync Live'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-1.5 text-[#111010]/80 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceRandomAuditOnApprove}
                  onChange={(e) => setForceRandomAuditOnApprove(e.target.checked)}
                  className="rounded accent-[#005FA3]"
                />
                <span>Include in 10% Audit Sample</span>
              </label>
            </div>
          </div>

          {teacherPendingLogs.length === 0 ? (
            <div className="hai-card p-8 text-center text-[#111010]/70 text-sm">
              All pending submissions for {activeUser.school_name} have been reviewed!
            </div>
          ) : (
            <div className="space-y-4">
              {teacherPendingLogs.map((log) => {
                const isForeignSchool = log.school_id !== activeUser.school_id;
                const isHighRevZeroEnv = log.revenue_usd >= 75 && log.waste_kg <= 0.5;

                return (
                  <div
                    key={log.id}
                    className={`hai-card p-6 space-y-4 ${
                      isForeignSchool ? 'border-rose-400' : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="hai-tag font-mono text-xs font-bold">
                            {log.school_name}
                          </span>
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                              log.transaction_type === 'macro'
                                ? 'bg-[#005FA3] text-[#9CF2F2]'
                                : 'bg-[#9CF2F2] text-[#005FA3]'
                            }`}
                          >
                            {log.transaction_type === 'macro'
                              ? `Macro Sale (> ${formatLkr(config.macro_revenue_threshold_usd)})`
                              : `Micro Activity (≤ ${formatLkr(config.macro_revenue_threshold_usd)})`}
                          </span>
                          <span className="text-xs font-semibold text-[#14494F]">
                            <MapPin className="w-3.5 h-3.5 inline mr-1" />
                            {log.campus_distance_meters}m from school ({log.on_campus_verified ? 'On-Campus' : 'Off-Campus'})
                          </span>
                        </div>

                        <h4 className="mt-2.5 text-lg font-bold text-[#111010] font-[var(--font-jakarta)]">
                          {log.activity_title}
                        </h4>
                        <p className="text-xs text-[#111010]/75 mt-0.5">
                          Submitted by <strong className="text-[#111010]">{log.student_name}</strong> • {log.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 hai-chrome-box px-4 py-3 shrink-0">
                        <div>
                          <div className="text-[10px] uppercase font-semibold text-[#111010]/60">
                            Waste Recycled
                          </div>
                          <div className="text-sm font-bold text-[#14494F] font-mono">
                            {log.waste_kg} kg
                          </div>
                        </div>
                        <div className="h-7 w-px bg-[#111010]/15" />
                        <div>
                          <div className="text-[10px] uppercase font-semibold text-[#111010]/60">
                            Sales (Rs.)
                          </div>
                          <div className="text-sm font-bold text-[#111010] font-mono">
                            {formatLkr(log.revenue_usd)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isHighRevZeroEnv && (
                      <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 flex items-center gap-2 text-xs text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>Warning:</strong> High sales ({formatLkr(log.revenue_usd)}) reported with 0 kg recycled waste. Please Reject or Flag.
                        </span>
                      </div>
                    )}

                    {/* Teacher-Verified Invoices & Documentation */}
                    <div className="hai-chrome-box p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#111010] flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-[#005FA3]" />
                          Verified Invoices, Receipts &amp; Scale Slips
                        </span>
                        <span className="text-[11px] font-mono text-[#005FA3] font-bold">
                          {log.verified_documents?.length || 0} attached
                        </span>
                      </div>

                      {log.verified_documents && log.verified_documents.length > 0 ? (
                        <div className="space-y-1.5">
                          {log.verified_documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="bg-white p-2.5 rounded border border-[#111010]/12 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 text-[#005FA3] shrink-0" />
                                <div className="truncate">
                                  <div className="font-semibold text-[#111010] text-[11px] truncate">
                                    {doc.file_name}
                                  </div>
                                  <div className="text-[10px] text-[#111010]/70">
                                    {doc.doc_category.replace(/_/g, ' ').toUpperCase()} • Uploaded by {doc.uploaded_by_name}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={doc.s3_url}
                                target="_blank"
                                rel="noreferrer"
                                className="hai-btn-secondary px-2.5 py-1 text-[10px] shrink-0 flex items-center gap-1"
                              >
                                View Doc <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#111010]/70 italic">
                          No invoices attached yet. As teacher, you can verify paper receipts and attach them via WhatsApp: <code className="bg-white px-1.5 py-0.5 rounded font-mono text-[#005FA3]">/upload_invoice {log.id}</code>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-[#111010]/12">
                      <div className="lg:col-span-5">
                        <input
                          type="text"
                          value={reviewNotes[log.id] || ''}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [log.id]: e.target.value }))
                          }
                          placeholder="Teacher comment (optional)..."
                          className="w-full hai-input px-3 py-2 text-xs"
                        />
                      </div>

                      <div className="lg:col-span-4">
                        <input
                          type="text"
                          value={rejectionReasons[log.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({ ...prev, [log.id]: e.target.value }))
                          }
                          placeholder="Reason if rejecting (sent via WhatsApp)..."
                          className="w-full hai-input px-3 py-2 text-xs"
                        />
                      </div>

                      <div className="lg:col-span-3 flex items-center gap-2 justify-end">
                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'approve')}
                          className="hai-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {log.transaction_type === 'macro' ? 'Endorse' : 'Approve'}
                        </button>

                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'reject')}
                          className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>

                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'flag')}
                          className="hai-btn-secondary px-2.5 py-2 text-xs cursor-pointer"
                          title="Flag for review"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </div>
          )}

          {teacherSubTab === 'leaderboard' && (
            <div className="hai-card overflow-hidden space-y-0">
              <div className="px-6 py-4 border-b border-[#111010]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F0F3F5]">
                <div>
                  <h3 className="text-base font-bold text-[#111010] font-[var(--font-jakarta)]">
                    All 15 Sri Lankan Schools Ranked by Composite Points
                  </h3>
                  <p className="text-xs text-[#111010]/70">
                    See where {activeUser.school_name} stands relative to other schools island-wide.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#111010]/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={teacherLeaderboardSearch}
                    onChange={(e) => setTeacherLeaderboardSearch(e.target.value)}
                    placeholder="Search school or city..."
                    className="w-full hai-input pl-8 pr-3 py-1.5 text-xs bg-white"
                  />
                </div>
              </div>

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
                    {filteredTeacherLeaderboard.map((entry) => {
                      const isMySchool = entry.school.id === activeUser.school_id;
                      const isExpanded = teacherExpandedSchoolId === entry.school.id;

                      return (
                        <React.Fragment key={entry.school.id}>
                          <tr
                            onClick={() =>
                              setTeacherExpandedSchoolId(isExpanded ? null : entry.school.id)
                            }
                            className={`h-14 transition cursor-pointer ${
                              isMySchool
                                ? 'bg-[#9CF2F2]/35 hover:bg-[#9CF2F2]/50 border-l-4 border-l-[#005FA3] font-bold'
                                : 'hover:bg-[#E6F1FA]/60'
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  isMySchool
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
                                <span className={isMySchool ? 'text-[#005FA3] font-bold' : 'font-semibold text-[#111010]'}>
                                  {entry.school.name}
                                </span>
                                <span className="text-[11px] text-[#111010]/60">({entry.school.city})</span>
                                {isMySchool && (
                                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#005FA3] text-[#9CF2F2] uppercase tracking-wider">
                                    ⭐ YOUR SCHOOL
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
            </div>
          )}
        </div>
      )}

      {/* TIER 2: NATIONAL EXPERT PANEL & GIZ SUPER ADMIN */}
      {(activeUser.role === 'expert_admin' ||
        activeUser.role === 'super_admin' ||
        activeUser.role === 'expert' ||
        activeUser.role === 'admin') && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-[#111010]/15 pb-3">
            <button
              onClick={() => setExpertSubTab('macro_scoring')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'macro_scoring'
                  ? 'bg-[#005FA3] text-[#9CF2F2]'
                  : 'bg-[#FFFFFF] text-[#111010]/80 border border-[#111010]/15'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>Macro Sales Scoring ({expertMacroQueue.length})</span>
            </button>

            <button
              onClick={() => setExpertSubTab('random_audit')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'random_audit'
                  ? 'bg-[#005FA3] text-[#9CF2F2]'
                  : 'bg-[#FFFFFF] text-[#111010]/80 border border-[#111010]/15'
              }`}
            >
              <Dice5 className="w-4 h-4" />
              <span>10% Random Micro-Audit ({expertRandomAuditQueue.length})</span>
            </button>

            <button
              onClick={() => setExpertSubTab('algorithm_config')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'algorithm_config'
                  ? 'bg-[#005FA3] text-[#9CF2F2]'
                  : 'bg-[#FFFFFF] text-[#111010]/80 border border-[#111010]/15'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Scoring Weights</span>
            </button>
          </div>

          {/* 15-School Filter Dropdown for National Expert Panel & Admin */}
          <div className="hai-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111010]">
                Filter by School:
              </span>
              <span className="text-[11px] text-[#005FA3] font-semibold">
                {expertSchoolFilter === 'all'
                  ? 'All 15 Pilot Schools (Aggregate View)'
                  : schools.find((s) => s.id === expertSchoolFilter)?.name || expertSchoolFilter}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="expert-school-filter" className="text-xs text-[#111010]/70 font-medium">
                Scope:
              </label>
              <select
                id="expert-school-filter"
                aria-label="Filter submissions by school"
                value={expertSchoolFilter}
                onChange={(e) => setExpertSchoolFilter(e.target.value)}
                className="hai-input px-3 py-1.5 text-xs font-semibold text-[#111010] cursor-pointer"
              >
                <option value="all">All 15 Pilot Schools (Aggregate)</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} ({school.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {expertSubTab === 'macro_scoring' && (
            <div className="space-y-4">
              {filteredExpertMacroQueue.length === 0 ? (
                <div className="hai-card p-8 text-center text-[#111010]/70 text-sm">
                  {expertSchoolFilter === 'all'
                    ? 'All Teacher-endorsed Macro submissions have been scored!'
                    : `No pending Macro submissions found for the selected school.`}
                </div>
              ) : (
                filteredExpertMacroQueue.map((log) => {
                  const scores = getCriteriaForLog(log);
                  const previewPoints = calculateMacroTransactionPoints({
                    criteriaScores: scores,
                    wasteKg: log.waste_kg,
                    revenueUsd: log.revenue_usd,
                    config,
                  });

                  return (
                    <div
                      key={log.id}
                      className="hai-card p-6 space-y-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#111010]/12 pb-4">
                        <div>
                          <span className="hai-tag font-mono text-xs font-bold">
                            {log.school_name} • {log.club_name}
                          </span>
                          <h4 className="mt-2.5 text-lg font-bold text-[#111010] font-[var(--font-jakarta)]">
                            {log.activity_title}
                          </h4>
                          <p className="text-xs text-[#111010]/75 mt-0.5">{log.description}</p>
                        </div>

                        <div className="hai-chrome-box p-4 text-right shrink-0">
                          <div className="text-[11px] text-[#005FA3] font-bold uppercase">
                            Points to Release
                          </div>
                          <div className="text-xl font-bold text-[#005FA3] font-mono">
                            +{previewPoints} pts
                          </div>
                          <div className="text-xs text-[#111010]/70">
                            {log.waste_kg} kg • {formatLkr(log.revenue_usd)}
                          </div>
                        </div>
                      </div>

                      {/* Teacher-Verified Documentation Dossier */}
                      <div className="hai-chrome-box p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111010]/10 pb-2">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-[#005FA3]" />
                            <span className="text-xs font-bold text-[#111010]">
                              Teacher-Verified Documentation Dossier
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {(log.whatsapp_dossier_sent_to_experts || log.telegram_dossier_sent_to_experts) && (
                              <span className="hai-cyan-pill text-[10px] font-bold">
                                📡 Dossier Sent to GIZ &amp; Experts
                              </span>
                            )}
                            {(log.scored_via_whatsapp || log.scored_via_telegram) && (
                              <span className="hai-tag font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                ⚡ Scored via WhatsApp
                              </span>
                            )}
                          </div>
                        </div>

                        {log.verified_documents && log.verified_documents.length > 0 ? (
                          <div className="space-y-2">
                            {log.verified_documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="bg-white p-3 rounded-lg border border-[#111010]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-start sm:items-center gap-2.5">
                                  <FileText className="w-5 h-5 text-[#005FA3] shrink-0 mt-0.5 sm:mt-0" />
                                  <div>
                                    <div className="font-bold text-[#111010] flex items-center gap-2">
                                      <span>{doc.file_name}</span>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#E6F1FA] text-[#005FA3]">
                                        {doc.doc_category.replace(/_/g, ' ').toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#111010]/70 mt-0.5">
                                      Verified on campus by {doc.verified_by_teacher_name || doc.uploaded_by_name} •{' '}
                                      {doc.uploaded_via_whatsapp || doc.uploaded_via_telegram ? 'Uploaded via WhatsApp Cloud API' : 'Web Upload'}
                                      {doc.notes && ` • "${doc.notes}"`}
                                    </div>
                                  </div>
                                </div>

                                <a
                                  href={doc.s3_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hai-btn-primary px-3 py-1.5 text-xs shrink-0 flex items-center justify-center gap-1.5"
                                >
                                  <span>View Document</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                            Teacher has not attached an invoice document yet. Teacher can attach via WhatsApp: <code className="font-mono font-bold">/upload_invoice {log.id}</code>
                          </div>
                        )}

                        {/* WhatsApp Scoring Quick Command */}
                        <div className="bg-[#E6F1FA] border border-[#005FA3]/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs">
                            <div className="font-bold text-[#005FA3] flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5" />
                              <span>Score directly via WhatsApp Cloud API:</span>
                            </div>
                            <code className="text-[11px] font-mono text-[#111010] mt-0.5 block break-all">
                              /score {log.id} {scores.relevance} {scores.business} {scores.feasibility} {scores.student_ownership} {scores.sustainability} {scores.institutional_commitment}
                            </code>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const cmd = `/score ${log.id} ${scores.relevance} ${scores.business} ${scores.feasibility} ${scores.student_ownership} ${scores.sustainability} ${scores.institutional_commitment}`;
                              navigator.clipboard?.writeText(cmd);
                              setCopiedScoreCmd(log.id);
                              setTimeout(() => setCopiedScoreCmd(null), 2500);
                            }}
                            className="hai-btn-secondary px-3 py-1.5 text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {copiedScoreCmd === log.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Command</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {(
                          [
                            ['relevance', '1. Relevance'],
                            ['business', '2. Business Viability'],
                            ['feasibility', '3. Feasibility'],
                            ['student_ownership', '4. Student Leadership'],
                            ['sustainability', '5. Sustainability'],
                            ['institutional_commitment', '6. School Commitment'],
                          ] as Array<[keyof CriteriaScores, string]>
                        ).map(([key, label]) => (
                          <div key={key} className="hai-chrome-box p-3.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#111010]">{label}</span>
                              <span className="font-mono font-bold text-[#005FA3]">
                                {scores[key]}/100
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              aria-label={label}
                              value={scores[key]}
                              onChange={(e) =>
                                updateCriteriaDraft(
                                  log.id,
                                  key,
                                  Number(e.target.value),
                                  scores
                                )
                              }
                              className="w-full mt-2 accent-[#005FA3] cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                        <input
                          type="text"
                          value={rejectionReasons[log.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({
                              ...prev,
                              [log.id]: e.target.value,
                            }))
                          }
                          placeholder="Rejection reason if rejecting..."
                          className="flex-1 hai-input px-3 py-2 text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            disabled={busyLogId === log.id}
                            onClick={() => handleExpertAction(log, 'approve_macro')}
                            className="hai-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            Approve (+{previewPoints} pts)
                          </button>
                          <button
                            disabled={busyLogId === log.id}
                            onClick={() => handleExpertAction(log, 'reject_macro')}
                            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {expertSubTab === 'random_audit' && (
            <div className="space-y-4">
              {filteredExpertRandomAuditQueue.length === 0 ? (
                <div className="hai-card p-8 text-center text-[#111010]/70 text-sm">
                  {expertSchoolFilter === 'all'
                    ? 'No micro-transactions waiting in the 10% random audit queue.'
                    : 'No random audit micro-transactions found for the selected school.'}
                </div>
              ) : (
                filteredExpertRandomAuditQueue.map((log) => (
                  <div
                    key={log.id}
                    className="hai-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div>
                      <span className="hai-cyan-pill font-mono text-xs font-bold">
                        10% Random Audit • {log.school_name}
                      </span>
                      <h4 className="mt-2.5 text-base font-bold text-[#111010]">
                        {log.activity_title} ({log.waste_kg} kg • {formatLkr(log.revenue_usd)})
                      </h4>
                      <p className="text-xs text-[#111010]/70 mt-0.5">
                        Approved by {log.teacher_reviewer_name} • Awarded +{log.points_awarded} pts
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        disabled={busyLogId === log.id}
                        onClick={() => handleExpertAction(log, 'audit_pass')}
                        className="hai-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Valid
                      </button>

                      <button
                        disabled={busyLogId === log.id}
                        onClick={() => handleExpertAction(log, 'audit_fraud')}
                        className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Flag Invalid (-{config.fraud_penalty_points} pts penalty)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {expertSubTab === 'algorithm_config' && (
            <div className="hai-card p-6 space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#111010]">
                <Settings2 className="w-4 h-4 text-[#005FA3]" />
                <span>National Scoring Criteria Weights</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(
                  [
                    ['relevance_weight', 'Relevance'],
                    ['business_weight', 'Business Viability'],
                    ['feasibility_weight', 'Feasibility'],
                    ['student_ownership_weight', 'Student Leadership'],
                    ['sustainability_weight', 'Sustainability'],
                    ['institutional_commitment_weight', 'School Support'],
                  ] as Array<[keyof GamificationConfig, string]>
                ).map(([key, label]) => (
                  <div key={key} className="hai-chrome-box p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#111010]">{label}</span>
                      <span className="font-mono text-[#005FA3] font-bold">
                        {(Number(configDraft[key]) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={0.4}
                      step={0.05}
                      aria-label={label}
                      value={Number(configDraft[key])}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="w-full mt-2 accent-[#005FA3] cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="hai-btn-primary px-5 py-2.5 text-xs cursor-pointer"
                >
                  Save &amp; Recalculate Rankings
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
