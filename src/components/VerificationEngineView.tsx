'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Dice5,
  Flag,
  Gavel,
  Lock,
  MapPin,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  CriteriaScores,
  GamificationConfig,
  ImpactLog,
  School,
  UserProfile,
} from '@/types/domain';
import { calculateMacroTransactionPoints } from '@/lib/gamification/engine';
import { postPlatformActionClient } from '@/lib/client/platform-bridge';

interface VerificationEngineViewProps {
  activeUser: UserProfile;
  users: UserProfile[];
  schools: School[];
  impactLogs: ImpactLog[];
  config: GamificationConfig;
  onSwitchUser: (userId: string) => void;
  onRefreshSnapshot: (snapshot: any) => void;
}

export function VerificationEngineView({
  activeUser,
  users,
  schools,
  impactLogs,
  config,
  onSwitchUser,
  onRefreshSnapshot,
}: VerificationEngineViewProps) {
  const [expertSubTab, setExpertSubTab] = useState<
    'macro_scoring' | 'random_audit' | 'algorithm_config'
  >('macro_scoring');
  const [showCrossSchoolRlsTest, setShowCrossSchoolRlsTest] = useState(false);
  const [forceRandomAuditOnApprove, setForceRandomAuditOnApprove] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [busyLogId, setBusyLogId] = useState<string | null>(null);

  // State for Expert 6-Criteria Sliders per Macro log
  const [criteriaDrafts, setCriteriaDrafts] = useState<Record<string, CriteriaScores>>({});

  // State for Expert Algorithm Config Editor
  const [configDraft, setConfigDraft] = useState<GamificationConfig>(config);

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

  // Teacher Action Handler
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
          message: data.error || 'RBAC / Validation Error',
        });
      } else {
        onRefreshSnapshot(data.snapshot);
        const updatedLog: ImpactLog = data.result.log;
        if (decision === 'approve' && updatedLog.transaction_type === 'macro') {
          setFeedbackBanner({
            type: 'warning',
            message: `✅ STEP 2 & 3 THRESHOLD ROUTING: Teacher endorsed Macro-Transaction "${updatedLog.activity_title}" ($${updatedLog.revenue_usd} > $${config.macro_revenue_threshold_usd}). Automatically routed to status: pending_expert_review for Tier 2 Expert Panel scoring!`,
          });
        } else if (decision === 'approve' && updatedLog.transaction_type === 'micro') {
          setFeedbackBanner({
            type: 'success',
            message: `✅ STEP 3 MICRO-TRANSACTION APPROVED: Released +${updatedLog.points_awarded} pts to ${updatedLog.school_name}'s Leaderboard! ${
              updatedLog.random_audit_selected
                ? '🎲 SELECTED BY 10% SAFEGUARD FOR EXPERT PANEL RANDOM AUDIT!'
                : '(Not selected in 10% random audit roll)'
            }`,
          });
        } else if (decision === 'reject') {
          setFeedbackBanner({
            type: 'warning',
            message: `🔔 STEP 5 RESOLUTION LOOP TRIGGERED: Rejected "${updatedLog.activity_title}". Outbound Telegram message dispatched to ${updatedLog.telegram_username} with reason "${updatedLog.rejection_reason}" for their 1x allowed resubmission.`,
          });
        } else {
          setFeedbackBanner({
            type: 'warning',
            message: `🚩 Submission "${updatedLog.activity_title}" flagged for investigation.`,
          });
        }
      }
    } finally {
      setBusyLogId(null);
    }
  };

  // Expert Action Handler
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
            message: `🏆 STEP 4 EXPERT ADJUDICATION COMPLETE: Scored "${updatedLog.activity_title}" across all 6 criteria and released +${updatedLog.points_awarded} normalized points to ${updatedLog.school_name}!`,
          });
        } else if (action === 'reject_macro') {
          setFeedbackBanner({
            type: 'warning',
            message: `🔔 STEP 5 RESOLUTION LOOP TRIGGERED: Expert Panel rejected "${updatedLog.activity_title}". Telegram Bot notified student for their single (1x) resubmission attempt.`,
          });
        } else if (action === 'audit_pass') {
          setFeedbackBanner({
            type: 'success',
            message: `✅ 10% RANDOM AUDIT PASSED: Micro-transaction "${updatedLog.activity_title}" verified clean by Expert Panel.`,
          });
        } else if (action === 'audit_fraud') {
          setFeedbackBanner({
            type: 'error',
            message: `🚨 PENALTY MECHANICS EXECUTED: Flagged "${updatedLog.activity_title}" as fraudulent during 10% random audit! Original points revoked AND -${updatedLog.penalty_points} penalty points deducted from ${updatedLog.school_name}'s Leaderboard total.`,
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
        message:
          '⚙️ Gamification Algorithm weights, normalization ratio, and fraud penalty rules updated! All 15 school leaderboard rankings recalculated.',
      });
    }
  };

  // Queues
  const teacherPendingLogs = impactLogs.filter((l) => {
    if (l.status !== 'pending' && l.status !== 'flagged') return false;
    if (showCrossSchoolRlsTest) return true;
    return l.school_id === activeUser.school_id;
  });

  const expertMacroQueue = impactLogs.filter(
    (l) => l.status === 'pending_expert_review' || l.status === 'flagged'
  );

  const expertRandomAuditQueue = impactLogs.filter(
    (l) => l.random_audit_selected && l.audit_status === 'pending_audit'
  );

  return (
    <div className="space-y-6">
      {/* RBAC Role Switcher & Permission Context Header */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="figma-emerald-pill px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
                Active RBAC Identity: {activeUser.role.replace('_', ' ')}
              </span>
              {activeUser.school_name && (
                <span className="figma-code-chip px-2.5 py-0.5 text-xs font-mono text-[#14C7C3]">
                  Scoped School: {activeUser.school_name}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
              Gated Verification & Threshold Routing Engine
            </h2>
            <p className="text-xs text-[#B8F4F3] mt-0.5">
              {activeUser.role === 'teacher' &&
                'Tier 1 Approver: Review pending Telegram submissions for your school. Approve Micro-transactions (<= $50) to release points (+10% random audit) or endorse Macro-transactions (> $50) to route to the Expert Panel.'}
              {activeUser.role === 'expert_admin' &&
                'Tier 2 Adjudicator: Score Teacher-endorsed Macro-transactions across the 6 core criteria, audit the 10% random sample of Micro-transactions (with -75 pt fraud penalties), and tune the gamification algorithm.'}
              {activeUser.role === 'student' &&
                'Student Entrepreneur: You can submit data via the Telegram Bot but are restricted by RLS from approving or scoring submissions.'}
              {activeUser.role === 'mentor' &&
                'Mentor: You have Read-Only access to your assigned clubs and are restricted by RLS from modifying transaction statuses.'}
            </p>
          </div>

          {/* Quick Role Switcher Pills */}
          <div className="flex flex-wrap gap-2">
            {users
              .filter((u) =>
                ['usr-teacher-01', 'usr-teacher-02', 'usr-expert-01', 'usr-mentor-01', 'usr-student-01'].includes(
                  u.id
                )
              )
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u.id);
                    setFeedbackBanner(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    activeUser.id === u.id
                      ? 'bg-[#14C7C3] border-[#14C7C3] text-[#074140] shadow-md'
                      : 'bg-[#181C21] border-[#095856] text-[#B8F4F3] hover:text-[#E0FFF9]'
                  }`}
                >
                  {u.full_name}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Live Feedback / Audit Banner */}
      {feedbackBanner && (
        <div
          className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
            feedbackBanner.type === 'success'
              ? 'bg-[#053321] border-[#085D3A] text-[#75E0A7]'
              : feedbackBanner.type === 'warning'
              ? 'bg-[#1C2126] border-[#FDB022] text-[#FDB022]'
              : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
          }`}
        >
          <div className="text-xs sm:text-sm font-medium leading-relaxed">
            {feedbackBanner.message}
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100 shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Restricted View Notice for Student or Mentor */}
      {(activeUser.role === 'student' || activeUser.role === 'mentor') && (
        <div className="bg-[#1C2126] border border-[#FDB022]/50 rounded-xl p-6 text-center space-y-3">
          <Lock className="w-10 h-10 text-[#FDB022] mx-auto" />
          <h3 className="text-lg font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
            Gated Verification Engine — Read-Only for {activeUser.role.toUpperCase()} Role
          </h3>
          <p className="text-xs text-[#B8F4F3] max-w-xl mx-auto">
            Per Row-Level Security (RLS) policies, only <strong className="text-[#E0FFF9]">Supervising Teachers (Tier 1)</strong> and the{' '}
            <strong className="text-[#E0FFF9]">Expert Panel / Admin (Tier 2)</strong> can adjudicate pending submissions. Switch to a Teacher or Expert Panel account above to review submissions!
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => onSwitchUser('usr-teacher-01')}
              className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Switch to Ms. Elena Vance (Tier 1 Teacher - SCH-01)
            </button>
            <button
              onClick={() => onSwitchUser('usr-expert-01')}
              className="px-4 py-2 rounded-full bg-[#181C21] border border-[#095856] hover:border-[#14C7C3] text-[#14C7C3] text-xs font-semibold cursor-pointer"
            >
              Switch to Dr. Aris Thorne (Tier 2 Expert Panel)
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TIER 1: SUPERVISING TEACHER LOCAL AUDIT DASHBOARD
         ===================================================================== */}
      {activeUser.role === 'teacher' && (
        <div className="space-y-4">
          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#E0FFF9] flex items-center gap-2 font-[var(--font-jakarta)]">
                <ShieldCheck className="w-5 h-5 text-[#14C7C3]" />
                <span>
                  Tier 1 Local Audit Queue — {activeUser.school_name} ({teacherPendingLogs.length}{' '}
                  Pending)
                </span>
              </h3>
              <p className="text-xs text-[#B8F4F3] mt-0.5">
                Confirm submissions occurred on campus via EXIF GPS & Timestamp. Teachers can Approve, Reject, or Flag, but cannot directly award Macro leaderboard points.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181C21] border border-[#095856] text-[#B8F4F3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceRandomAuditOnApprove}
                  onChange={(e) => setForceRandomAuditOnApprove(e.target.checked)}
                  className="rounded accent-[#14C7C3]"
                />
                <Dice5 className="w-4 h-4 text-[#14C7C3]" />
                <span>Force 10% Random Audit Selection on Micro Approval</span>
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181C21] border border-rose-500/40 text-rose-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCrossSchoolRlsTest}
                  onChange={(e) => setShowCrossSchoolRlsTest(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                <span>Show Foreign Schools to Test RLS Cross-School Block</span>
              </label>
            </div>
          </div>

          {teacherPendingLogs.length === 0 ? (
            <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-8 text-center text-[#B8F4F3] text-sm">
              No pending submissions for {activeUser.school_name}. Use the Telegram Bot tab to submit a new activity or switch to another school&apos;s teacher!
            </div>
          ) : (
            <div className="space-y-4">
              {teacherPendingLogs.map((log) => {
                const isForeignSchool = log.school_id !== activeUser.school_id;
                const isHighRevZeroEnv = log.revenue_usd >= 75 && log.waste_kg <= 0.5;

                return (
                  <div
                    key={log.id}
                    className={`bg-[#1C2126] border rounded-xl p-5 space-y-4 ${
                      isForeignSchool ? 'border-rose-500/60' : 'border-[#095856]'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#095856] pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="figma-code-chip font-mono text-xs font-bold px-2 py-0.5 text-[#14C7C3]">
                            {log.id}
                          </span>
                          <span className="figma-code-chip font-mono text-xs font-semibold px-2 py-0.5 text-[#E0FFF9]">
                            {log.school_code} • {log.school_name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${
                              log.transaction_type === 'macro'
                                ? 'border-[#F670C7] text-[#F670C7] bg-[#181C21]'
                                : 'border-[#14C7C3] text-[#14C7C3] bg-[#181C21]'
                            }`}
                          >
                            {log.transaction_type === 'macro'
                              ? `MACRO-TRANSACTION (>$${config.macro_revenue_threshold_usd} / High-Stakes)`
                              : `MICRO-TRANSACTION (<=$${config.macro_revenue_threshold_usd} / Low-Stakes)`}
                          </span>
                          {isForeignSchool && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 text-xs font-semibold">
                              🔒 Foreign School (RLS Protected)
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 text-lg font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
                          {log.activity_title}
                        </h4>
                        <p className="text-xs text-[#B8F4F3] mt-0.5">{log.description}</p>
                      </div>

                      <div className="flex items-center gap-4 bg-[#181C21] border border-[#095856] rounded-xl px-4 py-2.5 shrink-0">
                        <div>
                          <div className="text-[10px] uppercase text-[#B8F4F3]">Waste Diverted</div>
                          <div className="text-base font-bold text-[#75E0A7] font-mono">
                            {log.waste_kg} kg
                          </div>
                        </div>
                        <div className="h-8 w-px bg-[#095856]" />
                        <div>
                          <div className="text-[10px] uppercase text-[#B8F4F3]">Revenue Claimed</div>
                          <div className="text-base font-bold text-[#14C7C3] font-mono">
                            ${log.revenue_usd.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EXIF Metadata & Campus Geofence Verification Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#181C21] border border-[#095856] rounded-lg p-3.5 text-xs">
                      <div>
                        <div className="text-[#B8F4F3] font-semibold uppercase text-[10px]">
                          Telegram Uncompressed Document & S3
                        </div>
                        <div className="mt-1 font-mono text-[#75E0A7] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{log.file_name}</span>
                        </div>
                        <div className="text-[11px] text-[#B8F4F3] mt-0.5 truncate">
                          Student: {log.student_name} ({log.telegram_username})
                        </div>
                      </div>

                      <div>
                        <div className="text-[#B8F4F3] font-semibold uppercase text-[10px]">
                          Extracted EXIF Timestamp & Sensor
                        </div>
                        <div className="mt-1 font-mono text-[#E0FFF9]">
                          {new Date(log.exif_timestamp).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-[#B8F4F3] mt-0.5">
                          {log.exif_device_make} {log.exif_device_model}
                        </div>
                      </div>

                      <div>
                        <div className="text-[#B8F4F3] font-semibold uppercase text-[10px]">
                          EXIF GPS Campus Geofence Check
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-[#14C7C3] shrink-0" />
                          <span className="text-[#E0FFF9]">
                            {log.exif_lat.toFixed(4)}, {log.exif_lng.toFixed(4)}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {log.on_campus_verified ? (
                            <span className="text-[#75E0A7] font-semibold text-[11px]">
                              ✅ {log.campus_distance_meters}m from campus center (On-Campus)
                            </span>
                          ) : (
                            <span className="text-rose-400 font-semibold text-[11px]">
                              ⚠️ {log.campus_distance_meters}m from campus (OFF-CAMPUS DRIFT!)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Anomaly Warning if High Revenue with Zero Impact */}
                    {isHighRevZeroEnv && (
                      <div className="bg-rose-950/50 border border-rose-500/40 rounded-lg p-3 flex items-center gap-2.5 text-xs text-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          <strong>ANOMALY DETECTED:</strong> High revenue (${log.revenue_usd}) reported with {log.waste_kg} kg environmental impact. Recommend Rejecting or Flagging!
                        </span>
                      </div>
                    )}

                    {/* Threshold Routing Preview */}
                    <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3 text-xs text-[#B8F4F3] flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[#E0FFF9]">Step 3 Threshold Routing Rule: </span>
                        {log.transaction_type === 'micro' ? (
                          <span>
                            Approving this <strong className="text-[#E0FFF9]">Micro-Transaction</strong> will immediately post points to the Leaderboard and roll the{' '}
                            <strong className="text-[#14C7C3]">10% Random Expert Audit</strong> safeguard.
                          </span>
                        ) : (
                          <span>
                            Approving this <strong className="text-[#E0FFF9]">Macro-Transaction</strong> (&gt;${config.macro_revenue_threshold_usd}) will update status to{' '}
                            <code className="text-[#F670C7] font-mono">pending_expert_review</code> for Expert Panel scoring.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teacher Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
                      <div className="lg:col-span-5">
                        <input
                          type="text"
                          value={reviewNotes[log.id] || ''}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [log.id]: e.target.value }))
                          }
                          placeholder="Optional Teacher endorsement / flag notes..."
                          className="w-full bg-[#181C21] border border-[#095856] rounded-lg px-3 py-2 text-xs text-[#E0FFF9] placeholder-[#B8F4F3]/50"
                        />
                      </div>

                      <div className="lg:col-span-4">
                        <input
                          type="text"
                          value={rejectionReasons[log.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({ ...prev, [log.id]: e.target.value }))
                          }
                          placeholder="Rejection reason (Required to Reject → Telegram)..."
                          className="w-full bg-[#181C21] border border-rose-500/40 rounded-lg px-3 py-2 text-xs text-[#E0FFF9] placeholder-[#B8F4F3]/50"
                        />
                      </div>

                      <div className="lg:col-span-3 flex items-center gap-2 justify-end">
                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'approve')}
                          className="figma-skeuomorphic-btn px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {log.transaction_type === 'macro' ? 'Endorse Macro' : 'Approve Micro'}
                        </button>

                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'reject')}
                          className="px-3 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>

                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'flag')}
                          className="px-2.5 py-2 rounded-full bg-[#181C21] hover:border-[#FDB022] border border-[#FDB022]/50 text-[#FDB022] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Flag for Risk Investigation"
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

      {/* =====================================================================
          TIER 2: EXPERT PANEL / ADMIN ADJUDICATION & RANDOM AUDIT DASHBOARD
         ===================================================================== */}
      {activeUser.role === 'expert_admin' && (
        <div className="space-y-6">
          {/* Sub-Navigation Tabs for Expert Panel */}
          <div className="flex flex-wrap gap-2 border-b border-[#095856] pb-3">
            <button
              onClick={() => setExpertSubTab('macro_scoring')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'macro_scoring'
                  ? 'bg-[#14C7C3] text-[#074140] shadow-md'
                  : 'bg-[#1C2126] text-[#B8F4F3] border border-[#095856] hover:text-[#E0FFF9]'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>
                Step 4: Macro-Transaction Final Scoring ({expertMacroQueue.length} Pending)
              </span>
            </button>

            <button
              onClick={() => setExpertSubTab('random_audit')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'random_audit'
                  ? 'bg-[#14C7C3] text-[#074140] shadow-md'
                  : 'bg-[#1C2126] text-[#B8F4F3] border border-[#095856] hover:text-[#E0FFF9]'
              }`}
            >
              <Dice5 className="w-4 h-4" />
              <span>
                Step 3 & Penalty Mechanics: 10% Random Micro-Audit Queue (
                {expertRandomAuditQueue.length} Sampled)
              </span>
            </button>

            <button
              onClick={() => setExpertSubTab('algorithm_config')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'algorithm_config'
                  ? 'bg-[#14C7C3] text-[#074140] shadow-md'
                  : 'bg-[#1C2126] text-[#B8F4F3] border border-[#095856] hover:text-[#E0FFF9]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Gamification Algorithm & 6-Criteria Weights</span>
            </button>
          </div>

          {/* TAB A: MACRO-TRANSACTION FINAL SCORING */}
          {expertSubTab === 'macro_scoring' && (
            <div className="space-y-4">
              {expertMacroQueue.length === 0 ? (
                <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-8 text-center text-[#B8F4F3] text-sm">
                  All Teacher-endorsed Macro-Transactions have been adjudicated! Switch to Teacher Ms. Elena Vance to endorse pending Macro log <code className="text-[#14C7C3]">log-102</code> ($190 solar power bank sale) and see it land here.
                </div>
              ) : (
                expertMacroQueue.map((log) => {
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
                      className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#095856] pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#181C21] text-[#F670C7] border border-[#F670C7]">
                              {log.id} • {log.status.toUpperCase()}
                            </span>
                            <span className="figma-code-chip font-mono text-xs font-semibold px-2 py-0.5 text-[#E0FFF9]">
                              {log.school_code} • {log.school_name}
                            </span>
                            <span className="text-xs text-[#14C7C3] font-semibold">
                              {log.club_name}
                            </span>
                          </div>
                          <h4 className="mt-2 text-lg font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
                            {log.activity_title}
                          </h4>
                          <p className="text-xs text-[#B8F4F3] mt-0.5">{log.description}</p>
                          <div className="mt-2 text-xs text-[#75E0A7] figma-emerald-pill px-2.5 py-1 inline-block">
                            ✓ Tier 1 Endorsed by {log.teacher_reviewer_name || 'Supervising Teacher'}: &ldquo;
                            {log.teacher_notes || 'Verified on campus'}&rdquo;
                          </div>
                        </div>

                        <div className="bg-[#181C21] border border-[#095856] rounded-xl p-4 text-right shrink-0">
                          <div className="text-[11px] uppercase text-[#14C7C3] font-semibold">
                            Projected Macro Points Release
                          </div>
                          <div className="text-2xl font-bold text-[#E0FFF9] font-mono mt-0.5">
                            +{previewPoints} pts
                          </div>
                          <div className="text-[11px] text-[#B8F4F3] mt-0.5">
                            ♻️ {log.waste_kg} kg • 💵 ${log.revenue_usd.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* 6 Core Criteria Interactive Sliders */}
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#14C7C3] mb-3">
                          Evaluate Against the 6 Core Enterprise Criteria (0 - 100)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(
                            [
                              ['relevance', '1. Relevance to Circular Economy'],
                              ['business', '2. Business Model & Viability'],
                              ['feasibility', '3. Technical & Operational Feasibility'],
                              ['student_ownership', '4. Student Ownership & Leadership'],
                              ['sustainability', '5. Environmental Sustainability'],
                              ['institutional_commitment', '6. Institutional Commitment'],
                            ] as Array<[keyof CriteriaScores, string]>
                          ).map(([key, label]) => (
                            <div
                              key={key}
                              className="bg-[#181C21] border border-[#095856] rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#E0FFF9] font-medium">{label}</span>
                                <span className="font-mono font-bold text-[#14C7C3]">
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
                                className="w-full mt-2 accent-[#14C7C3] cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Expert Decision Controls */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2">
                        <div className="lg:col-span-4">
                          <input
                            type="text"
                            value={reviewNotes[log.id] || ''}
                            onChange={(e) =>
                              setReviewNotes((prev) => ({ ...prev, [log.id]: e.target.value }))
                            }
                            placeholder="Expert adjudication notes..."
                            className="w-full bg-[#181C21] border border-[#095856] rounded-lg px-3 py-2 text-xs text-[#E0FFF9]"
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <input
                            type="text"
                            value={rejectionReasons[log.id] || ''}
                            onChange={(e) =>
                              setRejectionReasons((prev) => ({
                                ...prev,
                                [log.id]: e.target.value,
                              }))
                            }
                            placeholder="Rejection reason (Triggers Telegram 1x Resubmit)..."
                            className="w-full bg-[#181C21] border border-rose-500/40 rounded-lg px-3 py-2 text-xs text-[#E0FFF9]"
                          />
                        </div>
                        <div className="lg:col-span-4 flex items-center justify-end gap-2">
                          <button
                            disabled={busyLogId === log.id}
                            onClick={() => handleExpertAction(log, 'approve_macro')}
                            className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            Approve & Release +{previewPoints} Pts
                          </button>
                          <button
                            disabled={busyLogId === log.id}
                            onClick={() => handleExpertAction(log, 'reject_macro')}
                            className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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

          {/* TAB B: 10% RANDOM MICRO-TRANSACTION AUDIT QUEUE & PENALTY MECHANICS */}
          {expertSubTab === 'random_audit' && (
            <div className="space-y-4">
              <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 text-xs text-[#B8F4F3]">
                <div className="font-semibold text-[#E0FFF9] text-sm flex items-center gap-2 font-[var(--font-jakarta)]">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>
                    10% Random Micro-Transaction Audit & Leaderboard Penalty Mechanics
                  </span>
                </div>
                <p className="mt-1">
                  When a Supervising Teacher approves a Micro-Transaction, points are immediately posted to the Leaderboard and a randomized{' '}
                  <strong className="text-[#E0FFF9]">
                    {(config.micro_audit_sample_rate * 100).toFixed(0)}%
                  </strong>{' '}
                  of transactions are routed here. If you flag a Micro-Transaction as <strong className="text-[#E0FFF9]">Fraudulent</strong>, its original points are revoked AND{' '}
                  <strong className="text-rose-300">
                    -{config.fraud_penalty_points} penalty points
                  </strong>{' '}
                  are automatically deducted from that school&apos;s Leaderboard score.
                </p>
              </div>

              {expertRandomAuditQueue.length === 0 ? (
                <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-8 text-center text-[#B8F4F3] text-sm">
                  No unreviewed micro-transactions currently waiting in the 10% Random Audit Queue.
                </div>
              ) : (
                expertRandomAuditQueue.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#181C21] text-[#FDB022] border border-[#FDB022] font-mono text-xs font-semibold">
                            🎲 10% RANDOM AUDIT SAMPLE • {log.id}
                          </span>
                          <span className="figma-code-chip font-mono text-xs font-semibold px-2 py-0.5 text-[#E0FFF9]">
                            {log.school_code} • {log.school_name}
                          </span>
                          <span className="figma-emerald-pill px-2 py-0.5 text-xs font-semibold">
                            Already Released: +{log.points_awarded} pts
                          </span>
                        </div>
                        <h4 className="mt-2 text-lg font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
                          {log.activity_title}
                        </h4>
                        <p className="text-xs text-[#B8F4F3] mt-0.5">{log.description}</p>
                        <div className="mt-2 text-xs text-[#B8F4F3]">
                          Approved by Teacher <span className="text-[#E0FFF9]">{log.teacher_reviewer_name}</span> • EXIF Distance:{' '}
                          <span
                            className={
                              log.on_campus_verified ? 'text-[#75E0A7]' : 'text-rose-400 font-bold'
                            }
                          >
                            {log.campus_distance_meters}m ({log.on_campus_verified ? 'On-Campus' : 'OFF-CAMPUS'})
                          </span>{' '}
                          • File: <code className="text-[#14C7C3]">{log.file_name}</code>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleExpertAction(log, 'audit_pass')}
                          className="figma-skeuomorphic-btn px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Pass Audit (Keep +{log.points_awarded} pts)
                        </button>

                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleExpertAction(log, 'audit_fraud')}
                          className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Flag Fraudulent (Revoke & Deduct -{config.fraud_penalty_points} pts)
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB C: GAMIFICATION ALGORITHM & WEIGHTS CONFIGURATOR */}
          {expertSubTab === 'algorithm_config' && (
            <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#E0FFF9] flex items-center gap-2 font-[var(--font-jakarta)]">
                  <Settings2 className="w-5 h-5 text-[#14C7C3]" />
                  <span>Gamification Composite Scoring & Safeguard Parameters</span>
                </h3>
                <p className="text-xs text-[#B8F4F3] mt-1">
                  Adjusting these parameters dynamically recalculates the 15-School Composite Leaderboard and Seed Funding Top-Off Tiers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(
                  [
                    ['relevance_weight', 'Relevance Weight'],
                    ['business_weight', 'Business Model Weight'],
                    ['feasibility_weight', 'Feasibility Weight'],
                    ['student_ownership_weight', 'Student Ownership Weight'],
                    ['sustainability_weight', 'Sustainability Weight'],
                    ['institutional_commitment_weight', 'Institutional Commitment Weight'],
                  ] as Array<[keyof GamificationConfig, string]>
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#E0FFF9] font-medium">{label}</span>
                      <span className="font-mono text-[#14C7C3] font-bold">
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
                      className="w-full mt-2 accent-[#14C7C3] cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#095856]">
                <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5">
                  <label className="text-xs text-[#B8F4F3] font-medium block">
                    Macro-Transaction Threshold ($ USD)
                  </label>
                  <input
                    type="number"
                    aria-label="Macro-Transaction Threshold"
                    value={configDraft.macro_revenue_threshold_usd}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        macro_revenue_threshold_usd: Number(e.target.value),
                      }))
                    }
                    className="mt-2 w-full bg-[#1C2126] border border-[#095856] rounded px-3 py-1.5 text-sm font-mono text-[#E0FFF9]"
                  />
                </div>

                <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5">
                  <label className="text-xs text-[#B8F4F3] font-medium block">
                    Fraud Penalty Deduction (Points)
                  </label>
                  <input
                    type="number"
                    aria-label="Fraud Penalty Deduction"
                    value={configDraft.fraud_penalty_points}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        fraud_penalty_points: Number(e.target.value),
                      }))
                    }
                    className="mt-2 w-full bg-[#1C2126] border border-[#095856] rounded px-3 py-1.5 text-sm font-mono text-rose-400"
                  />
                </div>

                <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5">
                  <label className="text-xs text-[#B8F4F3] font-medium block">
                    Fin/Env Normalization Ratio ($ Rev / 1 kg Waste)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    aria-label="Fin/Env Normalization Ratio"
                    value={configDraft.env_to_fin_normalization_ratio}
                    onChange={(e) =>
                      setConfigDraft((prev) => ({
                        ...prev,
                        env_to_fin_normalization_ratio: Number(e.target.value),
                      }))
                    }
                    className="mt-2 w-full bg-[#1C2126] border border-[#095856] rounded px-3 py-1.5 text-sm font-mono text-[#14C7C3]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="figma-skeuomorphic-btn px-5 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Save Algorithm Configuration & Recalculate Leaderboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
