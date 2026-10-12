'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Info,
  Leaf,
  Scale,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { GamificationConfig, LeaderboardSchoolScore } from '@/types/domain';
import {
  FigmaRocketIcon,
  FigmaTierBronzeIcon,
  FigmaTierGoldIcon,
  FigmaTierPlatinumIcon,
  FigmaTierSilverIcon,
} from '@/components/FigmaIcons';

interface LeaderboardViewProps {
  leaderboard: LeaderboardSchoolScore[];
  config: GamificationConfig;
  onSelectClubProfile: (clubId: string) => void;
  onOpenTelegramWorkbench?: () => void;
  onOpenVerification?: () => void;
}

export function LeaderboardView({
  leaderboard,
  config,
  onSelectClubProfile,
  onOpenTelegramWorkbench,
  onOpenVerification,
}: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(
    leaderboard[0]?.school.id || null
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  const filtered = leaderboard.filter((entry) => {
    const matchesQuery =
      entry.school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.school.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.club.circular_sector.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier =
      tierFilter === 'ALL' ||
      entry.topoff_funding_tier.toLowerCase().startsWith(tierFilter.toLowerCase());

    return matchesQuery && matchesTier;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filtered.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  const totalRevenue = leaderboard.reduce((s, e) => s + e.verified_revenue_usd, 0);
  const totalWasteKg = leaderboard.reduce((s, e) => s + e.verified_waste_kg, 0);
  const totalCo2Kg = leaderboard.reduce((s, e) => s + e.verified_co2_kg, 0);
  const totalTopOffFunding = leaderboard.reduce(
    (s, e) => s + e.topoff_funding_amount_usd,
    0
  );

  const topThree = leaderboard.slice(0, 3);

  const renderFigmaTierBadge = (tierLabel: string) => {
    if (tierLabel.startsWith('Platinum')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border-[1.5px] border-[#FDB022] text-[#FDB022] bg-[#1C2126]">
          <FigmaTierPlatinumIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    if (tierLabel.startsWith('Gold')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border-[1.5px] border-[#F670C7] text-[#F670C7] bg-[#1C2126]">
          <FigmaTierGoldIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    if (tierLabel.startsWith('Silver')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border-[1.5px] border-[#14C7C3] text-[#14C7C3] bg-[#1C2126]">
          <FigmaTierSilverIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border-[1.5px] border-[#8997A9] text-[#B8F4F3] bg-[#1C2126]">
        <FigmaTierBronzeIcon className="w-3.5 h-3.5 shrink-0" />
        <span>{tierLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Figma Row 1: _Account card desktop Hero Cards (#1512:12655, #1357:11317) + Inline CTA (#1353:10971) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: #1512:12655 — Circular Material & Verified Revenue */}
        <div className="lg:col-span-4 min-h-[168px] p-6 rounded-xl bg-[#1C2126] border border-[#095856] shadow-[0_1px_2px_rgba(16,24,40,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B8F4F3] flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-[#14C7C3]" />
              Circular Material Diverted (15 Schools)
            </span>
            <span className="figma-emerald-pill px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#17B26A]" />
              EXIF Verified
            </span>
          </div>

          <div className="my-2">
            <div className="text-[30px] leading-[38px] font-semibold tracking-tight text-[#E0FFF9] font-[var(--font-jakarta)]">
              {totalWasteKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
              <span className="ml-2 text-sm font-normal text-[#B8F4F3]">
                ({totalCo2Kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO₂e)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#B8F4F3] pt-2 border-t border-[#095856]/60">
            <span>
              Verified Student Revenue:{' '}
              <strong className="text-[#E0FFF9] font-mono">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="text-[#14C7C3] font-mono">
              Target ${config.env_to_fin_normalization_ratio.toFixed(2)}/kg
            </span>
          </div>
        </div>

        {/* Card 2: #1357:11317 — Top-Off Seed Funding Pool & Validation Safeguards */}
        <div className="lg:col-span-4 min-h-[168px] p-6 rounded-xl bg-[#1C2126] border border-[#095856] shadow-[0_1px_2px_rgba(16,24,40,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B8F4F3] flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#FDB022]" />
              Top-Off Seed Pool Disbursed
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#095856] bg-[#181C21] text-[#14C7C3]">
              {(config.micro_audit_sample_rate * 100).toFixed(0)}% Micro Audit
            </span>
          </div>

          <div className="my-2">
            <div className="text-[30px] leading-[38px] font-semibold tracking-tight text-[#E0FFF9] font-[var(--font-jakarta)]">
              ${totalTopOffFunding.toLocaleString()}
              <span className="ml-2 text-sm font-normal text-[#B8F4F3]">
                + $22,500 Base Grants
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#B8F4F3] pt-2 border-t border-[#095856]/60">
            <span>
              Macro Threshold:{' '}
              <strong className="text-[#E0FFF9] font-mono">
                &gt;${config.macro_revenue_threshold_usd}
              </strong>
            </span>
            <span className="text-rose-400 font-mono font-medium">
              Fraud Penalty: -{config.fraud_penalty_points} pts
            </span>
          </div>
        </div>

        {/* Card 3: #1353:10971 — Figma Inline CTA Card with Skeuomorphic Pill Button */}
        <div className="lg:col-span-4 min-h-[168px] p-6 rounded-xl bg-[#1C2126] border border-[#095856] shadow-[0_1px_2px_rgba(16,24,40,0.05)] flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                Log Campus Circular Impact
              </h3>
              <span className="p-1.5 rounded-lg bg-[#181C21] border border-[#095856] text-[#14C7C3]">
                <FigmaRocketIcon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-sm text-[#B8F4F3] leading-relaxed">
              Submit uncompressed EXIF photos via the Telegram Bot or adjudicate pending Micro/Macro logs to unlock seed tranches.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-2.5">
            {onOpenTelegramWorkbench && (
              <button
                onClick={onOpenTelegramWorkbench}
                className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Launch Telegram Bot</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenVerification && (
              <button
                onClick={onOpenVerification}
                className="px-3.5 py-2 rounded-full text-xs font-semibold bg-[#181C21] hover:bg-[#095856]/40 text-[#E0FFF9] border border-[#095856] transition cursor-pointer"
              >
                Adjudicate Queue
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 Schools Podium Cards (Styled with Figma #1C2126 & Downloaded Tier SVGs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {topThree.map((entry, idx) => {
          const borderAccent = [
            'border-[#FDB022]/70',
            'border-[#F670C7]/60',
            'border-[#14C7C3]/70',
          ][idx];

          return (
            <div
              key={entry.school.id}
              className={`bg-[#1C2126] border ${borderAccent} rounded-xl p-5 relative overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.05)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="figma-code-chip px-2 py-0.5 text-xs font-mono font-semibold text-[#E0FFF9]">
                      #{entry.rank} • {entry.school.code}
                    </span>
                    {renderFigmaTierBadge(entry.topoff_funding_tier.split(' ')[0])}
                  </div>
                  <h3 className="mt-2.5 text-base font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                    {entry.school.name}
                  </h3>
                  <p className="text-xs text-[#14C7C3] font-medium">{entry.club.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
                    {entry.composite_leaderboard_score}
                  </div>
                  <div className="text-[11px] text-[#B8F4F3] uppercase tracking-wider">
                    Composite Pts
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 bg-[#181C21] rounded-lg p-2.5 border border-[#095856]/70 text-center">
                <div>
                  <div className="text-[11px] text-[#B8F4F3]">6-Criteria Avg</div>
                  <div className="text-sm font-semibold text-[#E0FFF9] font-mono">
                    {entry.weighted_criteria_score}/100
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#B8F4F3]">Fin/Env Norm</div>
                  <div className="text-sm font-semibold text-[#14C7C3] font-mono">
                    {entry.fin_env_normalization_index}x
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#B8F4F3]">Top-Off Seed</div>
                  <div className="text-sm font-semibold text-[#FDB022] font-mono">
                    +${entry.topoff_funding_amount_usd.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-xs text-[#B8F4F3]">
                <span className="font-mono">
                  ♻️ {entry.verified_waste_kg} kg • 💵 ${entry.verified_revenue_usd}
                </span>
                <button
                  onClick={() => onSelectClubProfile(entry.club.id)}
                  className="text-[#14C7C3] hover:text-[#E0FFF9] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Enterprise Ledger</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Figma Leaderboard Table Container (#1353:10974) */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {/* Figma Card Header (#1353:10975) — padding: 20px 24px, border-bottom: 1px #095856 */}
        <div className="px-6 py-5 border-b border-[#095856] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                15-School Circular Enterprise Leaderboard
              </h2>
              <span className="figma-emerald-pill px-2.5 py-0.5 text-xs font-medium">
                {filtered.length} Active Schools
              </span>
              <span className="figma-code-chip px-2.5 py-0.5 text-xs font-mono text-[#B8F4F3]">
                Harmonic Equilibrium: ${config.env_to_fin_normalization_ratio}/kg
              </span>
            </div>
            <p className="text-xs text-[#B8F4F3]">
              Composite score weights: Relevance ({(config.relevance_weight * 100).toFixed(0)}%) •
              Business ({(config.business_weight * 100).toFixed(0)}%) • Feasibility (
              {(config.feasibility_weight * 100).toFixed(0)}%) • Student Ownership (
              {(config.student_ownership_weight * 100).toFixed(0)}%) • Sustainability (
              {(config.sustainability_weight * 100).toFixed(0)}%) • Institutional Commitment (
              {(config.institutional_commitment_weight * 100).toFixed(0)}%)
            </p>
          </div>

          {/* Search & Tier Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center rounded-lg bg-[#181C21] border border-[#095856] p-0.5 text-xs">
              {['ALL', 'Platinum', 'Gold', 'Silver', 'Bronze'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => {
                    setTierFilter(tier);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    tierFilter === tier
                      ? 'bg-[#14C7C3] text-[#074140] font-semibold'
                      : 'text-[#B8F4F3] hover:text-[#E0FFF9]'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#B8F4F3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search school, code, club..."
                className="w-full bg-[#181C21] border border-[#095856] rounded-lg pl-9 pr-3.5 py-2 text-sm text-[#E0FFF9] placeholder-[#B8F4F3]/60 focus:outline-none focus:border-[#14C7C3]"
              />
            </div>
          </div>
        </div>

        {/* Figma Table Content (#1353:10990) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Figma 44px Header Row (#1353:10992) */}
              <tr className="h-[44px] border-b border-[#095856] bg-[#1C2126] text-xs font-medium text-[#B8F4F3]">
                <th className="py-3 px-6">Rank</th>
                <th className="py-3 px-4">School & Student Enterprise</th>
                <th className="py-3 px-4">Seed Tier Badge</th>
                <th className="py-3 px-4 text-center">6-Criteria Avg</th>
                <th className="py-3 px-4 text-right">Waste / Revenue</th>
                <th className="py-3 px-4 text-center">Fin/Env Norm</th>
                <th className="py-3 px-4 text-right">Micro + Macro</th>
                <th className="py-3 px-4 text-center">Audit Status</th>
                <th className="py-3 px-6 text-right">Composite Score</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#095856] text-sm">
              {paginatedRows.map((entry) => {
                const isExpanded = expandedSchoolId === entry.school.id;

                return (
                  <React.Fragment key={entry.school.id}>
                    {/* Figma 72px Table Cell Row (#1353:10993) */}
                    <tr
                      onClick={() =>
                        setExpandedSchoolId(isExpanded ? null : entry.school.id)
                      }
                      className="h-[72px] hover:bg-[#181C21]/90 transition-colors cursor-pointer"
                    >
                      {/* Column 1: Rank */}
                      <td className="py-4 px-6 font-mono font-semibold text-[#E0FFF9]">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                            entry.rank === 1
                              ? 'bg-[#FDB022] text-[#0C111D] font-bold'
                              : entry.rank === 2
                              ? 'bg-[#F670C7] text-[#0C111D] font-bold'
                              : entry.rank === 3
                              ? 'bg-[#14C7C3] text-[#0C111D] font-bold'
                              : 'bg-[#181C21] text-[#B8F4F3] border border-[#095856]'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      {/* Column 2: School & Enterprise with .figma-code-chip */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="figma-code-chip px-2 py-0.5 text-xs font-mono font-medium text-[#E0FFF9]">
                            {entry.school.code}
                          </span>
                          <span className="font-medium text-[#E0FFF9]">
                            {entry.school.name}
                          </span>
                        </div>
                        <div className="text-xs text-[#B8F4F3] mt-0.5 flex items-center gap-2">
                          <span className="text-[#14C7C3] font-medium">
                            {entry.club.name}
                          </span>
                          <span className="text-[#095856]">•</span>
                          <span>{entry.club.circular_sector}</span>
                        </div>
                      </td>

                      {/* Column 3: Figma Tier Pill Badge (#1353:11034) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {renderFigmaTierBadge(entry.topoff_funding_tier)}
                      </td>

                      {/* Column 4: 6-Criteria Weighted */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181C21] border border-[#095856]">
                          <TrendingUp className="w-3.5 h-3.5 text-[#14C7C3]" />
                          <span className="font-mono font-semibold text-[#E0FFF9]">
                            {entry.weighted_criteria_score}
                          </span>
                          <span className="text-xs text-[#B8F4F3]">/100</span>
                        </div>
                      </td>

                      {/* Column 5: Verified Waste / Revenue */}
                      <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap">
                        <div className="text-[#75E0A7] font-semibold">
                          ♻️ {entry.verified_waste_kg} kg
                        </div>
                        <div className="text-[#B8F4F3]">
                          💵 ${entry.verified_revenue_usd.toFixed(2)}
                        </div>
                      </td>

                      {/* Column 6: Fin/Env Harmonic Normalization */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                            entry.fin_env_normalization_index >= 1.15
                              ? 'figma-emerald-pill'
                              : entry.fin_env_normalization_index >= 0.95
                              ? 'bg-[#181C21] text-[#14C7C3] border border-[#095856]'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {entry.fin_env_normalization_index}x
                        </span>
                      </td>

                      {/* Column 7: Micro + Macro Points */}
                      <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap">
                        <div className="text-[#E0FFF9]">
                          Micro: <span className="font-semibold">+{entry.micro_points_total}</span>
                        </div>
                        <div className="text-[#14C7C3]">
                          Macro: <span className="font-semibold">+{entry.macro_points_total}</span>
                        </div>
                      </td>

                      {/* Column 8: Audit Status / Fraud Penalties */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {entry.penalty_points_deducted > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-xs font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" /> -{entry.penalty_points_deducted}
                          </span>
                        ) : (
                          <span className="figma-emerald-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </td>

                      {/* Column 9: Composite Score (#1353:11119) */}
                      <td className="py-4 px-6 text-right">
                        <span className="text-lg font-bold font-mono text-[#E0FFF9]">
                          {entry.composite_leaderboard_score}
                        </span>
                      </td>

                      {/* Column 10: Expand Toggle */}
                      <td className="py-4 px-4 text-center text-[#B8F4F3]">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 mx-auto text-[#14C7C3]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mx-auto" />
                        )}
                      </td>
                    </tr>

                    {/* Expandable 6-Criteria Breakdown Drawer */}
                    {isExpanded && (
                      <tr className="bg-[#181C21] border-b border-[#095856]">
                        <td colSpan={10} className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* 6 Core Criteria Breakdown */}
                            <div className="lg:col-span-2 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#14C7C3]">
                                  6 Core Evaluation Criteria Breakdown ({entry.school.name})
                                </h4>
                                <span className="text-xs text-[#B8F4F3]">
                                  District: {entry.school.district} ({entry.school.city})
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                  {
                                    label: '1. Relevance',
                                    score: entry.criteria_scores.relevance,
                                    weight: config.relevance_weight,
                                  },
                                  {
                                    label: '2. Business Viability',
                                    score: entry.criteria_scores.business,
                                    weight: config.business_weight,
                                  },
                                  {
                                    label: '3. Feasibility',
                                    score: entry.criteria_scores.feasibility,
                                    weight: config.feasibility_weight,
                                  },
                                  {
                                    label: '4. Student Ownership',
                                    score: entry.criteria_scores.student_ownership,
                                    weight: config.student_ownership_weight,
                                  },
                                  {
                                    label: '5. Sustainability',
                                    score: entry.criteria_scores.sustainability,
                                    weight: config.sustainability_weight,
                                  },
                                  {
                                    label: '6. Institutional Commit.',
                                    score: entry.criteria_scores.institutional_commitment,
                                    weight: config.institutional_commitment_weight,
                                  },
                                ].map((c) => (
                                  <div
                                    key={c.label}
                                    className="bg-[#1C2126] border border-[#095856] rounded-lg p-3"
                                  >
                                    <div className="flex items-center justify-between text-xs text-[#B8F4F3]">
                                      <span>{c.label}</span>
                                      <span className="font-mono text-[11px] text-[#14C7C3]">
                                        w={(c.weight * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="mt-1.5 flex items-baseline justify-between">
                                      <span className="text-base font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
                                        {c.score}
                                      </span>
                                      <span className="text-[11px] text-[#75E0A7] font-mono">
                                        +{(c.score * c.weight).toFixed(1)} w-pts
                                      </span>
                                    </div>
                                    <div className="mt-2 w-full bg-[#181C21] h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-gradient-to-r from-[#14C7C3] to-[#75E0A7] h-full rounded-full"
                                        style={{ width: `${Math.min(100, c.score)}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Enterprise Summary & Quick Link */}
                            <div className="bg-[#1C2126] border border-[#095856] rounded-lg p-4 flex flex-col justify-between">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-[#14C7C3]">
                                  Student Enterprise Summary
                                </div>
                                <h5 className="mt-1 text-base font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                                  {entry.club.name}
                                </h5>
                                <p className="mt-1 text-xs text-[#B8F4F3]">
                                  {entry.club.tagline}
                                </p>
                                <div className="mt-3 space-y-1.5 text-xs text-[#B8F4F3]">
                                  <div>
                                    • <span className="text-[#E0FFF9]">Feedstock:</span>{' '}
                                    {entry.club.business_model_canvas.circular_feedstock}
                                  </div>
                                  <div>
                                    • <span className="text-[#E0FFF9]">Base + Top-Off Seed:</span>{' '}
                                    <span className="text-[#75E0A7] font-mono font-semibold">
                                      ${entry.school.seed_funding_base_usd.toLocaleString()} + $
                                      {entry.topoff_funding_amount_usd.toLocaleString()} = $
                                      {(
                                        entry.school.seed_funding_base_usd +
                                        entry.topoff_funding_amount_usd
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-[#095856] flex items-center justify-between">
                                <span className="text-xs text-[#B8F4F3]">
                                  {entry.approved_transactions_count} Verified Transactions
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectClubProfile(entry.club.id);
                                  }}
                                  className="figma-skeuomorphic-btn px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                                >
                                  Inspect Club & Org Chart →
                                </button>
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

        {/* Figma Pagination Bar (#1353:11182) — padding: 12px 24px 16px */}
        <div className="px-6 pt-3 pb-4 border-t border-[#095856] bg-[#1C2126] flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border border-[#0C7471] bg-[#181C21] text-[#E0FFF9] disabled:opacity-40 hover:border-[#14C7C3] transition cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 rounded-full text-xs font-medium transition cursor-pointer ${
                  safePage === pageNum
                    ? 'bg-[#181C21] text-[#14C7C3] border border-[#095856] font-bold'
                    : 'text-[#B8F4F3] hover:bg-[#181C21]/60'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border border-[#0C7471] bg-[#181C21] text-[#E0FFF9] disabled:opacity-40 hover:border-[#14C7C3] transition cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
