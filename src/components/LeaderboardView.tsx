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
  activeSchoolId?: string | null;
  onSelectClubProfile: (clubId: string) => void;
  onOpenWhatsAppWorkbench?: () => void;
  onOpenTelegramWorkbench?: () => void;
  onOpenVerification?: () => void;
}

export function LeaderboardView({
  leaderboard,
  config,
  activeSchoolId,
  onSelectClubProfile,
  onOpenWhatsAppWorkbench,
  onOpenTelegramWorkbench,
  onOpenVerification,
}: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);

  const mySchoolEntry = activeSchoolId
    ? leaderboard.find((e) => e.school.id === activeSchoolId)
    : null;

  const aboveEntry =
    mySchoolEntry && mySchoolEntry.rank > 1
      ? leaderboard.find((e) => e.rank === mySchoolEntry.rank - 1)
      : null;

  const belowEntry =
    mySchoolEntry && mySchoolEntry.rank < leaderboard.length
      ? leaderboard.find((e) => e.rank === mySchoolEntry.rank + 1)
      : null;

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#005FA3] text-[#9CF2F2]">
          <FigmaTierPlatinumIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    if (tierLabel.startsWith('Gold')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#9CF2F2] text-[#005FA3] border border-[#005FA3]/25">
          <FigmaTierGoldIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    if (tierLabel.startsWith('Silver')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6F1FA] text-[#005FA3] border border-[#005FA3]/30">
          <FigmaTierSilverIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{tierLabel}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0F3F5] text-[#111010]/80 border border-[#111010]/15">
        <FigmaTierBronzeIcon className="w-3.5 h-3.5 shrink-0" />
        <span>{tierLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* ====================================================================
       * Stanford HAI AI Index HeroicCallout Band (color-theme-zeal: #005FA3)
       * ==================================================================== */}
      <section className="hai-zeal-banner p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/20">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[#9CF2F2]">
              <span>2026 National Snapshot • 15 Schools</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-[var(--font-jakarta)]">
              Verified Environmental &amp; Student Enterprise Impact
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {(onOpenWhatsAppWorkbench || onOpenTelegramWorkbench) && (
              <button
                onClick={onOpenWhatsAppWorkbench || onOpenTelegramWorkbench}
                className="hai-btn-on-zeal px-5 py-2.5 text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Submit via WhatsApp</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
            {onOpenVerification && (
              <button
                onClick={onOpenVerification}
                className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold border border-[#9CF2F2] text-white hover:bg-[#9CF2F2] hover:text-[#005FA3] transition cursor-pointer"
              >
                Teacher &amp; Panel Review
              </button>
            )}
          </div>
        </div>

        {/* 3 Simple Sri Lankan Summary Metrics Inside the Zeal Band */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white/10 border border-white/20 rounded-[18px_18px_18px_4px] p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#9CF2F2]">
              <span className="flex items-center gap-1.5">
                <Leaf className="w-4 h-4" />
                School Waste Recycled
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px]">
                15 Schools
              </span>
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-bold text-white font-[var(--font-jakarta)]">
              {totalWasteKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
            </div>
            <p className="text-xs text-white/80 mt-1.5">
              PET plastic, canteen compost, coconut coir, paper &amp; e-waste
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-[18px_18px_18px_4px] p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#9CF2F2]">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Verified Student Sales
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-mono">
                LKR (Rs.)
              </span>
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-bold text-white font-[var(--font-jakarta)]">
              {formatLkr(totalRevenue)}
            </div>
            <p className="text-xs text-white/80 mt-1.5">
              From school bookshops, Haritha Pola stalls &amp; local orders
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-[18px_18px_18px_4px] p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#9CF2F2]">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                Top-Off Seed Grants
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px]">
                + Rs. 450,000 Base/School
              </span>
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-bold text-white font-[var(--font-jakarta)]">
              {formatLkr(totalTopOffFunding)}
            </div>
            <p className="text-xs text-white/80 mt-1.5">
              Awarded based on verified circular-economy performance
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * Your School Live Gamified Standing Spotlight (For Logged-In School / Teacher)
       * ==================================================================== */}
      {mySchoolEntry && (
        <section className="bg-white border-2 border-[#005FA3] rounded-[20px_20px_20px_4px] p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold uppercase tracking-wider">
                  ⭐ Your School: {mySchoolEntry.school.name}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#E6F1FA] text-[#005FA3] text-xs font-mono font-bold border border-[#005FA3]/30">
                  National Rank #{mySchoolEntry.rank} of 15
                </span>
                {renderTierBadge(mySchoolEntry.topoff_funding_tier.split(' (')[0])}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[#111010] font-[var(--font-jakarta)] tracking-tight">
                {mySchoolEntry.club.name} • {mySchoolEntry.school.code} ({mySchoolEntry.school.city})
              </h2>

              <p className="text-sm text-[#111010]/80">
                {aboveEntry ? (
                  <>
                    Rivalry Target:{' '}
                    <strong>
                      #{aboveEntry.rank} {aboveEntry.school.name}
                    </strong>{' '}
                    has {aboveEntry.composite_leaderboard_score} pts —{' '}
                    <span className="text-[#005FA3] font-bold">
                      {(
                        aboveEntry.composite_leaderboard_score -
                        mySchoolEntry.composite_leaderboard_score
                      ).toFixed(1)}{' '}
                      more pts needed to overtake #{aboveEntry.rank}!
                    </span>
                  </>
                ) : (
                  <span className="text-emerald-700 font-bold">
                    🏆 National Leader! Currently holding Rank #1 across all 15 Sri Lankan schools!
                  </span>
                )}
                {belowEntry && (
                  <span className="text-[#111010]/60 ml-2 hidden sm:inline">
                    (Defending against #{belowEntry.rank} {belowEntry.school.name} by +{(
                      mySchoolEntry.composite_leaderboard_score -
                      belowEntry.composite_leaderboard_score
                    ).toFixed(1)}{' '}
                    pts)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="bg-[#E6F1FA] border border-[#005FA3]/25 rounded-xl px-4 py-3 text-center min-w-[110px]">
                <div className="text-[10px] uppercase font-bold text-[#005FA3]">Total Points</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#005FA3] font-mono mt-0.5">
                  {mySchoolEntry.composite_leaderboard_score} <span className="text-xs">pts</span>
                </div>
              </div>

              <div className="bg-[#E6F1FA] border border-[#005FA3]/25 rounded-xl px-4 py-3 text-center min-w-[110px]">
                <div className="text-[10px] uppercase font-bold text-[#14494F]">Waste Recycled</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#14494F] font-mono mt-0.5">
                  {mySchoolEntry.verified_waste_kg} <span className="text-xs">kg</span>
                </div>
              </div>

              <div className="bg-[#E6F1FA] border border-[#005FA3]/25 rounded-xl px-4 py-3 text-center min-w-[120px]">
                <div className="text-[10px] uppercase font-bold text-[#111010]/70">Sales (Rs.)</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#111010] font-mono mt-0.5">
                  {formatLkr(mySchoolEntry.verified_revenue_usd)}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
       * Top 3 Leading Sri Lankan Schools (White Editorial Cards on Cloud Blue)
       * ==================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111010] font-[var(--font-jakarta)]">
            Top Performing Schools
          </h2>
          <span className="text-xs font-medium text-[#111010]/70">
            Ranked by composite circular &amp; enterprise score
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {topThree.map((entry) => (
            <div
              key={entry.school.id}
              className="hai-card p-6 flex flex-col justify-between hover:border-[#005FA3]/50 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="hai-tag text-xs font-mono font-bold">
                    Rank #{entry.rank} • {entry.school.city}
                  </span>
                  {renderTierBadge(entry.topoff_funding_tier.split(' (')[0])}
                </div>

                <h3 className="mt-4 text-xl font-semibold text-[#111010] font-[var(--font-jakarta)]">
                  {entry.school.name}
                </h3>
                <p className="text-sm text-[#005FA3] font-semibold mt-0.5">
                  {entry.club.name}
                </p>
                <p className="text-xs text-[#111010]/65 mt-1">
                  {entry.club.circular_sector}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 hai-chrome-box p-3.5 text-center">
                <div>
                  <div className="text-[11px] font-medium text-[#111010]/65">
                    Waste Recycled
                  </div>
                  <div className="text-sm font-bold text-[#14494F] font-mono mt-0.5">
                    {entry.verified_waste_kg} kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#111010]/65">
                    Sales (Rs.)
                  </div>
                  <div className="text-sm font-bold text-[#111010] font-mono mt-0.5">
                    {formatLkr(entry.verified_revenue_usd)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#111010]/65">
                    Index Score
                  </div>
                  <div className="text-sm font-bold text-[#005FA3] font-mono mt-0.5">
                    {entry.composite_leaderboard_score} pts
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#111010]/10 flex items-center justify-between text-xs text-[#111010]/75">
                <span>
                  Top-Off Grant:{' '}
                  <strong className="text-[#111010]">
                    {formatLkr(entry.topoff_funding_amount_usd)}
                  </strong>
                </span>
                <button
                  onClick={() => onSelectClubProfile(entry.club.id)}
                  className="text-[#005FA3] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore Club</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
       * Simplified 5-Column School Leaderboard Table (Stanford HAI Style)
       * ==================================================================== */}
      <section className="hai-card overflow-hidden">
        <div className="px-6 py-5 border-b border-[#111010]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#111010] font-[var(--font-jakarta)]">
              All 15 Participating Sri Lankan Schools
            </h2>
            <p className="text-xs text-[#111010]/70 mt-0.5">
              Click any school row to view its 6 evaluation scores and seed grant breakdown
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#111010]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search school, town, or project..."
              className="w-full hai-input pl-9 pr-3.5 py-2 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-[46px] border-b border-[#111010]/15 bg-[#F0F3F5] text-xs font-semibold text-[#111010]/75">
                <th className="py-3 px-6 w-16">Rank</th>
                <th className="py-3 px-4">School &amp; Student Club</th>
                <th className="py-3 px-4 text-right">Waste Recycled</th>
                <th className="py-3 px-4 text-right">Student Sales (Rs.)</th>
                <th className="py-3 px-6 text-right">Seed Grant &amp; Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111010]/12 text-sm">
              {filtered.map((entry) => {
                const isExpanded = expandedSchoolId === entry.school.id;
                const isMySchool = Boolean(activeSchoolId && entry.school.id === activeSchoolId);

                return (
                  <React.Fragment key={entry.school.id}>
                    <tr
                      onClick={() =>
                        setExpandedSchoolId(isExpanded ? null : entry.school.id)
                      }
                      className={`h-[68px] transition-colors cursor-pointer ${
                        isMySchool
                          ? 'bg-[#9CF2F2]/30 hover:bg-[#9CF2F2]/50 border-l-4 border-l-[#005FA3] font-semibold'
                          : 'hover:bg-[#E6F1FA]/60'
                      }`}
                    >
                      {/* 1. Rank */}
                      <td className="py-3.5 px-6 font-mono font-semibold">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
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

                      {/* 2. School & Student Club */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#111010]">
                            {entry.school.name}
                          </span>
                          <span className="text-xs text-[#111010]/65">
                            ({entry.school.city})
                          </span>
                          {isMySchool && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#005FA3] text-[#9CF2F2] uppercase tracking-wider">
                              ⭐ YOUR SCHOOL
                            </span>
                          )}
                          {entry.penalty_points_deducted > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-mono text-[11px] font-semibold">
                              <ShieldAlert className="w-3 h-3" /> -{entry.penalty_points_deducted} pts audit penalty
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#111010]/70 mt-0.5">
                          <span className="text-[#005FA3] font-semibold">
                            {entry.club.name}
                          </span>{' '}
                          • {entry.club.circular_sector}
                        </div>
                      </td>

                      {/* 3. Waste Recycled */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <span className="text-[#14494F] font-bold">
                          {entry.verified_waste_kg} kg
                        </span>
                      </td>

                      {/* 4. Student Sales (Rs.) */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <span className="text-[#111010] font-semibold">
                          {formatLkr(entry.verified_revenue_usd)}
                        </span>
                      </td>

                      {/* 5. Seed Grant & Score */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          {renderTierBadge(entry.topoff_funding_tier)}
                          <span className="text-base font-bold font-mono text-[#005FA3] min-w-[64px]">
                            {entry.composite_leaderboard_score}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#005FA3]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#111010]/60" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Simple Expandable School Summary */}
                    {isExpanded && (
                      <tr className="bg-[#F0F3F5] border-b border-[#111010]/15">
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
                                  className="bg-white border border-[#111010]/12 rounded-[10px_10px_10px_2px] p-2.5 text-center"
                                >
                                  <div className="text-[11px] font-medium text-[#111010]/65">
                                    {c.label}
                                  </div>
                                  <div className="text-sm font-bold text-[#005FA3] font-mono mt-0.5">
                                    {c.score}/100
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#111010]/15">
                              <div className="text-xs text-[#111010]/80">
                                Total Grant:{' '}
                                <strong className="text-[#005FA3] font-mono">
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
                                className="hai-btn-primary px-4 py-2 text-xs cursor-pointer"
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
      </section>
    </div>
  );
}
