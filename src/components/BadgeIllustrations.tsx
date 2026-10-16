'use client';

import React from 'react';

interface BadgeIllustrationProps {
  size?: number;
  className?: string;
  unlocked?: boolean;
}

/**
 * 1. EXIF GPS Guardian Badge (Compass Rose & GPS Navigation)
 * Reference style: Circular disc with clean vector emblem
 */
export function BadgeGpsGuardian({ size = 88, className = '', unlocked = true }: BadgeIllustrationProps) {
  if (!unlocked) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
        <circle cx="48" cy="48" r="46" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="48" cy="48" r="32" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M48 24V72M24 48H72" stroke="#94A3B8" strokeWidth="1.5" />
        <rect x="42" y="44" width="12" height="10" rx="2" fill="#94A3B8" />
        <path d="M45 44V40C45 38.3431 46.3431 37 48 37C49.6569 37 51 38.3431 51 40V44" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
      {/* Outer Glow & Disc */}
      <circle cx="48" cy="48" r="46" fill="#0284C7" />
      <circle cx="48" cy="48" r="43" fill="#38BDF8" />
      <circle cx="48" cy="48" r="41" fill="#0284C7" />

      {/* Subtle Compass Ring */}
      <circle cx="48" cy="48" r="33" stroke="#BAE6FD" strokeWidth="2" strokeDasharray="2 3" opacity="0.8" />
      <circle cx="48" cy="48" r="28" stroke="#0369A1" strokeWidth="1" />

      {/* Cardinal Ticks */}
      <path d="M48 12V18M48 78V84M12 48H18M78 48H84" stroke="#E0F2FE" strokeWidth="2.5" strokeLinecap="round" />

      {/* Compass Needle (North = Red/Orange, South = White) */}
      <polygon points="48,22 55,48 48,43" fill="#EF4444" />
      <polygon points="48,22 41,48 48,43" fill="#F87171" />
      <polygon points="48,74 55,48 48,53" fill="#F1F5F9" />
      <polygon points="48,74 41,48 48,53" fill="#CBD5E1" />

      {/* Center Pivot Jewel */}
      <circle cx="48" cy="48" r="5" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="47" cy="47" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 2. 100 kg Zero-Waste Badge (Sprouting Leaf & Circular Recycling Wreath)
 */
export function BadgeZeroWaste({ size = 88, className = '', unlocked = true }: BadgeIllustrationProps) {
  if (!unlocked) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
        <circle cx="48" cy="48" r="46" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <path d="M38 48C38 42.4772 42.4772 38 48 38C53.5228 38 58 42.4772 58 48" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
        <rect x="42" y="44" width="12" height="10" rx="2" fill="#94A3B8" />
        <path d="M45 44V40C45 38.3431 46.3431 37 48 37C49.6569 37 51 38.3431 51 40V44" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
      {/* Outer Disc */}
      <circle cx="48" cy="48" r="46" fill="#047857" />
      <circle cx="48" cy="48" r="43" fill="#10B981" />
      <circle cx="48" cy="48" r="40" fill="#065F46" />

      {/* Circular Arrow Track */}
      <circle cx="48" cy="48" r="32" stroke="#A7F3D0" strokeWidth="2.5" strokeDasharray="28 8" opacity="0.65" />

      {/* Big Sprouting Eco Leaf */}
      <path
        d="M48 24C34 24 28 38 31 54C34 70 48 72 48 72C48 72 62 70 65 54C68 38 62 24 48 24Z"
        fill="#34D399"
      />
      <path
        d="M48 24C41 24 38 38 39.5 54C41 70 48 72 48 72V24Z"
        fill="#10B981"
      />
      {/* Leaf Central Rib & Veins */}
      <path d="M48 28V68" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 38L56 33M48 48L57 43M48 58L55 53" stroke="#064E3B" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M48 38L40 33M48 48L39 43M48 58L41 53" stroke="#064E3B" strokeWidth="1.5" strokeLinecap="round" />

      {/* Small Floating Dew Droplet */}
      <circle cx="56" cy="38" r="2.5" fill="#E0F2FE" />
      <circle cx="55.5" cy="37.5" r="0.8" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 3. Haritha Pola Pioneer Badge (Market Stall & Gold Tokens)
 */
export function BadgePolaPioneer({ size = 88, className = '', unlocked = true }: BadgeIllustrationProps) {
  if (!unlocked) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
        <circle cx="48" cy="48" r="46" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="42" y="44" width="12" height="10" rx="2" fill="#94A3B8" />
        <path d="M45 44V40C45 38.3431 46.3431 37 48 37C49.6569 37 51 38.3431 51 40V44" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
      {/* Outer Gold Sun Disc */}
      <circle cx="48" cy="48" r="46" fill="#D97706" />
      <circle cx="48" cy="48" r="43" fill="#F59E0B" />
      <circle cx="48" cy="48" r="40" fill="#B45309" />

      {/* Inner Floor */}
      <ellipse cx="48" cy="70" rx="28" ry="7" fill="#92400E" opacity="0.4" />

      {/* Pola Market Stall Awning (Green & White Stripes) */}
      <path d="M22 40L26 28H70L74 40H22Z" fill="#15803D" />
      {/* Striped Segments */}
      <path d="M30 28L28 40H36L38 28H30Z" fill="#FFFFFF" />
      <path d="M46 28L44 40H52L54 28H46Z" fill="#FFFFFF" />
      <path d="M62 28L60 40H68L70 28H62Z" fill="#FFFFFF" />

      {/* Scalloped Awning Fringe */}
      <circle cx="27" cy="41" r="3" fill="#15803D" />
      <circle cx="33" cy="41" r="3" fill="#FFFFFF" />
      <circle cx="40" cy="41" r="3" fill="#15803D" />
      <circle cx="47" cy="41" r="3" fill="#FFFFFF" />
      <circle cx="54" cy="41" r="3" fill="#15803D" />
      <circle cx="61" cy="41" r="3" fill="#FFFFFF" />
      <circle cx="68" cy="41" r="3" fill="#15803D" />

      {/* Wooden Counter */}
      <rect x="25" y="44" width="46" height="6" rx="1.5" fill="#78350F" />
      <rect x="27" y="50" width="42" height="16" fill="#92400E" />
      <line x1="27" y1="58" x2="69" y2="58" stroke="#78350F" strokeWidth="1.5" />

      {/* Golden Coin Tokens with Rupee/Star */}
      <circle cx="42" cy="62" r="7" fill="#FBBF24" stroke="#78350F" strokeWidth="1.2" />
      <circle cx="42" cy="62" r="5" fill="#FDE68A" />
      <circle cx="54" cy="60" r="7" fill="#FBBF24" stroke="#78350F" strokeWidth="1.2" />
      <circle cx="54" cy="60" r="5" fill="#FDE68A" />
      <text x="54" y="63" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#78350F">Rs</text>
    </svg>
  );
}

/**
 * 4. National Pitch Star Badge (Expert Panel Golden Trophy)
 */
export function BadgePitchStar({ size = 88, className = '', unlocked = true }: BadgeIllustrationProps) {
  if (!unlocked) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
        <circle cx="48" cy="48" r="46" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="42" y="44" width="12" height="10" rx="2" fill="#94A3B8" />
        <path d="M45 44V40C45 38.3431 46.3431 37 48 37C49.6569 37 51 38.3431 51 40V44" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
      {/* Deep Royal Indigo Disc */}
      <circle cx="48" cy="48" r="46" fill="#1E1B4B" />
      <circle cx="48" cy="48" r="43" fill="#312E81" />
      <circle cx="48" cy="48" r="40" fill="#1E1B4B" />

      {/* Sparkle Glints in Background */}
      <path d="M26 28L28 32L32 34L28 36L26 40L24 36L20 34L24 32L26 28Z" fill="#FDE047" opacity="0.85" />
      <path d="M70 24L71.5 27L74.5 28.5L71.5 30L70 33L68.5 30L65.5 28.5L68.5 27L70 24Z" fill="#FDE047" opacity="0.85" />

      {/* Trophy Handles */}
      <path d="M33 34C24 34 23 48 33 52" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
      <path d="M63 34C72 34 73 48 63 52" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />

      {/* Trophy Cup Body */}
      <path d="M33 30H63V44C63 52 56 58 48 58C40 58 33 52 33 44V30Z" fill="#FBBF24" />
      <path d="M33 30H48V58C40 58 33 52 33 44V30Z" fill="#F59E0B" />

      {/* Cup Lip */}
      <rect x="31" y="27" width="34" height="5" rx="2" fill="#FDE68A" />

      {/* Star Emblazoned on Cup */}
      <polygon points="48,36 50,42 56,42 51,46 53,52 48,48 43,52 45,46 40,42 46,42" fill="#FFFFFF" />

      {/* Stem & Pedestal Base */}
      <rect x="45" y="58" width="6" height="8" fill="#F59E0B" />
      <path d="M38 66H58L60 74H36L38 66Z" fill="#B45309" />
      <rect x="34" y="73" width="28" height="4" rx="1.5" fill="#78350F" />
    </svg>
  );
}

/**
 * 5. Clean Audit Shield Badge (Sheriff / Officer Star Shield Badge)
 * Matching the exact "LIEUTENANT" badge from user reference image!
 */
export function BadgeAuditShield({ size = 88, className = '', unlocked = true }: BadgeIllustrationProps) {
  if (!unlocked) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
        <circle cx="48" cy="48" r="46" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="42" y="44" width="12" height="10" rx="2" fill="#94A3B8" />
        <path d="M45 44V40C45 38.3431 46.3431 37 48 37C49.6569 37 51 38.3431 51 40V44" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
      {/* Warm Orange-Red / Terracotta Background Disc (Reference: Lieutenant badge) */}
      <circle cx="48" cy="48" r="46" fill="#C2410C" />
      <circle cx="48" cy="48" r="43" fill="#EA580C" />
      <circle cx="48" cy="48" r="40" fill="#9A3412" />

      {/* Shield Drop Shadow */}
      <path
        d="M48 20L68 28C68 50 56 68 48 74C40 68 28 50 28 28L48 20Z"
        fill="#7C2D12"
        opacity="0.35"
        transform="translate(2, 3)"
      />

      {/* Golden Officer Star Shield (Two-tone) */}
      <path
        d="M48 18L68 26C68 48 56 66 48 72C40 66 28 48 28 26L48 18Z"
        fill="#FBBF24"
      />
      <path
        d="M48 18L28 26C28 48 40 66 48 72V18Z"
        fill="#F59E0B"
      />

      {/* Inner Inset Shield Border */}
      <path
        d="M48 24L62 30C62 46 52 59 48 64C44 59 34 46 34 30L48 24Z"
        fill="#FDE68A"
      />
      <path
        d="M48 24L34 30C34 46 44 59 48 64V24Z"
        fill="#FBBF24"
      />

      {/* Embossed Officer Star in Center */}
      <polygon
        points="48,34 51,42 59,42 53,47 55,55 48,50 41,55 43,47 37,42 45,42"
        fill="#F59E0B"
        stroke="#78350F"
        strokeWidth="1.2"
      />
      <polygon
        points="48,34 45,42 37,42 43,47 41,55 48,50"
        fill="#D97706"
      />
      <circle cx="48" cy="46" r="2" fill="#FEF3C7" />
    </svg>
  );
}

/**
 * 6. Circular Committee Badge (Graduation Cap & Bubbles)
 * Matching the exact "BUBBLE MAKER" badge from user reference image!
 */
export function BadgeCommittee({ size = 88, className = '', unlocked = true }: BadgeIllustrationProps) {
  if (!unlocked) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
        <circle cx="48" cy="48" r="46" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="42" y="44" width="12" height="10" rx="2" fill="#94A3B8" />
        <path d="M45 44V40C45 38.3431 46.3431 37 48 37C49.6569 37 51 38.3431 51 40V44" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
      {/* Light Warm Buttercup / Yellow Background Disc (Reference: Bubble Maker) */}
      <circle cx="48" cy="48" r="46" fill="#D97706" />
      <circle cx="48" cy="48" r="43" fill="#FDE047" />
      <circle cx="48" cy="48" r="40" fill="#FEF08A" />

      {/* Floating Bubbles */}
      <circle cx="70" cy="30" r="7" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" opacity="0.9" />
      <circle cx="68" cy="28" r="2" fill="#FFFFFF" />

      <circle cx="66" cy="44" r="5" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.8" opacity="0.9" />
      <circle cx="64.5" cy="42.5" r="1.5" fill="#FFFFFF" />

      {/* Big Central Bubble with Mortarboard / Student Cap */}
      <circle cx="44" cy="54" r="18" fill="#BAE6FD" stroke="#0369A1" strokeWidth="2.5" />
      <ellipse cx="40" cy="46" rx="6" ry="3" fill="#FFFFFF" opacity="0.8" transform="rotate(-30 40 46)" />

      {/* Graduation Mortarboard / Cap (Navy Blue) */}
      <polygon points="44,28 62,34 44,40 26,34" fill="#0F172A" />
      <polygon points="44,28 44,40 26,34" fill="#1E293B" />
      {/* Cap Skull Underneath */}
      <path d="M33 37V44C33 48 38 51 44 51C50 51 55 48 55 44V37" fill="#0F172A" />
      {/* Hanging Gold Tassel */}
      <path d="M44 34L30 42" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="29" cy="43" r="2" fill="#F59E0B" />
    </svg>
  );
}

/**
 * 7. Universal Illustrated Level Medal (Level 1, 2, 3, 4)
 * Matching the exact "Level 16", "Level 15", "Level 14", "Level 13" from reference image!
 */
export interface BadgeLevelMedalProps extends BadgeIllustrationProps {
  levelNumber: number;
  levelName?: string;
  theme?: 'orange' | 'yellow' | 'teal' | 'navy' | 'blue' | 'cream';
}

export function BadgeLevelMedal({
  levelNumber,
  size = 88,
  className = '',
  unlocked = true,
  theme = 'blue',
}: BadgeLevelMedalProps) {
  const themeColors = {
    orange: {
      disc: '#38BDF8',
      ribbon: '#EA580C',
      ribbonFold: '#C2410C',
      medalRim: '#F97316',
      medalInner: '#CCFBF1',
      number: '#14B8A6',
    },
    yellow: {
      disc: '#CBD5E1',
      ribbon: '#FACC15',
      ribbonFold: '#CA8A04',
      medalRim: '#EAB308',
      medalInner: '#FEF3C7',
      number: '#DC2626',
    },
    cream: {
      disc: '#E2E8F0',
      ribbon: '#78350F',
      ribbonFold: '#451A03',
      medalRim: '#92400E',
      medalInner: '#D6D3D1',
      number: '#44403C',
    },
    teal: {
      disc: '#99F6E4',
      ribbon: '#0D9488',
      ribbonFold: '#115E59',
      medalRim: '#0F766E',
      medalInner: '#F0FDFA',
      number: '#0F766E',
    },
    blue: {
      disc: '#0284C7',
      ribbon: '#FACC15',
      ribbonFold: '#EAB308',
      medalRim: '#FDE047',
      medalInner: '#FFFFFF',
      number: '#0284C7',
    },
    navy: {
      disc: '#1E3A8A',
      ribbon: '#E2E8F0',
      ribbonFold: '#94A3B8',
      medalRim: '#CBD5E1',
      medalInner: '#F1F5F9',
      number: '#1E293B',
    },
  }[theme];

  if (!unlocked) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
        <circle cx="48" cy="48" r="46" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="48" cy="54" r="22" fill="#CBD5E1" />
        <text x="48" y="60" fontSize="18" fontWeight="bold" textAnchor="middle" fill="#94A3B8" fontFamily="Inter, sans-serif">
          {levelNumber}
        </text>
        <rect x="42" y="24" width="12" height="10" rx="2" fill="#94A3B8" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className}>
      {/* Background Disc */}
      <circle cx="48" cy="48" r="46" fill={themeColors.disc} />

      {/* Hanging Neck Ribbon (Angled Tails Meeting at Top) */}
      <path d="M34 16L40 40H26L20 16H34Z" fill={themeColors.ribbonFold} />
      <path d="M62 16L56 40H70L76 16H62Z" fill={themeColors.ribbonFold} />
      <path d="M34 16L48 44L62 16H48L34 16Z" fill={themeColors.ribbon} />

      {/* Ribbon Loop Ring / Bracket */}
      <rect x="36" y="38" width="24" height="6" rx="3" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />

      {/* Medal Medallion */}
      <circle cx="48" cy="58" r="24" fill={themeColors.medalRim} />
      <circle cx="48" cy="58" r="20" fill="#FFFFFF" />
      <circle cx="48" cy="58" r="18" fill={themeColors.medalInner} />

      {/* Inner Concentric Ring */}
      <circle cx="48" cy="58" r="16" stroke={themeColors.medalRim} strokeWidth="1" strokeDasharray="3 2" />

      {/* Bold Level Number */}
      <text
        x="48"
        y="65"
        fontSize="20"
        fontWeight="800"
        textAnchor="middle"
        fill={themeColors.number}
        fontFamily="var(--font-jakarta), Inter, sans-serif"
      >
        {levelNumber}
      </text>
    </svg>
  );
}
