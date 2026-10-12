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
      <div className="hai-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hai-cyan-pill text-xs font-bold uppercase">
                Role: {activeUser.role.replace('_', ' ')}
              </span>
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
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activeUser.id === u.id
                      ? 'bg-[#005FA3] text-[#9CF2F2]'
                      : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/60 hover:text-[#005FA3]'
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
            Students submit data via the Telegram Bot, and Mentors have read-only access. Switch to a Teacher or National Panel member below to test approvals:
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

      {/* TIER 1: TEACHER APPROVAL QUEUE */}
      {activeUser.role === 'teacher' && (
        <div className="space-y-5">
          <div className="hai-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#005FA3]" />
              <span className="text-sm font-semibold text-[#111010]">
                Pending Submissions for {activeUser.school_name} ({teacherPendingLogs.length})
              </span>
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

              <label className="inline-flex items-center gap-1.5 text-rose-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCrossSchoolRlsTest}
                  onChange={(e) => setShowCrossSchoolRlsTest(e.target.checked)}
                  className="rounded accent-rose-600"
                />
                <span>Test Other School Block (RLS)</span>
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
                          placeholder="Reason if rejecting (sent via Telegram)..."
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

      {/* TIER 2: NATIONAL EXPERT PANEL */}
      {activeUser.role === 'expert_admin' && (
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

          {expertSubTab === 'macro_scoring' && (
            <div className="space-y-4">
              {expertMacroQueue.length === 0 ? (
                <div className="hai-card p-8 text-center text-[#111010]/70 text-sm">
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
              {expertRandomAuditQueue.length === 0 ? (
                <div className="hai-card p-8 text-center text-[#111010]/70 text-sm">
                  No micro-transactions waiting in the 10% random audit queue.
                </div>
              ) : (
                expertRandomAuditQueue.map((log) => (
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
