'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Leaf,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Club,
  LeaderboardSchoolScore,
  School,
  UserProfile,
} from '@/types/domain';
import { formatLkr } from '@/lib/gamification/engine';
import {
  BadgeGpsGuardian,
  BadgeZeroWaste,
  BadgePolaPioneer,
  BadgePitchStar,
  BadgeAuditShield,
  BadgeCommittee,
  BadgeLevelMedal,
} from '@/components/BadgeIllustrations';

export interface StudentGamificationHeroProps {
  school: School;
  club: Club;
  schoolEntry: LeaderboardSchoolScore;
  activeUser: UserProfile;
  leaderboard: LeaderboardSchoolScore[];
  approvedLogsCount?: number;
  onLogActivityClick?: () => void;
}

export function StudentGamificationHero({
  school,
  club,
  schoolEntry,
  activeUser,
  leaderboard,
  approvedLogsCount = 0,
  onLogActivityClick,
}: StudentGamificationHeroProps) {
  const currentScore = schoolEntry.composite_leaderboard_score;
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'milestones' | 'levels'>('all');
  const [selectedBadgeModal, setSelectedBadgeModal] = useState<any | null>(null);

  // Determine current tier, next tier, and remaining points
  const tierConfig = (() => {
    if (currentScore >= 420) {
      return {
        level: 4,
        tierName: 'Platinum Eco-Enterprise',
        badgeColor: 'from-cyan-400 to-blue-500',
        textColor: 'text-cyan-200',
        nextTierName: 'Platinum Max Tier (Rs. 1,050,000 Grant Unlocked)',
        targetScore: 500,
        progressPct: 100,
        pointsRemaining: 0,
        transitionLabel: 'Platinum Eco-Enterprise ★ Top National Tier',
      };
    }
    if (currentScore >= 340) {
      const remaining = Number((420 - currentScore).toFixed(1));
      return {
        level: 3,
        tierName: 'Gold Eco-Warrior',
        badgeColor: 'from-amber-400 to-yellow-600',
        textColor: 'text-amber-200',
        nextTierName: 'Platinum Eco-Enterprise',
        targetScore: 420,
        progressPct: Math.min(100, Math.round(((currentScore - 340) / (420 - 340)) * 100)),
        pointsRemaining: remaining,
        transitionLabel: `Gold Eco-Warrior ➔ Platinum Eco-Enterprise: ${remaining} pts remaining`,
      };
    }
    if (currentScore >= 260) {
      const remaining = Number((340 - currentScore).toFixed(1));
      return {
        level: 2,
        tierName: 'Silver Upcycler',
        badgeColor: 'from-slate-300 to-slate-500',
        textColor: 'text-slate-200',
        nextTierName: 'Gold Eco-Warrior',
        targetScore: 340,
        progressPct: Math.min(100, Math.round(((currentScore - 260) / (340 - 260)) * 100)),
        pointsRemaining: remaining,
        transitionLabel: `Silver Upcycler ➔ Gold Eco-Warrior: ${remaining} pts remaining`,
      };
    }
    const remaining = Number((260 - currentScore).toFixed(1));
    return {
      level: 1,
      tierName: 'Rising Green Club',
      badgeColor: 'from-emerald-400 to-teal-600',
      textColor: 'text-emerald-200',
      nextTierName: 'Silver Upcycler',
      targetScore: 260,
      progressPct: Math.min(100, Math.round((currentScore / 260) * 100)),
      pointsRemaining: remaining,
      transitionLabel: `Rising Green Club ➔ Silver Upcycler: ${remaining} pts remaining`,
    };
  })();

  // Rivalry context
  const aboveEntry =
    schoolEntry.rank > 1
      ? leaderboard.find((e) => e.rank === schoolEntry.rank - 1)
      : null;
  const belowEntry =
    schoolEntry.rank < leaderboard.length
      ? leaderboard.find((e) => e.rank === schoolEntry.rank + 1)
      : null;

  // Dynamic action-oriented coaching prompt
  const actionPrompt = (() => {
    if (tierConfig.pointsRemaining > 0 && tierConfig.pointsRemaining <= 35) {
      return {
        icon: Flame,
        headline: 'Almost there!',
        text: `Log one more compost batch or plastic collection to reach ${tierConfig.nextTierName} (${tierConfig.pointsRemaining} pts needed)!`,
        badge: 'Priority Action',
        buttonText: 'Log Compost Batch Now →',
      };
    }
    if (schoolEntry.verified_waste_kg < 100) {
      const neededKg = Number((100 - schoolEntry.verified_waste_kg).toFixed(1));
      return {
        icon: Leaf,
        headline: 'Zero-Waste Milestone in Reach',
        text: `Collect ${neededKg} more kg of school PET plastic or organic compost to unlock the 100 kg Zero-Waste Milestone Badge!`,
        badge: 'Milestone Quest',
        buttonText: 'Submit Waste Weighbridge Scale →',
      };
    }
    if (aboveEntry) {
      const gap = (aboveEntry.composite_leaderboard_score - currentScore).toFixed(1);
      return {
        icon: Target,
        headline: `Chasing #${aboveEntry.rank} ${aboveEntry.school.name}`,
        text: `You're just ${gap} pts behind ${aboveEntry.school.name}! One verified sale activity can overtake them on the national leaderboard.`,
        badge: 'Friendly Rivalry',
        buttonText: 'Log Enterprise Activity →',
      };
    }
    if (schoolEntry.rank === 1 && belowEntry) {
      const lead = (currentScore - belowEntry.composite_leaderboard_score).toFixed(1);
      return {
        icon: Crown,
        headline: 'Defend National #1 Rank!',
        text: `Leading Sri Lanka with ${currentScore} pts! You have a +${lead} pt cushion ahead of #${belowEntry.rank} ${belowEntry.school.name}.`,
        badge: 'Defending Champion',
        buttonText: 'Log Daily Activity →',
      };
    }
    return {
      icon: Sparkles,
      headline: 'Keep the Circular Momentum Going',
      text: 'Submit verified uncompressed photos directly at school to earn on-campus points and unlock top-off grants.',
      badge: 'Action Hub',
      buttonText: 'Upload New Photo →',
    };
  })();

  // 10 School Achievement Badges & Medals matching user reference image
  const allBadgesList = [
    // 4 Level Medals (Hanging Ribbon Medallions)
    {
      id: 'lvl-4',
      name: 'LEVEL 4',
      fullName: 'Level 4 • Platinum Eco-Enterprise',
      type: 'level' as const,
      category: 'Top Tier',
      date: currentScore >= 420 ? 'Apr 09, 2026' : 'Locked Tier',
      metric: '420+ pts',
      unlocked: currentScore >= 420,
      xp: '+500 XP',
      desc: 'Achieved the highest circular enterprise rank in Sri Lanka with Rs. 1,050,000 top-off grant eligibility.',
      renderIllustration: (size: number) => (
        <BadgeLevelMedal levelNumber={4} theme="orange" size={size} unlocked={currentScore >= 420} />
      ),
    },
    {
      id: 'lvl-3',
      name: 'LEVEL 3',
      fullName: 'Level 3 • Gold Eco-Warrior',
      type: 'level' as const,
      category: 'Tier Unlock',
      date: currentScore >= 340 ? 'Dec 17, 2025' : 'Locked Tier',
      metric: '340 - 419 pts',
      unlocked: currentScore >= 340,
      xp: '+300 XP',
      desc: 'Gold Eco-Warrior tier unlocked with Rs. 750,000 top-off grant eligibility.',
      renderIllustration: (size: number) => (
        <BadgeLevelMedal levelNumber={3} theme="yellow" size={size} unlocked={currentScore >= 340} />
      ),
    },
    {
      id: 'lvl-2',
      name: 'LEVEL 2',
      fullName: 'Level 2 • Silver School Club',
      type: 'level' as const,
      category: 'Tier Unlock',
      date: currentScore >= 260 ? 'Sep 25, 2025' : 'Locked Tier',
      metric: '260 - 339 pts',
      unlocked: currentScore >= 260,
      xp: '+200 XP',
      desc: 'Silver Upcycler tier unlocked with Rs. 450,000 top-off grant eligibility.',
      renderIllustration: (size: number) => (
        <BadgeLevelMedal levelNumber={2} theme="navy" size={size} unlocked={currentScore >= 260} />
      ),
    },
    {
      id: 'lvl-1',
      name: 'LEVEL 1',
      fullName: 'Level 1 • Rising Green Club',
      type: 'level' as const,
      category: 'Baseline',
      date: 'Aug 26, 2025',
      metric: 'Baseline Tier',
      unlocked: true,
      xp: '+100 XP',
      desc: 'Participating Sri Lankan School Eco Club registered for official 2026 GIZ national pilot.',
      renderIllustration: (size: number) => (
        <BadgeLevelMedal levelNumber={1} theme="teal" size={size} unlocked={true} />
      ),
    },

    // 6 Core Enterprise & Milestone Badges (Illustrated Medallions matching reference image)
    {
      id: 'gps-guardian',
      name: 'GPS GUARDIAN',
      fullName: 'EXIF GPS Guardian',
      type: 'milestone' as const,
      category: 'Geofence',
      date: 'Oct 02, 2025',
      metric: '100% On-Campus',
      unlocked: true,
      xp: '+50 XP',
      desc: 'All photos submitted as uncompressed files inside school GPS geofence radius.',
      renderIllustration: (size: number) => (
        <BadgeGpsGuardian size={size} unlocked={true} />
      ),
    },
    {
      id: 'zero-waste',
      name: 'ZERO-WASTE 100KG',
      fullName: '100 kg Zero-Waste Milestone',
      type: 'milestone' as const,
      category: 'Circularity',
      date: schoolEntry.verified_waste_kg >= 100 ? 'Oct 10, 2025' : 'In Progress',
      metric: `${schoolEntry.verified_waste_kg} / 100 kg`,
      unlocked: schoolEntry.verified_waste_kg >= 100,
      xp: '+100 XP',
      desc: 'Recycled over 100 kg of campus PET bottles, organic compost, or paper feedstock.',
      renderIllustration: (size: number) => (
        <BadgeZeroWaste size={size} unlocked={schoolEntry.verified_waste_kg >= 100} />
      ),
    },
    {
      id: 'pola-pioneer',
      name: 'POLA PIONEER',
      fullName: 'Haritha Pola Pioneer',
      type: 'milestone' as const,
      category: 'Enterprise',
      date: schoolEntry.verified_revenue_usd >= 100 ? 'Nov 14, 2025' : 'In Progress',
      metric: formatLkr(schoolEntry.verified_revenue_usd),
      unlocked: schoolEntry.verified_revenue_usd >= 100,
      xp: '+100 XP',
      desc: 'Generated over Rs. 30,000 from verified student enterprise circular product sales.',
      renderIllustration: (size: number) => (
        <BadgePolaPioneer size={size} unlocked={schoolEntry.verified_revenue_usd >= 100} />
      ),
    },
    {
      id: 'pitch-star',
      name: 'PITCH STAR',
      fullName: 'National Pitch Star',
      type: 'milestone' as const,
      category: 'Adjudication',
      date: schoolEntry.macro_points_total > 0 ? 'Dec 02, 2025' : 'Awaiting Pitch',
      metric: schoolEntry.macro_points_total > 0 ? 'Panel Scored' : 'Macro Sale',
      unlocked: schoolEntry.macro_points_total > 0,
      xp: '+150 XP',
      desc: 'High-value enterprise sale (> Rs. 15,000) scored by the National Expert Panel across 6 criteria.',
      renderIllustration: (size: number) => (
        <BadgePitchStar size={size} unlocked={schoolEntry.macro_points_total > 0} />
      ),
    },
    {
      id: 'audit-shield',
      name: 'AUDIT SHIELD',
      fullName: 'Clean Audit Shield',
      type: 'milestone' as const,
      category: 'Integrity',
      date: schoolEntry.penalty_points_deducted === 0 ? 'Jan 15, 2026' : 'Penalty Flag',
      metric: schoolEntry.penalty_points_deducted === 0 ? '0 Deductions' : `-${schoolEntry.penalty_points_deducted} pts`,
      unlocked: schoolEntry.penalty_points_deducted === 0,
      xp: 'Active Shield',
      desc: 'Passed the 10% random micro transaction audit with zero fraud flags or location penalties.',
      renderIllustration: (size: number) => (
        <BadgeAuditShield size={size} unlocked={schoolEntry.penalty_points_deducted === 0} />
      ),
    },
    {
      id: 'committee',
      name: 'COMMITTEE',
      fullName: 'Circular Student Committee',
      type: 'milestone' as const,
      category: 'Leadership',
      date: club.active_members_count >= 10 ? 'Feb 01, 2026' : 'Recruiting',
      metric: `${club.active_members_count} Students`,
      unlocked: club.active_members_count >= 10,
      xp: '+75 XP',
      desc: 'Active student committee driving circular collection, sales, and ledger reporting.',
      renderIllustration: (size: number) => (
        <BadgeCommittee size={size} unlocked={club.active_members_count >= 10} />
      ),
    },
  ];

  const displayedBadges = allBadgesList.filter((b) => {
    if (badgeFilter === 'milestones') return b.type === 'milestone';
    if (badgeFilter === 'levels') return b.type === 'level';
    return true;
  });

  const unlockedCount = allBadgesList.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6">
      {/* ====================================================================
       * Section 1: Hero Banner (National Rank, Points & Progress Mechanics)
       * ==================================================================== */}
      <section className="relative overflow-hidden rounded-[24px_24px_24px_6px] bg-[#005FA3] p-6 sm:p-8 text-white shadow-xs">
        {/* Subtle Ambient Background Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#9CF2F2]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Top Header Row: School Identity & Rank Spotlight */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/15">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9CF2F2] text-[#005FA3] font-mono text-xs font-bold shadow-xs">
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>National Rank #{schoolEntry.rank} of 15</span>
              </div>

              <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/25">
                Level {tierConfig.level} • {tierConfig.tierName}
              </span>

              <span className="px-3 py-1 rounded-full bg-black/20 text-[#9CF2F2] text-xs font-mono font-bold">
                {school.code} • {school.city}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-[var(--font-jakarta)]">
              {school.name} — {club.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed">
              {club.tagline} • Student Lead:{' '}
              <strong className="text-[#9CF2F2]">{club.org_chart[0]?.holder_name}</strong>{' '}
              • Supervising Teacher:{' '}
              <strong className="text-white">{club.org_chart[3]?.holder_name}</strong>
            </p>
          </div>

          {/* Big Score / Grant Unlocked Badge */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-[20px_20px_20px_4px] px-6 py-4 text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#9CF2F2]">
                Total Green Points
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                {currentScore}{' '}
                <span className="text-lg font-normal text-[#9CF2F2]">pts</span>
              </div>
              <div className="text-xs text-white/80 mt-1">
                Grant: <strong className="text-[#9CF2F2]">{schoolEntry.topoff_funding_tier}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Visual Progression Bar Mechanics */}
        <div className="relative z-10 py-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#9CF2F2] flex items-center gap-1.5 text-xs sm:text-sm">
              <Flame className="w-4 h-4 text-amber-300" />
              <span>{tierConfig.transitionLabel}</span>
            </span>
            <span className="font-mono text-white/90 font-semibold text-xs sm:text-sm">
              {tierConfig.pointsRemaining > 0
                ? `${tierConfig.pointsRemaining} pts needed for next tier (${currentScore} / ${tierConfig.targetScore} pts)`
                : `Top Platinum Tier Achieved! (${currentScore} pts)`}
            </span>
          </div>

          <div className="relative w-full h-3.5 rounded-full bg-black/35 overflow-hidden p-0.5 border border-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#9CF2F2] via-emerald-300 to-[#9CF2F2] transition-all duration-700 shadow-[0_0_12px_rgba(156,242,242,0.8)] relative"
              style={{ width: `${tierConfig.progressPct}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-badge-shine" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-white/70 pt-0.5">
            <span className={currentScore >= 0 ? 'text-[#9CF2F2] font-bold' : ''}>
              Level 1 (0 pts)
            </span>
            <span className={currentScore >= 260 ? 'text-[#9CF2F2] font-bold' : ''}>
              Level 2 Silver (260 pts)
            </span>
            <span className={currentScore >= 340 ? 'text-[#9CF2F2] font-bold' : ''}>
              Level 3 Gold (340 pts)
            </span>
            <span className={currentScore >= 420 ? 'text-[#9CF2F2] font-bold' : ''}>
              Level 4 Platinum (420+ pts)
            </span>
          </div>
        </div>

        {/* Dynamic Action-Oriented Coaching Callout */}
        <div className="relative z-10 p-4 rounded-2xl bg-white/12 backdrop-blur-md border border-white/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-md">
              <actionPrompt.icon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  {actionPrompt.badge}
                </span>
                <span className="text-xs text-white/70">• {actionPrompt.headline}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                {actionPrompt.text}
              </p>
            </div>
          </div>

          {onLogActivityClick && (
            <button
              onClick={onLogActivityClick}
              className="px-4 py-2 rounded-full bg-[#9CF2F2] hover:bg-white text-[#005FA3] hover:text-[#0B3E6E] text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <span>{actionPrompt.buttonText}</span>
            </button>
          )}
        </div>
      </section>

      {/* ====================================================================
       * Section 2: School Achievement Badges & Medals Showcase
       * Design Reference: Circular Illustrated Medallions with Clean Labels
       * (Matches user reference image: Level Medals, Lieutenant, Adventure Diver)
       * ==================================================================== */}
      <section className="hai-card p-6 sm:p-8 bg-white border border-[#111010]/15 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#111010]/10">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#005FA3]" />
              <h2 className="text-xl font-bold text-[#111010] font-[var(--font-jakarta)] tracking-tight">
                School Achievement Badges &amp; Medals
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#005FA3] text-[#9CF2F2] font-mono text-xs font-bold">
                {unlockedCount}/{allBadgesList.length} Earned
              </span>
            </div>
            <p className="text-xs text-[#111010]/65 mt-1">
              Complete circular milestones and level up your school club to unlock official GIZ national honors
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#F0F3F5] border border-[#111010]/10 text-xs">
            <button
              onClick={() => setBadgeFilter('all')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                badgeFilter === 'all'
                  ? 'bg-[#005FA3] text-[#9CF2F2] shadow-xs'
                  : 'text-[#111010]/70 hover:text-[#111010]'
              }`}
            >
              All ({allBadgesList.length})
            </button>
            <button
              onClick={() => setBadgeFilter('milestones')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                badgeFilter === 'milestones'
                  ? 'bg-[#005FA3] text-[#9CF2F2] shadow-xs'
                  : 'text-[#111010]/70 hover:text-[#111010]'
              }`}
            >
              Milestones (6)
            </button>
            <button
              onClick={() => setBadgeFilter('levels')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                badgeFilter === 'levels'
                  ? 'bg-[#005FA3] text-[#9CF2F2] shadow-xs'
                  : 'text-[#111010]/70 hover:text-[#111010]'
              }`}
            >
              Levels (4)
            </button>
          </div>
        </div>

        {/* Circular Badges Grid (Exact Style from User Reference Image) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-6 py-2">
          {displayedBadges.map((badge) => (
            <div
              key={badge.id}
              onClick={() => setSelectedBadgeModal(badge)}
              className="group flex flex-col items-center text-center cursor-pointer transition-transform duration-300 hover:-translate-y-2 select-none"
              title={`${badge.fullName}: ${badge.desc}`}
            >
              {/* Circular Illustrated Medallion */}
              <div className="relative">
                <div className="transition-transform duration-300 group-hover:scale-105 drop-shadow-sm group-hover:drop-shadow-md">
                  {badge.renderIllustration(88)}
                </div>

                {/* Status Indicator */}
                {badge.unlocked ? (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center border-2 border-white shadow-xs">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Title Directly Below (Exact Reference Typography) */}
              <div className="mt-3 space-y-0.5 max-w-[140px]">
                <div className="text-xs font-extrabold text-[#111010] uppercase tracking-wide group-hover:text-[#005FA3] transition-colors leading-tight font-[var(--font-jakarta)]">
                  {badge.name}
                </div>
                <div className="text-[11px] text-[#111010]/60 font-medium">
                  {badge.unlocked ? badge.date : 'Locked Milestone'}
                </div>
                <div className="text-[10px] font-mono font-semibold text-[#005FA3] mt-0.5">
                  {badge.metric}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
       * Section 3: 4 Core Live KPI Cards (Waste, Sales, Unlocked Grant, Rivalry)
       * ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recycled Waste */}
        <div className="hai-card p-5 bg-white border border-[#111010]/15 space-y-2 hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs text-[#005FA3] font-bold">
            <span className="flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <span>Waste Diverted</span>
            </span>
            <span className="hai-cyan-pill text-[10px] font-bold">Milestone</span>
          </div>
          <div className="text-3xl font-extrabold text-[#111010] font-mono">
            {schoolEntry.verified_waste_kg}{' '}
            <span className="text-sm font-normal text-[#111010]/60">kg</span>
          </div>
          <p className="text-xs text-[#111010]/65">
            {schoolEntry.verified_co2_kg} kg CO₂e greenhouse gas avoided
          </p>
        </div>

        {/* Enterprise Sales */}
        <div className="hai-card p-5 bg-white border border-[#111010]/15 space-y-2 hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs text-[#005FA3] font-bold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#005FA3]" />
              <span>Verified Sales</span>
            </span>
            <span className="hai-cyan-pill text-[10px] font-bold">Commercial</span>
          </div>
          <div className="text-3xl font-extrabold text-[#111010] font-mono">
            {formatLkr(schoolEntry.verified_revenue_usd)}
          </div>
          <p className="text-xs text-[#111010]/65">
            {approvedLogsCount} verified teacher &amp; expert transactions
          </p>
        </div>

        {/* Unlocked Seed Funding */}
        <div className="hai-card p-5 bg-white border border-[#111010]/15 space-y-2 hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs text-[#005FA3] font-bold">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Seed Grant Unlocked</span>
            </span>
            <span className="hai-cyan-pill text-[10px] font-bold">GIZ Pilot</span>
          </div>
          <div className="text-3xl font-extrabold text-[#111010] font-mono">
            {formatLkr(school.seed_funding_base_usd + schoolEntry.topoff_funding_amount_usd)}
          </div>
          <p className="text-xs text-[#111010]/65">
            Rs. 450k Base + {formatLkr(schoolEntry.topoff_funding_amount_usd)} Top-Off
          </p>
        </div>

        {/* Friendly Rivalry Position */}
        <div className="hai-card p-5 bg-white border border-[#111010]/15 space-y-2 hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs text-[#005FA3] font-bold">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-purple-600" />
              <span>Rivalry Position</span>
            </span>
            <span className="hai-cyan-pill text-[10px] font-bold">National</span>
          </div>
          <div className="text-lg font-bold text-[#111010] truncate mt-1">
            {aboveEntry ? (
              <>
                {(aboveEntry.composite_leaderboard_score - currentScore).toFixed(1)}{' '}
                <span className="text-xs font-normal text-[#111010]/70">
                  pts behind #{aboveEntry.rank}
                </span>
              </>
            ) : (
              <span className="text-emerald-700 font-extrabold">Leading #1 in Sri Lanka!</span>
            )}
          </div>
          <p className="text-xs text-[#111010]/65 truncate">
            {aboveEntry
              ? `Chasing ${aboveEntry.school.name}`
              : belowEntry
              ? `${(currentScore - belowEntry.composite_leaderboard_score).toFixed(1)} pts ahead of #${belowEntry.rank}`
              : 'Pilot Leader'}
          </p>
        </div>
      </div>

      {/* Interactive Badge Details Modal */}
      {selectedBadgeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedBadgeModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#111010]/15 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              <div className="drop-shadow-md">
                {selectedBadgeModal.renderIllustration(100)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#005FA3] bg-[#E6F1FA] px-2 py-0.5 rounded-full">
                  {selectedBadgeModal.category}
                </span>
                <span className="text-[10px] font-bold font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {selectedBadgeModal.xp}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#111010] font-[var(--font-jakarta)]">
                {selectedBadgeModal.fullName}
              </h3>
              <p className="text-xs text-[#111010]/70 leading-relaxed px-2">
                {selectedBadgeModal.desc}
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#111010]/10 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#111010]/70">Status:</span>
              {selectedBadgeModal.unlocked ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked ({selectedBadgeModal.date})
                </span>
              ) : (
                <span className="text-slate-500 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Locked Milestone
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedBadgeModal(null)}
              className="w-full py-2.5 rounded-full bg-[#005FA3] text-[#9CF2F2] font-bold text-xs hover:bg-[#0B3E6E] transition cursor-pointer"
            >
              Close Badge Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
