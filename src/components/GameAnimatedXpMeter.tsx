'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Award,
  Check,
  ChevronRight,
  Crown,
  Flame,
  Lock,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

export interface GameAnimatedXpMeterProps {
  currentScore: number;
  targetScore: number;
  level: number;
  tierName: string;
  nextTierName: string;
  pointsRemaining: number;
  schoolCode?: string;
  onLogActivityClick?: () => void;
}

interface MilestoneNode {
  level: number;
  label: string;
  shortName: string;
  points: number;
  grantUnlockedLkr: string;
  grantUnlockedUsd: number;
  badgeTone: 'emerald' | 'silver' | 'gold' | 'platinum';
}

const MILESTONES: MilestoneNode[] = [
  {
    level: 1,
    label: 'Level 1: Rising Green Club',
    shortName: 'Rising',
    points: 0,
    grantUnlockedLkr: 'Rs. 450,000 Base Seed',
    grantUnlockedUsd: 1500,
    badgeTone: 'emerald',
  },
  {
    level: 2,
    label: 'Level 2: Silver Upcycler',
    shortName: 'Silver',
    points: 260,
    grantUnlockedLkr: 'Rs. 450,000 Top-Off',
    grantUnlockedUsd: 1500,
    badgeTone: 'silver',
  },
  {
    level: 3,
    label: 'Level 3: Gold Eco-Warrior',
    shortName: 'Gold',
    points: 340,
    grantUnlockedLkr: 'Rs. 750,000 Top-Off',
    grantUnlockedUsd: 2500,
    badgeTone: 'gold',
  },
  {
    level: 4,
    label: 'Level 4: Platinum Eco-Enterprise',
    shortName: 'Platinum',
    points: 420,
    grantUnlockedLkr: 'Rs. 1,050,000 Max Grant',
    grantUnlockedUsd: 3500,
    badgeTone: 'platinum',
  },
];

export function GameAnimatedXpMeter({
  currentScore,
  targetScore = 500,
  level,
  tierName,
  nextTierName,
  pointsRemaining,
  schoolCode = 'SCH-01',
  onLogActivityClick,
}: GameAnimatedXpMeterProps) {
  // Bonus score for interactive simulator / surge demo
  const [bonusXp, setBonusXp] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [isSurging, setIsSurging] = useState(false);

  const effectiveScore = Number((currentScore + bonusXp).toFixed(1));
  const maxScaleScore = 500; // Uniform scale up to Platinum Max
  const rawProgressPct = Math.min(100, Math.max(3, (effectiveScore / maxScaleScore) * 100));

  // Animated counting values
  const [displayedScore, setDisplayedScore] = useState(0);
  const [fillPct, setFillPct] = useState(0);
  const [laggingPct, setLaggingPct] = useState(0);

  // Play synthetic arcade sound using Web Audio API
  const playArcadeTone = (type: 'surge' | 'milestone' | 'tick') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'surge') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'milestone') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // AudioContext policy safe fallback
    }
  };

  // Smooth ease-out ticker animation
  useEffect(() => {
    let animationFrameId: number;
    const startVal = displayedScore;
    const endVal = effectiveScore;
    const startTime = performance.now();
    const duration = 1200; // 1.2s smooth roll-up

    const animateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Quad ease-out formula
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Number((startVal + (endVal - startVal) * easeOut).toFixed(1));
      setDisplayedScore(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateNumber);
      } else {
        setDisplayedScore(endVal);
      }
    };

    animationFrameId = requestAnimationFrame(animateNumber);
    return () => cancelAnimationFrame(animationFrameId);
  }, [effectiveScore]);

  // Handle Fill bar & Lagging Ghost bar animation
  useEffect(() => {
    // Primary bar animates immediately
    const timer1 = setTimeout(() => {
      setFillPct(rawProgressPct);
    }, 50);

    // Lagging ghost bar follows with satisfying delay
    const timer2 = setTimeout(() => {
      setLaggingPct(rawProgressPct);
    }, 380);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [rawProgressPct]);

  // Trigger interactive +25 XP surge
  const handleTriggerSurge = () => {
    setIsSurging(true);
    playArcadeTone('surge');
    setBonusXp((prev) => (prev >= 100 ? 0 : prev + 25));

    setTimeout(() => {
      setIsSurging(false);
    }, 1200);
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-[#081B30]/95 via-[#061426]/95 to-[#040C1A]/95 p-5 sm:p-6 border border-[#9CF2F2]/30 shadow-[0_12px_36px_rgba(0,15,35,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white overflow-hidden">
      {/* Background Cybernetic Circuit Lines & Diagonal Carbon Stripes */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(156,242,242,0.06) 0px, rgba(156,242,242,0.06) 6px, transparent 6px, transparent 14px)',
        }}
      />

      {/* Radiant Auroral Glow Orb */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#00F0FF]/20 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{
          transform: isSurging
            ? 'translateX(-50%) scale(1.4)'
            : 'translateX(-50%) scale(1)',
          opacity: isSurging ? 0.45 : 0.25,
        }}
      />

      {/* Top Status Header: Level Badge, XP Ticker, Audio & Surge Simulator */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Animated Level Jewel Medallion */}
          <div className="relative flex items-center justify-center">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#9CF2F2] via-[#005FA3] to-[#041E42] p-0.5 shadow-[0_0_16px_rgba(156,242,242,0.45)]">
              <div className="w-full h-full rounded-[14px] bg-[#07192C] flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#9CF2F2]/80 leading-none">
                  LVL
                </span>
                <span className="text-xl font-extrabold text-white font-mono leading-tight">
                  {level}
                </span>
              </div>
            </div>

            {/* Glowing Accent Sparks */}
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping opacity-75" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-300 flex items-center justify-center text-[8px] text-amber-950 font-black">
              ★
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9CF2F2] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                <span>{tierName}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                1.5x ACTIVE
              </span>
            </div>
            <div className="text-xs text-white/70 mt-0.5">
              Next unlock:{' '}
              <strong className="text-white font-medium">{nextTierName}</strong>
            </div>
          </div>
        </div>

        {/* Live Arcade XP Display & Interactive Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live Roll-up Counter */}
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/60">
              Current Green XP
            </div>
            <div className="flex items-baseline justify-end gap-1 font-mono">
              <span
                className={`text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#9CF2F2] to-emerald-300 transition-transform duration-300 ${
                  isSurging ? 'scale-110 drop-shadow-[0_0_12px_#00F0FF]' : ''
                }`}
              >
                {displayedScore.toFixed(1)}
              </span>
              <span className="text-xs text-[#9CF2F2]/80 font-bold">/ 500 XP</span>
            </div>
          </div>

          {/* Interactive "+25 XP Surge" Test Button */}
          <button
            onClick={handleTriggerSurge}
            title="Click to test the animated XP fill-up surge"
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#005FA3] to-[#00A896] hover:from-[#0070BF] hover:to-[#02C39A] text-white text-xs font-bold font-mono tracking-tight shadow-[0_0_14px_rgba(0,168,150,0.4)] border border-[#9CF2F2]/40 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
            <span>{isSurging ? '+25 XP SURGING!' : '+25 XP Demo'}</span>
          </button>

          {/* Audio FX Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Disable game SFX' : 'Enable arcade game SFX'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#9CF2F2]/20 border-[#9CF2F2] text-[#9CF2F2]'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ====================================================================
       * The Modern Game XP Fill-Up Meter Bar Container
       * ==================================================================== */}
      <div className="relative z-10 pt-5 pb-3">
        {/* Progress Bar Label & Gap Text */}
        <div className="flex items-center justify-between text-xs mb-2.5">
          <span className="font-bold text-[#9CF2F2] flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>
              {pointsRemaining > 0
                ? `${pointsRemaining} pts to reach ${nextTierName}`
                : '★ Top National Platinum Status Achieved!'}
            </span>
          </span>

          <span className="font-mono text-white/80 font-semibold text-[11px] sm:text-xs">
            {rawProgressPct.toFixed(0)}% FILLED
          </span>
        </div>

        {/* Arcade Outer Beveled Rail Channel */}
        <div className="relative w-full h-8 sm:h-9 rounded-2xl bg-[#030914] p-1.5 border-2 border-white/15 shadow-[inset_0_3px_8px_rgba(0,0,0,0.8),0_0_15px_rgba(0,240,255,0.15)] overflow-visible">
          {/* Internal Notches / Gridlines every 10% */}
          <div className="absolute inset-x-2 inset-y-1.5 flex justify-between pointer-events-none opacity-20 z-0">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((tick) => (
              <div key={tick} className="w-[1px] h-full bg-white/40" />
            ))}
          </div>

          {/* 1. Lagging Amber/White Ghost Trail Bar */}
          <div
            className="absolute left-1.5 top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-amber-400/40 via-amber-200/60 to-white/80 transition-all duration-700 ease-out z-10"
            style={{ width: `calc(${laggingPct}% - 12px)` }}
          />

          {/* 2. Primary Fluid Plasma Animated Fill Bar */}
          <div
            className="absolute left-1.5 top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-[#00A896] via-[#00F0FF] via-emerald-300 to-[#9CF2F2] animate-energy-sweep shadow-[0_0_20px_rgba(0,240,255,0.7)] transition-all duration-500 ease-out z-20 overflow-hidden"
            style={{ width: `calc(${fillPct}% - 12px)` }}
          >
            {/* Diagonal Laser Scanlines moving horizontally */}
            <div
              className="absolute inset-0 animate-laser-scanlines opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 4px, transparent 4px, transparent 10px)',
              }}
            />

            {/* Specular Cylindrical Glass Reflection on Top Edge */}
            <div className="absolute top-0 inset-x-0 h-[35%] bg-gradient-to-b from-white/70 to-transparent rounded-t-xl" />

            {/* Radiant Shimmer Light Wave */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-badge-shine pointer-events-none" />
          </div>

          {/* 3. Leading-Edge Energy Spark Core & Particle Halo */}
          {fillPct > 3 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-500 ease-out"
              style={{ left: `calc(${fillPct}% + 2px)` }}
            >
              {/* Outer Pulsing Flare Ring */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00F0FF]/40 animate-ping absolute -top-1.5 -left-1.5" />

              {/* Glowing Diamond Core */}
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-[0_0_12px_#00F0FF,0_0_24px_#9CF2F2,0_0_40px_#10B981] flex items-center justify-center border border-white/90 animate-spark-flare">
                <div className="w-2 h-2 rounded-full bg-[#005FA3]" />
              </div>

              {/* Spark Star SVG */}
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 absolute -top-1 -left-1 text-white fill-white drop-shadow-[0_0_8px_#9CF2F2] animate-spin-slow opacity-80"
              >
                <path d="M12 0L14 9L23 12L14 15L12 24L10 15L1 12L10 9Z" />
              </svg>
            </div>
          )}

          {/* ================================================================
           * Checkpoint Gem Sockets along the Track
           * Level 1: 0% | Level 2: 52% | Level 3: 68% | Level 4: 84%
           * ================================================================ */}
          {MILESTONES.map((ms) => {
            const nodePct = (ms.points / maxScaleScore) * 100;
            const isUnlocked = effectiveScore >= ms.points;
            const isCurrentTier =
              effectiveScore >= ms.points &&
              (ms.level === 4 || effectiveScore < MILESTONES[ms.level]?.points);

            return (
              <div
                key={ms.level}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-40 group cursor-pointer"
                style={{ left: `${Math.max(4, Math.min(96, nodePct))}%` }}
                onMouseEnter={() => setActiveTooltip(ms.level)}
                onMouseLeave={() => setActiveTooltip(null)}
                onClick={() => {
                  setActiveTooltip(activeTooltip === ms.level ? null : ms.level);
                  if (isUnlocked) playArcadeTone('milestone');
                }}
              >
                {/* Milestone Node Gem */}
                <div
                  className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-white via-[#9CF2F2] to-[#00A896] text-[#041E42] shadow-[0_0_14px_rgba(156,242,242,0.9)] scale-110 border-2 border-white'
                      : 'bg-[#0A1A2F] text-white/40 border border-white/20 shadow-inner'
                  } ${isCurrentTier ? 'animate-node-pulse' : ''}`}
                >
                  {isUnlocked ? (
                    ms.level === 4 ? (
                      <Crown className="w-3.5 h-3.5 fill-current text-amber-900" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )
                  ) : (
                    <Lock className="w-3 h-3 text-white/50" />
                  )}
                </div>

                {/* Milestone Tooltip Popover */}
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 w-52 p-3 rounded-xl bg-[#041122]/95 backdrop-blur-md border border-[#9CF2F2]/40 shadow-[0_8px_24px_rgba(0,0,0,0.8)] pointer-events-none transition-all duration-200 z-50 text-center ${
                    activeTooltip === ms.level
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-1 scale-95'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#9CF2F2]">
                    {ms.label}
                  </div>
                  <div className="text-xs font-extrabold text-white mt-0.5">
                    {ms.points} XP Required
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[11px] text-emerald-300 font-semibold flex items-center justify-center gap-1">
                    <Award className="w-3 h-3 text-amber-300" />
                    <span>{ms.grantUnlockedLkr}</span>
                  </div>
                  <div className="text-[10px] text-white/60 mt-0.5">
                    {isUnlocked ? '✅ Unlocked & Active' : `🔒 Needs ${(ms.points - effectiveScore).toFixed(1)} more pts`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestone Labels Underneath the Bar */}
        <div className="relative flex items-center justify-between text-[11px] font-mono text-white/70 pt-2.5 px-1">
          {MILESTONES.map((ms) => {
            const isUnlocked = effectiveScore >= ms.points;
            return (
              <div
                key={ms.level}
                className={`text-center cursor-pointer transition-colors ${
                  isUnlocked ? 'text-[#9CF2F2] font-bold' : 'text-white/50'
                }`}
                onClick={() => setActiveTooltip(ms.level)}
              >
                <div className="text-[10px] sm:text-xs">
                  {ms.shortName} ({ms.points} XP)
                </div>
                <div className="hidden sm:block text-[9px] text-white/50 font-normal">
                  {ms.grantUnlockedLkr.split(' ')[1]} {ms.grantUnlockedLkr.split(' ')[2]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer: Next Milestone Reward Banner & Call to Action */}
      <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-white/85 text-[11px] sm:text-xs">
            {level === 4
              ? '🎉 Maximum National Tier Achieved: Full Rs. 1,050,000 top-off funding unlocked!'
              : `Next Reward: Reaching ${nextTierName} unlocks top-off funding & national seal.`}
          </span>
        </div>

        {onLogActivityClick && (
          <button
            onClick={onLogActivityClick}
            className="px-3.5 py-1.5 rounded-full bg-[#9CF2F2] hover:bg-white text-[#005FA3] hover:text-[#0B3E6E] text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap self-start sm:self-auto"
          >
            <span>Log Activity for XP</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
