'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  FileCheck2,
  GitBranch,
  Layers,
  Lock,
  MapPin,
  Recycle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Club, ImpactLog, UserProfile } from '@/types/domain';

interface ClubProfilesViewProps {
  clubs: Club[];
  impactLogs: ImpactLog[];
  activeUser: UserProfile;
  selectedClubId: string;
  onSelectClub: (clubId: string) => void;
}

export function ClubProfilesView({
  clubs,
  impactLogs,
  activeUser,
  selectedClubId,
  onSelectClub,
}: ClubProfilesViewProps) {
  const [filterMentorAssignedOnly, setFilterMentorAssignedOnly] = useState(
    activeUser.role === 'mentor'
  );

  const visibleClubs =
    activeUser.role === 'mentor' && filterMentorAssignedOnly
      ? clubs.filter((c) => activeUser.assigned_club_ids?.includes(c.id))
      : clubs;

  const activeClub =
    visibleClubs.find((c) => c.id === selectedClubId) ||
    visibleClubs[0] ||
    clubs[0];

  const clubApprovedLogs = impactLogs.filter(
    (l) => l.club_id === activeClub.id && l.status === 'approved'
  );

  const isMentorAssigned =
    activeUser.role !== 'mentor' ||
    Boolean(activeUser.assigned_club_ids?.includes(activeClub.id));

  return (
    <div className="space-y-6">
      {/* Mentor Read-Only RBAC Banner when activeUser is Mentor */}
      {activeUser.role === 'mentor' && (
        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-[#14C7C3] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-[#E0FFF9] flex items-center gap-2 font-[var(--font-jakarta)]">
                <span>Mentor Read-Only RBAC View ({activeUser.full_name})</span>
                <span className="figma-code-chip text-[11px] px-2 py-0.5 font-mono text-[#14C7C3]">
                  SELECT ONLY • NO MUTATIONS
                </span>
              </div>
              <p className="text-xs text-[#B8F4F3] mt-0.5">
                Your Mentor account is assigned to {activeUser.assigned_club_ids?.length || 0} clubs via{' '}
                <code className="font-mono text-[#14C7C3]">public.mentor_assignments</code>. You have read-only access to their detailed ledgers and cannot approve or score transactions.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterMentorAssignedOnly(!filterMentorAssignedOnly)}
            className="figma-skeuomorphic-btn px-3.5 py-1.5 text-xs font-semibold shrink-0 cursor-pointer"
          >
            {filterMentorAssignedOnly
              ? 'Showing Assigned Clubs Only (Switch to All 15)'
              : 'Showing All 15 Public Clubs (Filter to Assigned)'}
          </button>
        </div>
      )}

      {/* 15-Club Selector Pills */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B8F4F3]">
            Select Student Enterprise Profile ({visibleClubs.length} of 15 Pilot Schools)
          </h3>
          <span className="figma-emerald-pill px-2.5 py-0.5 text-xs font-medium">
            Public Transparency & Circular Ledger
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {visibleClubs.map((club) => {
            const isSelected = club.id === activeClub.id;
            const assignedToMentor = activeUser.assigned_club_ids?.includes(club.id);

            return (
              <button
                key={club.id}
                onClick={() => onSelectClub(club.id)}
                className={`text-left p-3 rounded-lg border transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#181C21] border-[#14C7C3] text-[#E0FFF9] shadow-md'
                    : 'bg-[#181C21]/70 border-[#095856] text-[#B8F4F3] hover:border-[#14C7C3]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="figma-code-chip px-1.5 py-0.2 font-mono text-[11px] font-semibold text-[#14C7C3]">
                    {club.school_code}
                  </span>
                  {assignedToMentor && (
                    <span className="figma-emerald-pill text-[10px] px-1.5 py-0.2">
                      Mentored
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-[#E0FFF9] truncate mt-1.5">
                  {club.name}
                </div>
                <div className="text-[11px] text-[#B8F4F3] truncate">{club.school_name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Club Header */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="figma-emerald-pill px-2.5 py-0.5 text-xs font-mono font-semibold">
                {activeClub.school_code} • {activeClub.school_name}
              </span>
              <span className="figma-code-chip px-2.5 py-0.5 text-xs font-medium text-[#14C7C3]">
                {activeClub.circular_sector}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#181C21] border border-[#095856] text-[#B8F4F3]">
                <Users className="w-3.5 h-3.5 inline mr-1 text-[#14C7C3]" />
                {activeClub.active_members_count} Student Entrepreneurs
              </span>
            </div>
            <h2 className="mt-2.5 text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
              {activeClub.name}
            </h2>
            <p className="mt-1 text-sm text-[#B8F4F3] max-w-3xl">{activeClub.tagline}</p>
          </div>

          <div className="flex items-center gap-3 bg-[#181C21] border border-[#095856] rounded-xl p-4 shrink-0">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#B8F4F3]">
                Environmental KPI
              </div>
              <div className="text-sm font-bold text-[#75E0A7] mt-0.5">
                {activeClub.business_model_canvas.environmental_kpi}
              </div>
              <div className="text-[11px] text-[#B8F4F3]/80 mt-1">
                Last Telegram Activity: {new Date(activeClub.last_submission_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Circular Business Model Canvas & Org Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Business Model Canvas (5 cols) */}
        <div className="lg:col-span-5 bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#14C7C3] font-semibold text-sm uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Circular Business Model Canvas</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5">
              <div className="text-[#B8F4F3] font-semibold uppercase tracking-wider text-[11px]">
                Circular Value Proposition
              </div>
              <p className="text-[#E0FFF9] mt-1 text-sm leading-relaxed">
                {activeClub.business_model_canvas.value_proposition}
              </p>
            </div>

            <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5">
              <div className="text-[#75E0A7] font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Recycle className="w-3.5 h-3.5" /> Reclaimed Campus Feedstock (Input)
              </div>
              <p className="text-[#E0FFF9] mt-1">
                {activeClub.business_model_canvas.circular_feedstock}
              </p>
            </div>

            <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5">
              <div className="text-[#14C7C3] font-semibold uppercase tracking-wider text-[11px]">
                Verified Revenue Streams
              </div>
              <ul className="mt-1.5 space-y-1 text-[#B8F4F3] list-disc list-inside">
                {activeClub.business_model_canvas.revenue_streams.map((stream, i) => (
                  <li key={i}>{stream}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3">
                <div className="text-[#B8F4F3] font-semibold uppercase text-[10px]">
                  Cost Structure
                </div>
                <ul className="mt-1 space-y-1 text-[#E0FFF9]">
                  {activeClub.business_model_canvas.cost_structure.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#181C21] border border-[#095856] rounded-lg p-3">
                <div className="text-[#B8F4F3] font-semibold uppercase text-[10px]">
                  Customer Segments
                </div>
                <ul className="mt-1 space-y-1 text-[#E0FFF9]">
                  {activeClub.business_model_canvas.customer_segments.map((seg, i) => (
                    <li key={i}>• {seg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Enterprise Org Chart & Milestones (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Org Chart */}
          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#14C7C3] font-semibold text-sm uppercase tracking-wider">
                <GitBranch className="w-4 h-4" />
                <span>Student Enterprise Governance & Org Chart</span>
              </div>
              <span className="text-xs text-[#B8F4F3]">Student-Led + Tier 1 Faculty Oversight</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeClub.org_chart.map((node) => {
                const badgeStyle =
                  node.tier === 'executive'
                    ? 'border-[#14C7C3] bg-[#181C21] text-[#14C7C3]'
                    : node.tier === 'operations'
                    ? 'border-[#095856] bg-[#181C21] text-[#75E0A7]'
                    : 'border-[#FDB022]/60 bg-[#181C21] text-[#FDB022]';

                return (
                  <div
                    key={node.id}
                    className={`rounded-lg border p-3.5 ${badgeStyle} flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider">
                        <span className="text-[#B8F4F3]">{node.department}</span>
                        <span className="figma-code-chip font-mono px-1.5 py-0.5 text-[10px]">
                          {node.tier}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-[#E0FFF9] mt-1 font-[var(--font-jakarta)]">
                        {node.holder_name}
                      </div>
                      <div className="text-xs font-semibold mt-0.5">{node.role_title}</div>
                    </div>
                    <p className="text-[11px] text-[#B8F4F3] mt-2 pt-2 border-t border-[#095856]">
                      {node.responsibilities}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approved Milestones */}
          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#FDB022] font-semibold text-sm uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>Approved Seed Milestones</span>
              </div>
              <span className="text-xs text-[#B8F4F3]">Verified Tranche Releases</span>
            </div>

            <div className="space-y-3">
              {activeClub.approved_milestones.map((ms) => (
                <div
                  key={ms.id}
                  className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#75E0A7] shrink-0" />
                      <span className="font-semibold text-[#E0FFF9] text-sm font-[var(--font-jakarta)]">
                        {ms.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#B8F4F3] mt-1">{ms.description}</p>
                    <div className="text-[11px] text-[#B8F4F3]/80 mt-1">
                      Verified by <span className="text-[#E0FFF9]">{ms.verified_by}</span> •{' '}
                      {new Date(ms.completed_at).toLocaleDateString()} • Impact: {ms.impact_summary}
                    </div>
                  </div>
                  <div className="text-right shrink-0 figma-emerald-pill rounded-lg px-3 py-2">
                    <div className="text-[10px] uppercase">Tranche Released</div>
                    <div className="text-base font-bold font-mono">
                      +${ms.seed_tranche_unlocked_usd}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Approved Public Impact & Financial Ledger */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#095856] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#14C7C3]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E0FFF9] font-[var(--font-jakarta)]">
              Approved Impact & Financial Ledger ({activeClub.name})
            </h3>
          </div>
          {!isMentorAssigned && activeUser.role === 'mentor' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#FDB022] bg-[#181C21] border border-[#FDB022]/40 px-2.5 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5" /> Public Summary Only (Club not in your Mentor assignment list)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="h-[44px] border-b border-[#095856] bg-[#1C2126] text-[#B8F4F3] font-medium">
                <th className="py-3 px-6">Log ID</th>
                <th className="py-3 px-4">Activity & Tier</th>
                <th className="py-3 px-4">EXIF Timestamp & Campus GPS</th>
                <th className="py-3 px-4">S3 Document Evidence</th>
                <th className="py-3 px-4 text-right">Waste Diverted</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-6 text-right">Points Released</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#095856]">
              {clubApprovedLogs.map((log) => (
                <tr key={log.id} className="h-[72px] hover:bg-[#181C21]/90">
                  <td className="py-3.5 px-6 font-mono font-bold text-[#14C7C3]">{log.id}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#E0FFF9]">{log.activity_title}</div>
                    <div className="text-[11px] text-[#B8F4F3] flex items-center gap-2 mt-0.5">
                      <span
                        className={`px-2 py-0.2 rounded-full font-mono uppercase text-[10px] border ${
                          log.transaction_type === 'macro'
                            ? 'border-[#F670C7] text-[#F670C7] bg-[#181C21]'
                            : 'border-[#14C7C3] text-[#14C7C3] bg-[#181C21]'
                        }`}
                      >
                        {log.transaction_type}
                      </span>
                      <span>Endorsed by {log.teacher_reviewer_name}</span>
                      {log.expert_reviewer_name && (
                        <span>• Scored by {log.expert_reviewer_name}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#B8F4F3]">
                    <div>{new Date(log.exif_timestamp).toLocaleString()}</div>
                    <div className="text-[#75E0A7] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {log.exif_lat.toFixed(4)}, {log.exif_lng.toFixed(4)} ({log.campus_distance_meters}m)
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="figma-code-chip inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[11px] text-[#E0FFF9]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#14C7C3]" />
                      {log.file_name}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#75E0A7]">
                    {log.waste_kg} kg
                    <div className="text-[10px] text-[#B8F4F3]">{log.co2_saved_kg} kg CO₂e</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#14C7C3]">
                    ${log.revenue_usd.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-[#E0FFF9]">
                    +{log.points_awarded} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
