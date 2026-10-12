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
import { calculateMacroTransactionPoints, formatLkr } from '@/lib/gamification/engine';
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

  const [criteriaDrafts, setCriteriaDrafts] = useState<Record<string, CriteriaScores>>({});
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
            message: `🔔 Rejected "${updatedLog.activity_title}". Sent reason to ${updatedLog.student_name} on Telegram for their 1x resubmission.`,
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
            message: `🔔 Rejected "${updatedLog.activity_title}". Student notified via Telegram for their single (1x) resubmission.`,
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
      {/* Simple Role Switcher Bar */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="figma-emerald-pill px-2.5 py-0.5 text-xs font-semibold uppercase">
                Role: {activeUser.role.replace('_', ' ')}
              </span>
              {activeUser.school_name && (
                <span className="figma-code-chip px-2.5 py-0.5 text-xs font-mono text-[#14C7C3]">
                  School: {activeUser.school_name}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
              {activeUser.full_name}
            </h2>
            <p className="text-xs text-[#B8F4F3] mt-0.5">
              {activeUser.role === 'teacher' &&
                `Approve activities for ${activeUser.school_name}. Small logs (≤ ${formatLkr(
                  config.macro_revenue_threshold_usd
                )}) award points immediately; larger sales (> ${formatLkr(
                  config.macro_revenue_threshold_usd
                )}) go to the National Panel.`}
              {activeUser.role === 'expert_admin' &&
                `National Panel: Score school sales > ${formatLkr(
                  config.macro_revenue_threshold_usd
                )} across the 6 criteria and check the 10% random audit sample.`}
              {(activeUser.role === 'student' || activeUser.role === 'mentor') &&
                'Read-only view. Switch to a Teacher or National Panel account on the right to approve submissions.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {users
              .filter((u) =>
                ['usr-teacher-01', 'usr-teacher-02', 'usr-expert-01', 'usr-student-01'].includes(
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
                      ? 'bg-[#14C7C3] border-[#14C7C3] text-[#074140]'
                      : 'bg-[#181C21] border-[#095856] text-[#B8F4F3] hover:text-[#E0FFF9]'
                  }`}
                >
                  {u.full_name.split(' (')[0]} ({u.role === 'expert_admin' ? 'Panel' : u.role})
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
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
          <div className="text-xs sm:text-sm font-medium">{feedbackBanner.message}</div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline shrink-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Read-Only Notice for Student or Mentor */}
      {(activeUser.role === 'student' || activeUser.role === 'mentor') && (
        <div className="bg-[#1C2126] border border-[#FDB022]/50 rounded-xl p-6 text-center space-y-3">
          <Lock className="w-8 h-8 text-[#FDB022] mx-auto" />
          <h3 className="text-base font-bold text-[#E0FFF9]">
            Approvals Restricted to Teachers &amp; National Panel
          </h3>
          <p className="text-xs text-[#B8F4F3] max-w-lg mx-auto">
            Students submit data via the Telegram Bot, and Mentors have read-only access. Switch to a Teacher or National Panel member below to test approvals:
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button
              onClick={() => onSwitchUser('usr-teacher-01')}
              className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Switch to Mrs. Kumari Senanayake (Teacher - Royal College)
            </button>
            <button
              onClick={() => onSwitchUser('usr-expert-01')}
              className="px-4 py-2 rounded-full bg-[#181C21] border border-[#095856] text-[#14C7C3] text-xs font-semibold cursor-pointer"
            >
              Switch to Dr. Nuwan Gunasekara (National Panel)
            </button>
          </div>
        </div>
      )}

      {/* TIER 1: TEACHER APPROVAL QUEUE */}
      {activeUser.role === 'teacher' && (
        <div className="space-y-4">
          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#14C7C3]" />
              <span className="text-sm font-semibold text-[#E0FFF9]">
                Pending Submissions for {activeUser.school_name} ({teacherPendingLogs.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-1.5 text-[#B8F4F3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceRandomAuditOnApprove}
                  onChange={(e) => setForceRandomAuditOnApprove(e.target.checked)}
                  className="rounded accent-[#14C7C3]"
                />
                <span>Include in 10% Audit Sample</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-rose-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCrossSchoolRlsTest}
                  onChange={(e) => setShowCrossSchoolRlsTest(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                <span>Test Other School Block (RLS)</span>
              </label>
            </div>
          </div>

          {teacherPendingLogs.length === 0 ? (
            <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-8 text-center text-[#B8F4F3] text-sm">
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
                    className={`bg-[#1C2126] border rounded-xl p-5 space-y-4 ${
                      isForeignSchool ? 'border-rose-500/60' : 'border-[#095856]'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="figma-code-chip font-mono text-xs px-2 py-0.5 text-[#E0FFF9]">
                            {log.school_name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              log.transaction_type === 'macro'
                                ? 'border-[#F670C7] text-[#F670C7] bg-[#181C21]'
                                : 'border-[#14C7C3] text-[#14C7C3] bg-[#181C21]'
                            }`}
                          >
                            {log.transaction_type === 'macro'
                              ? `Macro Sale (> ${formatLkr(config.macro_revenue_threshold_usd)})`
                              : `Micro Activity (≤ ${formatLkr(config.macro_revenue_threshold_usd)})`}
                          </span>
                          <span className="text-xs text-[#75E0A7]">
                            <MapPin className="w-3.5 h-3.5 inline mr-1" />
                            {log.campus_distance_meters}m from school ({log.on_campus_verified ? 'On-Campus' : 'Off-Campus'})
                          </span>
                        </div>

                        <h4 className="mt-2 text-base font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
                          {log.activity_title}
                        </h4>
                        <p className="text-xs text-[#B8F4F3] mt-0.5">
                          Submitted by <strong className="text-[#E0FFF9]">{log.student_name}</strong> • {log.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-[#181C21] border border-[#095856] rounded-xl px-4 py-2.5 shrink-0">
                        <div>
                          <div className="text-[10px] uppercase text-[#B8F4F3]">Waste Recycled</div>
                          <div className="text-sm font-bold text-[#75E0A7] font-mono">
                            {log.waste_kg} kg
                          </div>
                        </div>
                        <div className="h-7 w-px bg-[#095856]" />
                        <div>
                          <div className="text-[10px] uppercase text-[#B8F4F3]">Sales (Rs.)</div>
                          <div className="text-sm font-bold text-[#E0FFF9] font-mono">
                            {formatLkr(log.revenue_usd)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isHighRevZeroEnv && (
                      <div className="bg-rose-950/50 border border-rose-500/40 rounded-lg p-3 flex items-center gap-2 text-xs text-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          <strong>Warning:</strong> High sales ({formatLkr(log.revenue_usd)}) reported with 0 kg recycled waste. Please Reject or Flag.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-[#095856]">
                      <div className="lg:col-span-5">
                        <input
                          type="text"
                          value={reviewNotes[log.id] || ''}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [log.id]: e.target.value }))
                          }
                          placeholder="Teacher comment (optional)..."
                          className="w-full bg-[#181C21] border border-[#095856] rounded-lg px-3 py-2 text-xs text-[#E0FFF9]"
                        />
                      </div>

                      <div className="lg:col-span-4">
                        <input
                          type="text"
                          value={rejectionReasons[log.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({ ...prev, [log.id]: e.target.value }))
                          }
                          placeholder="Reason if rejecting (sent via Telegram)..."
                          className="w-full bg-[#181C21] border border-rose-500/40 rounded-lg px-3 py-2 text-xs text-[#E0FFF9]"
                        />
                      </div>

                      <div className="lg:col-span-3 flex items-center gap-2 justify-end">
                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'approve')}
                          className="figma-skeuomorphic-btn px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {log.transaction_type === 'macro' ? 'Endorse' : 'Approve'}
                        </button>

                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'reject')}
                          className="px-3 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>

                        <button
                          disabled={busyLogId === log.id}
                          onClick={() => handleTeacherDecision(log, 'flag')}
                          className="px-2.5 py-2 rounded-full bg-[#181C21] border border-[#FDB022]/50 text-[#FDB022] text-xs font-semibold cursor-pointer"
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

      {/* TIER 2: NATIONAL EXPERT PANEL */}
      {activeUser.role === 'expert_admin' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-[#095856] pb-3">
            <button
              onClick={() => setExpertSubTab('macro_scoring')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'macro_scoring'
                  ? 'bg-[#14C7C3] text-[#074140]'
                  : 'bg-[#1C2126] text-[#B8F4F3] border border-[#095856]'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>Macro Sales Scoring ({expertMacroQueue.length})</span>
            </button>

            <button
              onClick={() => setExpertSubTab('random_audit')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'random_audit'
                  ? 'bg-[#14C7C3] text-[#074140]'
                  : 'bg-[#1C2126] text-[#B8F4F3] border border-[#095856]'
              }`}
            >
              <Dice5 className="w-4 h-4" />
              <span>10% Random Micro-Audit ({expertRandomAuditQueue.length})</span>
            </button>

            <button
              onClick={() => setExpertSubTab('algorithm_config')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                expertSubTab === 'algorithm_config'
                  ? 'bg-[#14C7C3] text-[#074140]'
                  : 'bg-[#1C2126] text-[#B8F4F3] border border-[#095856]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Scoring Weights</span>
            </button>
          </div>

          {expertSubTab === 'macro_scoring' && (
            <div className="space-y-4">
              {expertMacroQueue.length === 0 ? (
                <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-8 text-center text-[#B8F4F3] text-sm">
                  All Teacher-endorsed Macro submissions have been scored!
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
                      className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#095856] pb-4">
                        <div>
                          <span className="figma-code-chip font-mono text-xs px-2.5 py-0.5 text-[#E0FFF9]">
                            {log.school_name} • {log.club_name}
                          </span>
                          <h4 className="mt-2 text-lg font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
                            {log.activity_title}
                          </h4>
                          <p className="text-xs text-[#B8F4F3] mt-0.5">{log.description}</p>
                        </div>

                        <div className="bg-[#181C21] border border-[#095856] rounded-xl p-3.5 text-right shrink-0">
                          <div className="text-[11px] text-[#14C7C3] font-semibold">
                            Points to Release
                          </div>
                          <div className="text-xl font-bold text-[#E0FFF9] font-mono">
                            +{previewPoints} pts
                          </div>
                          <div className="text-xs text-[#B8F4F3]">
                            {log.waste_kg} kg • {formatLkr(log.revenue_usd)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                          <div
                            key={key}
                            className="bg-[#181C21] border border-[#095856] rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#E0FFF9]">{label}</span>
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
                          className="flex-1 bg-[#181C21] border border-[#095856] rounded-lg px-3 py-2 text-xs text-[#E0FFF9]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            disabled={busyLogId === log.id}
                            onClick={() => handleExpertAction(log, 'approve_macro')}
                            className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            Approve (+{previewPoints} pts)
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

          {expertSubTab === 'random_audit' && (
            <div className="space-y-4">
              {expertRandomAuditQueue.length === 0 ? (
                <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-8 text-center text-[#B8F4F3] text-sm">
                  No micro-transactions waiting in the 10% random audit queue.
                </div>
              ) : (
                expertRandomAuditQueue.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#181C21] text-[#FDB022] border border-[#FDB022] font-mono text-xs">
                        10% Random Audit • {log.school_name}
                      </span>
                      <h4 className="mt-2 text-base font-bold text-[#E0FFF9]">
                        {log.activity_title} ({log.waste_kg} kg • {formatLkr(log.revenue_usd)})
                      </h4>
                      <p className="text-xs text-[#B8F4F3] mt-0.5">
                        Approved by {log.teacher_reviewer_name} • Awarded +{log.points_awarded} pts
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        disabled={busyLogId === log.id}
                        onClick={() => handleExpertAction(log, 'audit_pass')}
                        className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Valid
                      </button>

                      <button
                        disabled={busyLogId === log.id}
                        onClick={() => handleExpertAction(log, 'audit_fraud')}
                        className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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
            <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#E0FFF9]">
                <Settings2 className="w-4 h-4 text-[#14C7C3]" />
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
                  <div
                    key={key}
                    className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#E0FFF9]">{label}</span>
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

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="figma-skeuomorphic-btn px-5 py-2 text-xs font-semibold cursor-pointer"
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
