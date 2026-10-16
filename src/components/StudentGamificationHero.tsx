'use client';

import React from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Coins,
  Compass,
  Crown,
  Flame,
  Leaf,
  Lock,
  MapPin,
  Recycle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import {
  Club,
  LeaderboardSchoolScore,
  School,
  UserProfile,
} from '@/types/domain';
import { formatLkr } from '@/lib/gamification/engine';

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

  // Badges calculation
  const badges = [
    {
      id: 'gps-guardian',
      name: 'EXIF GPS Guardian',
      category: 'Geofence Integrity',
      unlocked: true,
      icon: Compass,
      glow: 'shadow-[0_0_18px_rgba(156,242,242,0.45)]',
      border: 'border-[#9CF2F2]/60 bg-gradient-to-br from-[#005FA3]/90 to-[#0A3D66]',
      iconColor: 'text-[#9CF2F2]',
      tag: '100% On-Campus',
      desc: 'All photos taken inside school GPS radius with uncompressed EXIF metadata.',
    },
    {
      id: 'zero-waste',
      name: '100 kg Zero-Waste',
      category: 'Material Circularity',
      unlocked: schoolEntry.verified_waste_kg >= 100,
      icon: Leaf,
      glow: 'shadow-[0_0_18px_rgba(52,211,153,0.4)]',
      border:
        schoolEntry.verified_waste_kg >= 100
          ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-800 to-teal-950'
          : 'border-white/15 bg-white/5 opacity-60',
      iconColor: schoolEntry.verified_waste_kg >= 100 ? 'text-emerald-300' : 'text-white/40',
      tag: `${schoolEntry.verified_waste_kg}/100 kg`,
      desc: 'Recycled over 100 kg of campus PET bottles, food waste, or paper feedstock.',
    },
    {
      id: 'pola-entrepreneur',
      name: 'Haritha Pola Pioneer',
      category: 'Enterprise Revenue',
      unlocked: schoolEntry.verified_revenue_usd >= 100,
      icon: Coins,
      glow: 'shadow-[0_0_18px_rgba(251,191,36,0.4)]',
      border:
        schoolEntry.verified_revenue_usd >= 100
          ? 'border-amber-400/60 bg-gradient-to-br from-amber-800 to-yellow-950'
          : 'border-white/15 bg-white/5 opacity-60',
      iconColor: schoolEntry.verified_revenue_usd >= 100 ? 'text-amber-300' : 'text-white/40',
      tag: formatLkr(schoolEntry.verified_revenue_usd),
      desc: 'Generated over Rs. 30,000 from school circular enterprise products.',
    },
    {
      id: 'expert-pitch-star',
      name: 'National Pitch Star',
      category: 'Macro Adjudication',
      unlocked: schoolEntry.macro_points_total > 0,
      icon: Trophy,
      glow: 'shadow-[0_0_18px_rgba(244,114,182,0.4)]',
      border:
        schoolEntry.macro_points_total > 0
          ? 'border-rose-400/60 bg-gradient-to-br from-purple-900 to-indigo-950'
          : 'border-white/15 bg-white/5 opacity-60',
      iconColor: schoolEntry.macro_points_total > 0 ? 'text-pink-300' : 'text-white/40',
      tag: schoolEntry.macro_points_total > 0 ? 'Panel Scored' : 'Pending Macro',
      desc: 'Successfully scored by the National Expert Panel across 6 criteria.',
    },
    {
      id: 'clean-audit-shield',
      name: 'Clean Audit Shield',
      category: 'Integrity Rating',
      unlocked: schoolEntry.penalty_points_deducted === 0,
      icon: ShieldCheck,
      glow: 'shadow-[0_0_18px_rgba(96,165,250,0.4)]',
      border:
        schoolEntry.penalty_points_deducted === 0
          ? 'border-blue-400/60 bg-gradient-to-br from-blue-900 to-slate-900'
          : 'border-rose-500/60 bg-rose-950/60',
      iconColor:
        schoolEntry.penalty_points_deducted === 0 ? 'text-blue-300' : 'text-rose-400',
      tag: schoolEntry.penalty_points_deducted === 0 ? '0 Deductions' : `-${schoolEntry.penalty_points_deducted} pts`,
      desc: 'Passed the 10% random micro audit with zero fraud flags or location penalties.',
    },
    {
      id: 'active-crew',
      name: 'Circular Committee',
      category: 'Youth Leadership',
      unlocked: club.active_members_count >= 10,
      icon: Users,
      glow: 'shadow-[0_0_18px_rgba(167,139,250,0.4)]',
      border:
        club.active_members_count >= 10
          ? 'border-indigo-400/60 bg-gradient-to-br from-indigo-900 to-slate-900'
          : 'border-white/15 bg-white/5 opacity-60',
      iconColor: club.active_members_count >= 10 ? 'text-indigo-300' : 'text-white/40',
      tag: `${club.active_members_count} Students`,
      desc: 'Active student committee driving collection, sales, and ledger reporting.',
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6">
      {/* ====================================================================
       * Hero Section: Prominent Badges, Rank, Level & Gamified Progress
       * ==================================================================== */}
      <section className="relative overflow-hidden rounded-[24px_24px_24px_6px] bg-gradient-to-br from-[#004B82] via-[#005FA3] to-[#0A3D66] p-6 sm:p-8 text-white shadow-lg border border-white/20">
        {/* Subtle Ambient Background Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#9CF2F2]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Top Header Row: School Identity & Rank Spotlight */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/15">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* National Rank Spotlight */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9CF2F2] text-[#005FA3] font-mono text-xs font-bold shadow-xs animate-pulse-subtle">
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>National Rank #{schoolEntry.rank} of 15</span>
              </div>

              {/* Current Tier Pill */}
              <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/25">
                Level {tierConfig.level} • {tierConfig.tierName}
              </span>

              {/* School Code Chip */}
              <span className="px-3 py-1 rounded-full bg-black/20 text-[#9CF2F2] text-xs font-mono font-bold">
                {school.code} • {school.city}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-[var(--font-jakarta)]">
              {school.name} — {club.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed">
              {club.tagline} • Lead:{' '}
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
        <div className="relative z-10 py-6 space-y-3">
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

          {/* Progress Track */}
          <div className="relative w-full h-4 rounded-full bg-black/35 overflow-hidden p-0.5 border border-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#9CF2F2] via-emerald-300 to-[#9CF2F2] transition-all duration-700 shadow-[0_0_12px_rgba(156,242,242,0.8)] relative"
              style={{ width: `${tierConfig.progressPct}%` }}
            >
              {/* Shimmer light bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-badge-shine" />
            </div>
          </div>

          {/* Tier Milestones Row */}
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
        <div className="relative z-10 mb-6 p-4 rounded-2xl bg-white/12 backdrop-blur-md border border-white/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        {/* Prominent Badges Showcase Row (Top of Dashboard) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#9CF2F2]" />
              <h2 className="text-base sm:text-lg font-bold text-white font-[var(--font-jakarta)]">
                School Achievement Badges ({unlockedCount}/{badges.length} Unlocked)
              </h2>
            </div>
            <span className="text-xs text-white/75">
              Hover badges to inspect milestones
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className={`group relative p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between items-center text-center ${
                    b.border
                  } ${
                    b.unlocked
                      ? `${b.glow} hover:scale-110 hover:-translate-y-1`
                      : 'hover:opacity-80'
                  }`}
                  title={`${b.name}: ${b.desc}`}
                >
                  {/* Badge Unlocked Check / Lock Icon */}
                  <div className="absolute top-2 right-2">
                    {b.unlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#9CF2F2]" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-white/40" />
                    )}
                  </div>

                  {/* Animated Badge Icon Container */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center my-1.5 transition-transform duration-300 ${
                      b.unlocked
                        ? 'bg-white/15 group-hover:rotate-12'
                        : 'bg-white/5'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${b.iconColor} ${
                        b.id === 'gps-guardian' && b.unlocked ? 'animate-spin-slow' : ''
                      } ${
                        b.id === 'zero-waste' && b.unlocked ? 'animate-pulse-subtle' : ''
                      }`}
                    />
                  </div>

                  <div className="w-full">
                    <div className="text-xs font-bold text-white truncate">
                      {b.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#9CF2F2] mt-0.5 truncate">
                      {b.tag}
                    </div>
                  </div>

                  {/* Hover Tooltip / Detail Overlay */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-xl bg-slate-950 text-white text-[11px] leading-snug shadow-xl border border-white/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <div className="font-bold text-[#9CF2F2]">{b.name}</div>
                    <div className="text-[10px] text-white/70 mt-0.5">{b.desc}</div>
                    <div className="mt-1 text-[10px] font-semibold text-emerald-400">
                      {b.unlocked ? '✓ Unlocked & Active' : '🔒 Locked Milestone'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
       * 4 Core Live KPI Cards (Waste, Sales, Unlocked Grant, Rivalry)
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
            {formatLkr(
              school.seed_funding_base_usd + schoolEntry.topoff_funding_amount_usd
            )}
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
              <span className="text-emerald-700 font-extrabold">
                Leading #1 in Sri Lanka!
              </span>
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
    </div>
  );
}
