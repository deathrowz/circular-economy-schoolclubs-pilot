'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Coins,
  Leaf,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { GamificationConfig, LeaderboardSchoolScore } from '@/types/domain';
import { formatLkr } from '@/lib/gamification/engine';
import {
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
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);

  const filtered = leaderboard.filter((entry) => {
    return (
      entry.school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.school.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.school.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.club.circular_sector.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalRevenue = leaderboard.reduce((s, e) => s + e.verified_revenue_usd, 0);
  const totalWasteKg = leaderboard.reduce((s, e) => s + e.verified_waste_kg, 0);
  const totalTopOffFunding = leaderboard.reduce(
    (s, e) => s + e.topoff_funding_amount_usd,
    0
  );

  const topThree = leaderboard.slice(0, 3);

  const renderTierBadge = (tierLabel: string) => {
    if (tierLabel.startsWith('Platinum')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#FDB022] text-[#FDB022] bg-[#1C2126]">
          <FigmaTierPlatinumIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    if (tierLabel.startsWith('Gold')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#F670C7] text-[#F670C7] bg-[#1C2126]">
          <FigmaTierGoldIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    if (tierLabel.startsWith('Silver')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#14C7C3] text-[#14C7C3] bg-[#1C2126]">
          <FigmaTierSilverIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[#8997A9] text-[#B8F4F3] bg-[#1C2126]">
        <FigmaTierBronzeIcon className="w-3.5 h-3.5 shrink-0" />
        <span>{tierLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 3 Simple Sri Lankan Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Waste Recycled */}
        <div className="p-5 rounded-xl bg-[#1C2126] border border-[#095856] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B8F4F3] flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-[#14C7C3]" />
              School Waste Recycled
            </span>
            <span className="figma-emerald-pill px-2 py-0.5 text-[11px] font-medium">
              15 Schools
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
              {totalWasteKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
            </div>
            <p className="text-xs text-[#B8F4F3] mt-1">
              PET plastic, canteen food compost, coconut coir, paper &amp; e-waste
            </p>
          </div>
        </div>

        {/* Card 2: Student Sales in LKR */}
        <div className="p-5 rounded-xl bg-[#1C2126] border border-[#095856] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B8F4F3] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#14C7C3]" />
              Verified Student Sales
            </span>
            <span className="figma-code-chip px-2 py-0.5 text-[11px] font-mono text-[#14C7C3]">
              Sri Lankan Rupees
            </span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
              {formatLkr(totalRevenue)}
            </div>
            <p className="text-xs text-[#B8F4F3] mt-1">
              From school bookshops, Haritha Pola stalls &amp; community orders
            </p>
          </div>
        </div>

        {/* Card 3: Seed Grants & Quick Actions */}
        <div className="p-5 rounded-xl bg-[#1C2126] border border-[#095856] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B8F4F3] flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#FDB022]" />
              Top-Off Seed Grants
            </span>
            <span className="text-xs text-[#FDB022] font-medium">
              + Rs. 450,000 Base/School
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
              {formatLkr(totalTopOffFunding)}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {onOpenTelegramWorkbench && (
              <button
                onClick={onOpenTelegramWorkbench}
                className="figma-skeuomorphic-btn px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Submit via Telegram</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenVerification && (
              <button
                onClick={onOpenVerification}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#181C21] hover:bg-[#095856]/40 text-[#E0FFF9] border border-[#095856] transition cursor-pointer"
              >
                Teacher Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 Leading Sri Lankan Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {topThree.map((entry, idx) => {
          const borderAccent = [
            'border-[#FDB022]/70',
            'border-[#F670C7]/60',
            'border-[#14C7C3]/70',
          ][idx];

          return (
            <div
              key={entry.school.id}
              className={`bg-[#1C2126] border ${borderAccent} rounded-xl p-5 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="figma-code-chip px-2.5 py-0.5 text-xs font-mono font-semibold text-[#E0FFF9]">
                    #{entry.rank} • {entry.school.city}
                  </span>
                  {renderTierBadge(entry.topoff_funding_tier.split(' (')[0])}
                </div>

                <h3 className="mt-3 text-base font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                  {entry.school.name}
                </h3>
                <p className="text-xs text-[#14C7C3] font-medium mt-0.5">
                  {entry.club.name}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 bg-[#181C21] rounded-lg p-3 border border-[#095856]/70 text-center">
                <div>
                  <div className="text-[11px] text-[#B8F4F3]">Waste Recycled</div>
                  <div className="text-sm font-semibold text-[#75E0A7] font-mono">
                    {entry.verified_waste_kg} kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#B8F4F3]">Sales (Rs.)</div>
                  <div className="text-sm font-semibold text-[#E0FFF9] font-mono">
                    {formatLkr(entry.verified_revenue_usd)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#B8F4F3]">Total Score</div>
                  <div className="text-sm font-bold text-[#FDB022] font-mono">
                    {entry.composite_leaderboard_score} pts
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-xs text-[#B8F4F3]">
                <span>Top-Off Grant: <strong className="text-[#E0FFF9]">{formatLkr(entry.topoff_funding_amount_usd)}</strong></span>
                <button
                  onClick={() => onSelectClubProfile(entry.club.id)}
                  className="text-[#14C7C3] hover:text-[#E0FFF9] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View School Club</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simplified 5-Column School Leaderboard Table */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#095856] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
              All 15 Participating Sri Lankan Schools
            </h2>
            <p className="text-xs text-[#B8F4F3] mt-0.5">
              Click any school row to view its 6 evaluation scores and seed grant details
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#B8F4F3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search school, town, or project..."
              className="w-full bg-[#181C21] border border-[#095856] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#E0FFF9] placeholder-[#B8F4F3]/60 focus:outline-none focus:border-[#14C7C3]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-[44px] border-b border-[#095856] bg-[#1C2126] text-xs font-medium text-[#B8F4F3]">
                <th className="py-3 px-6 w-16">Rank</th>
                <th className="py-3 px-4">School &amp; Student Club</th>
                <th className="py-3 px-4 text-right">Waste Recycled</th>
                <th className="py-3 px-4 text-right">Student Sales (Rs.)</th>
                <th className="py-3 px-6 text-right">Seed Grant &amp; Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#095856] text-sm">
              {filtered.map((entry) => {
                const isExpanded = expandedSchoolId === entry.school.id;

                return (
                  <React.Fragment key={entry.school.id}>
                    <tr
                      onClick={() =>
                        setExpandedSchoolId(isExpanded ? null : entry.school.id)
                      }
                      className="h-[68px] hover:bg-[#181C21]/90 transition-colors cursor-pointer"
                    >
                      {/* 1. Rank */}
                      <td className="py-3.5 px-6 font-mono font-semibold text-[#E0FFF9]">
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

                      {/* 2. School & Student Club */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#E0FFF9]">
                            {entry.school.name}
                          </span>
                          <span className="text-xs text-[#B8F4F3]">
                            ({entry.school.city})
                          </span>
                          {entry.penalty_points_deducted > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-[11px]">
                              <ShieldAlert className="w-3 h-3" /> -{entry.penalty_points_deducted} pts audit penalty
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#B8F4F3] mt-0.5">
                          <span className="text-[#14C7C3] font-medium">
                            {entry.club.name}
                          </span>{' '}
                          • {entry.club.circular_sector}
                        </div>
                      </td>

                      {/* 3. Waste Recycled */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <span className="text-[#75E0A7] font-semibold">
                          {entry.verified_waste_kg} kg
                        </span>
                      </td>

                      {/* 4. Student Sales (Rs.) */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <span className="text-[#E0FFF9] font-medium">
                          {formatLkr(entry.verified_revenue_usd)}
                        </span>
                      </td>

                      {/* 5. Seed Grant & Score */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          {renderTierBadge(entry.topoff_funding_tier)}
                          <span className="text-base font-bold font-mono text-[#E0FFF9] min-w-[64px]">
                            {entry.composite_leaderboard_score}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#14C7C3]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#B8F4F3]" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Simple Expandable School Summary */}
                    {isExpanded && (
                      <tr className="bg-[#181C21] border-b border-[#095856]">
                        <td colSpan={5} className="p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 flex-1">
                              {[
                                { label: 'Relevance', score: entry.criteria_scores.relevance },
                                { label: 'Business', score: entry.criteria_scores.business },
                                { label: 'Feasibility', score: entry.criteria_scores.feasibility },
                                { label: 'Student Lead', score: entry.criteria_scores.student_ownership },
                                { label: 'Sustainability', score: entry.criteria_scores.sustainability },
                                { label: 'School Support', score: entry.criteria_scores.institutional_commitment },
                              ].map((c) => (
                                <div
                                  key={c.label}
                                  className="bg-[#1C2126] border border-[#095856] rounded-lg p-2.5 text-center"
                                >
                                  <div className="text-[11px] text-[#B8F4F3]">{c.label}</div>
                                  <div className="text-sm font-bold text-[#E0FFF9] font-mono mt-0.5">
                                    {c.score}/100
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#095856]">
                              <div className="text-xs text-[#B8F4F3]">
                                Total Grant:{' '}
                                <strong className="text-[#75E0A7] font-mono">
                                  {formatLkr(
                                    entry.school.seed_funding_base_usd +
                                      entry.topoff_funding_amount_usd
                                  )}
                                </strong>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectClubProfile(entry.club.id);
                                }}
                                className="figma-skeuomorphic-btn px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                              >
                                View School Club →
                              </button>
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
    </div>
  );
}
