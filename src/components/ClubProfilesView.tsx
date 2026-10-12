'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  FileCheck2,
  GitBranch,
  Layers,
  Recycle,
  Users,
} from 'lucide-react';
import { Club, ImpactLog, UserProfile } from '@/types/domain';
import { formatLkr } from '@/lib/gamification/engine';

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

  return (
    <div className="space-y-6">
      {/* Mentor Read-Only Notice */}
      {activeUser.role === 'mentor' && (
        <div className="hai-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-[#005FA3] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-[#111010] font-[var(--font-jakarta)]">
                Mentor Read-Only View ({activeUser.full_name})
              </div>
              <p className="text-xs text-[#111010]/70 mt-0.5">
                You are mentoring {activeUser.assigned_club_ids?.length || 0} school clubs with read-only access to their project ledgers.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterMentorAssignedOnly(!filterMentorAssignedOnly)}
            className="hai-btn-primary px-4 py-2 text-xs shrink-0 cursor-pointer"
          >
            {filterMentorAssignedOnly
              ? 'Show All 15 Schools'
              : 'Show My Mentored Schools Only'}
          </button>
        </div>
      )}

      {/* Simple School Selector Bar */}
      <div className="hai-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label
            htmlFor="club-selector"
            className="text-xs font-bold uppercase tracking-wider text-[#005FA3] block"
          >
            Choose Participating School ({visibleClubs.length} Schools)
          </label>
          <p className="text-xs text-[#111010]/70 mt-0.5">
            Select any school to view its circular business model, student committee, and verified sales
          </p>
        </div>

        <select
          id="club-selector"
          value={activeClub.id}
          onChange={(e) => onSelectClub(e.target.value)}
          className="hai-input px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#111010] cursor-pointer"
        >
          {visibleClubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.school_name} — {club.name}
            </option>
          ))}
        </select>
      </div>

      {/* Selected School Club Header (Stanford HAI Zeal Callout Style) */}
      <div className="hai-zeal-banner p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#9CF2F2] text-[#005FA3]">
                {activeClub.school_name}
              </span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/25">
                {activeClub.circular_sector}
              </span>
              <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white">
                <Users className="w-3.5 h-3.5 inline mr-1 text-[#9CF2F2]" />
                {activeClub.active_members_count} Students
              </span>
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white font-[var(--font-jakarta)]">
              {activeClub.name}
            </h2>
            <p className="mt-1 text-sm text-white/85">{activeClub.tagline}</p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-[16px_16px_16px_4px] p-4 shrink-0">
            <div className="text-[11px] uppercase tracking-wider text-[#9CF2F2] font-semibold">
              Environmental Impact Target
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {activeClub.business_model_canvas.environmental_kpi}
            </div>
          </div>
        </div>
      </div>

      {/* Simple Project Overview & Student Committee */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* School Project Summary (5 cols) */}
        <div className="lg:col-span-5 hai-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#005FA3] font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>How This School Enterprise Works</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="hai-chrome-box p-4">
              <div className="text-[#14494F] font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Recycle className="w-3.5 h-3.5" /> Raw Waste Collected
              </div>
              <p className="text-[#111010] font-medium mt-1 text-sm">
                {activeClub.business_model_canvas.circular_feedstock}
              </p>
            </div>

            <div className="hai-chrome-box p-4">
              <div className="text-[#005FA3] font-bold uppercase tracking-wider text-[11px]">
                What Students Make
              </div>
              <p className="text-[#111010]/85 mt-1 leading-relaxed">
                {activeClub.business_model_canvas.value_proposition}
              </p>
            </div>

            <div className="hai-chrome-box p-4">
              <div className="text-[#005FA3] font-bold uppercase tracking-wider text-[11px]">
                Products &amp; Sales (Rs.)
              </div>
              <ul className="mt-1.5 space-y-1 text-[#111010]/85 list-disc list-inside">
                {activeClub.business_model_canvas.revenue_streams.map((stream, i) => (
                  <li key={i}>{stream}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Student Committee & Milestones (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Student Office Bearers */}
          <div className="hai-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#005FA3] font-bold text-sm">
                <GitBranch className="w-4 h-4" />
                <span>Student Committee &amp; Teacher-in-Charge</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {activeClub.org_chart.map((node) => (
                <div key={node.id} className="hai-chrome-box p-4">
                  <div className="text-xs text-[#005FA3] font-bold">
                    {node.role_title}
                  </div>
                  <div className="text-sm font-bold text-[#111010] mt-0.5 font-[var(--font-jakarta)]">
                    {node.holder_name}
                  </div>
                  <p className="text-[11px] text-[#111010]/70 mt-1.5">
                    {node.responsibilities}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Seed Grant Milestones */}
          <div className="hai-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#005FA3] font-bold text-sm">
                <Award className="w-4 h-4" />
                <span>Seed Grant Releases</span>
              </div>
            </div>

            <div className="space-y-3">
              {activeClub.approved_milestones.map((ms) => (
                <div
                  key={ms.id}
                  className="hai-chrome-box p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#005FA3] shrink-0" />
                      <span className="font-semibold text-[#111010] text-sm">
                        {ms.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#111010]/70 mt-1">{ms.impact_summary}</p>
                  </div>
                  <div className="text-right shrink-0 hai-cyan-pill px-3.5 py-1.5">
                    <div className="text-[10px] uppercase font-bold">Grant Released</div>
                    <div className="text-sm font-bold font-mono">
                      +{formatLkr(ms.seed_tranche_unlocked_usd)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clean 5-Column Verified Activity Ledger */}
      <div className="hai-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#111010]/15 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[#005FA3]" />
          <h3 className="text-base font-semibold text-[#111010] font-[var(--font-jakarta)]">
            Verified Recycling &amp; Sales Log ({activeClub.school_name})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="h-[44px] border-b border-[#111010]/15 bg-[#F0F3F5] text-[#111010]/75 font-semibold">
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-4">Activity &amp; Approver</th>
                <th className="py-3 px-4 text-right">Waste Recycled</th>
                <th className="py-3 px-4 text-right">Sales (Rs.)</th>
                <th className="py-3 px-6 text-right">Points Awarded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111010]/12">
              {clubApprovedLogs.map((log) => (
                <tr key={log.id} className="h-[64px] hover:bg-[#E6F1FA]/50">
                  <td className="py-3 px-6 font-mono text-[#111010]/70 whitespace-nowrap">
                    {new Date(log.exif_timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#111010] text-sm">
                      {log.activity_title}
                    </div>
                    <div className="text-[11px] text-[#111010]/65 mt-0.5">
                      Approved by {log.teacher_reviewer_name}
                      {log.expert_reviewer_name && ` • ${log.expert_reviewer_name}`}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#14494F]">
                    {log.waste_kg} kg
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-[#111010]">
                    {formatLkr(log.revenue_usd)}
                  </td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-[#005FA3]">
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
