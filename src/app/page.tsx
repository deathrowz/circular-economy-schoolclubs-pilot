'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Building2,
  Recycle,
  ShieldCheck,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { LeaderboardView } from '@/components/LeaderboardView';
import { ClubProfilesView } from '@/components/ClubProfilesView';
import { VerificationEngineView } from '@/components/VerificationEngineView';
import { TelegramBotWorkbench } from '@/components/TelegramBotWorkbench';
import { HealthRiskDashboardView } from '@/components/HealthRiskDashboardView';
import { fetchPlatformSnapshotClient } from '@/lib/client/platform-bridge';
import {
  AuditLogEntry,
  Club,
  GamificationConfig,
  HealthRiskAlert,
  ImpactLog,
  LeaderboardSchoolScore,
  School,
  TelegramBotOutboundMessage,
  UserProfile,
} from '@/types/domain';

type NavTab =
  | 'leaderboard'
  | 'clubs'
  | 'verification'
  | 'telegram_bot'
  | 'health_risk';

interface SnapshotData {
  schools: School[];
  clubs: Club[];
  users: UserProfile[];
  impactLogs: ImpactLog[];
  auditLogs: AuditLogEntry[];
  gamificationConfig: GamificationConfig;
  telegramMessages: TelegramBotOutboundMessage[];
  leaderboard: LeaderboardSchoolScore[];
  healthAlerts: HealthRiskAlert[];
}

export default function PlatformDashboardPage() {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('leaderboard');
  const [activeUserId, setActiveUserId] = useState<string>('usr-teacher-01');
  const [selectedClubId, setSelectedClubId] = useState<string>('club-01');

  useEffect(() => {
    fetchPlatformSnapshotClient().then((data) => setSnapshot(data));
  }, []);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#E6F1FA] flex items-center justify-center p-6">
        <div className="hai-card px-6 py-4 flex items-center gap-3 text-[#005FA3] font-semibold text-sm shadow-xs">
          <Recycle className="w-5 h-5 animate-spin" />
          <span>Loading Haritha Pasal • Sri Lanka School Circular Index...</span>
        </div>
      </div>
    );
  }

  const activeUser =
    snapshot.users.find((u) => u.id === activeUserId) || snapshot.users[3];

  const pendingTeacherCount = snapshot.impactLogs.filter(
    (l) => l.status === 'pending'
  ).length;
  const pendingExpertCount = snapshot.impactLogs.filter(
    (l) =>
      l.status === 'pending_expert_review' ||
      (l.random_audit_selected && l.audit_status === 'pending_audit')
  ).length;

  const navMeta: Record<
    NavTab,
    { eyebrow: string; title: string; subtitle: string; badge?: string | number }
  > = {
    leaderboard: {
      eyebrow: 'Haritha Pasal • 2026 National Pilot Report',
      title: 'Sri Lanka School Circular Index',
      subtitle:
        'Tracking verified school waste recycled (kg), student enterprise sales (Rs.), and top-off seed funding across 15 participating Sri Lankan schools.',
      badge: '15 Schools',
    },
    clubs: {
      eyebrow: 'Participating Schools & Student Enterprises',
      title: 'School Clubs & Projects',
      subtitle:
        'Explore each school’s circular-economy enterprise, student office bearers, teacher-in-charge, and verified recycling & sales ledger.',
    },
    verification: {
      eyebrow: 'Two-Tier School Validation Loop',
      title: 'Teacher & National Panel Approvals',
      subtitle:
        'Teachers endorse campus activities up to Rs. 15,000 immediately. The National Panel scores larger sales (> Rs. 15,000) and audits a 10% sample.',
      badge: pendingTeacherCount + pendingExpertCount,
    },
    telegram_bot: {
      eyebrow: 'Student Data Entry (@HarithaPasalBot)',
      title: 'Telegram Activity Submission',
      subtitle:
        'Students submit uncompressed activity photos as Documents/Files via Telegram (/log_impact) to verify school GPS coordinates, waste (kg), and sales (Rs.).',
    },
    health_risk: {
      eyebrow: 'Program Integrity & Governance',
      title: 'School Activity Alerts & Audit Log',
      subtitle:
        'Automated monitoring for inactive school clubs (>14 days), off-campus photo GPS coordinates, and high sales reported with zero recycled waste.',
      badge: snapshot.healthAlerts.length,
    },
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'leaderboard', label: 'School Index', icon: Trophy, count: 15 },
    { id: 'clubs', label: 'School Clubs', icon: Building2 },
    {
      id: 'verification',
      label: 'Approvals',
      icon: ShieldCheck,
      count: pendingTeacherCount + pendingExpertCount,
    },
    { id: 'telegram_bot', label: 'Telegram Bot', icon: Bot },
    {
      id: 'health_risk',
      label: 'School Alerts',
      icon: Activity,
      count: snapshot.healthAlerts.length,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#E6F1FA] text-[#111010]">
      {/* ====================================================================
       * Top Horizontal SiteHeaderUI (hai.stanford.edu/ai-index + Figma #1:379744)
       * ==================================================================== */}
      <header className="sticky top-0 z-30 bg-[#E6F1FA]/95 backdrop-blur-xs border-b border-[#111010]/15">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          {/* Left: Stanford HAI Style Editorial Lockup */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-[12px_12px_12px_2px] bg-[#005FA3] text-[#9CF2F2] flex items-center justify-center shadow-xs group-hover:bg-[#0B3E6E] transition">
                <Recycle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-base sm:text-lg font-bold tracking-tight text-[#111010] leading-none">
                    Haritha Pasal
                  </div>
                  <div className="text-[11px] font-medium text-[#111010]/70 mt-0.5">
                    Sri Lanka
                  </div>
                </div>
                <div className="h-7 w-px bg-[#111010]/20 hidden sm:block" />
                <div className="hidden sm:block text-sm font-medium text-[#005FA3]">
                  School Circular Index
                </div>
              </div>
            </button>
          </div>

          {/* Center: Horizontal Navigation Tabs */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-1.5"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    isActive
                      ? 'bg-[#005FA3] text-[#9CF2F2]'
                      : 'text-[#111010]/80 hover:bg-[#9CF2F2]/60 hover:text-[#005FA3]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-[#9CF2F2] text-[#005FA3]'
                          : 'bg-[#FFFFFF] text-[#005FA3]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Active Role Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#111010]/60 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#005FA3]" />
                Active Account ({activeUser.role.replace('_', ' ')})
              </span>
            </div>
            <select
              value={activeUser.id}
              onChange={(e) => setActiveUserId(e.target.value)}
              aria-label="Switch User Account"
              className="hai-input px-3 py-2 text-xs font-semibold text-[#111010] cursor-pointer max-w-[230px]"
            >
              {snapshot.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Strip */}
        <div className="lg:hidden border-t border-[#111010]/10 px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-[#005FA3] text-[#9CF2F2]'
                    : 'bg-[#FFFFFF] text-[#111010]/80 border border-[#111010]/15'
                }`}
              >
                {item.label}
                {item.count !== undefined ? ` (${item.count})` : ''}
              </button>
            );
          })}
        </div>
      </header>

      {/* ====================================================================
       * Main Editorial Page Container (hai.stanford.edu/ai-index Grid)
       * ==================================================================== */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-16 space-y-8 sm:space-y-10">
        {/* Stanford HAI AI Index Editorial PageHeader */}
        <section className="pb-8 border-b border-[#111010]/15">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#005FA3]">
              {navMeta[activeTab].eyebrow}
            </span>
            {navMeta[activeTab].badge !== undefined && (
              <span className="hai-cyan-pill text-xs font-bold">
                {navMeta[activeTab].badge}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-7">
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] leading-[1.04] text-[#111010] font-[var(--font-jakarta)]">
                {navMeta[activeTab].title}
              </h1>
            </div>
            <div className="lg:col-span-5">
              <p className="text-sm sm:text-base text-[#111010]/75 leading-relaxed">
                {navMeta[activeTab].subtitle}
              </p>
            </div>
          </div>
        </section>

        {/* Active View Content */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            leaderboard={snapshot.leaderboard}
            config={snapshot.gamificationConfig}
            onSelectClubProfile={(clubId) => {
              setSelectedClubId(clubId);
              setActiveTab('clubs');
            }}
            onOpenTelegramWorkbench={() => setActiveTab('telegram_bot')}
            onOpenVerification={() => setActiveTab('verification')}
          />
        )}

        {activeTab === 'clubs' && (
          <ClubProfilesView
            clubs={snapshot.clubs}
            impactLogs={snapshot.impactLogs}
            activeUser={activeUser}
            selectedClubId={selectedClubId}
            onSelectClub={setSelectedClubId}
          />
        )}

        {activeTab === 'verification' && (
          <VerificationEngineView
            activeUser={activeUser}
            users={snapshot.users}
            schools={snapshot.schools}
            impactLogs={snapshot.impactLogs}
            config={snapshot.gamificationConfig}
            onSwitchUser={setActiveUserId}
            onRefreshSnapshot={setSnapshot}
          />
        )}

        {activeTab === 'telegram_bot' && (
          <TelegramBotWorkbench
            clubs={snapshot.clubs}
            schools={snapshot.schools}
            users={snapshot.users}
            impactLogs={snapshot.impactLogs}
            telegramMessages={snapshot.telegramMessages}
            onRefreshSnapshot={setSnapshot}
            onNavigateToVerification={() => setActiveTab('verification')}
          />
        )}

        {activeTab === 'health_risk' && (
          <HealthRiskDashboardView
            healthAlerts={snapshot.healthAlerts}
            auditLogs={snapshot.auditLogs}
            onInspectClub={(clubId) => {
              setSelectedClubId(clubId);
              setActiveTab('clubs');
            }}
            onNavigateToVerification={() => {
              setActiveUserId('usr-expert-01');
              setActiveTab('verification');
            }}
          />
        )}

        {/* ====================================================================
         * Stanford HAI AI Index Style White Asymmetric Footer Card
         * ==================================================================== */}
        <footer className="hai-card p-6 sm:p-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px_8px_8px_2px] bg-[#005FA3] text-[#9CF2F2] flex items-center justify-center">
                  <Recycle className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-[#111010]">
                  Haritha Pasal • Sri Lanka School Circular Index
                </span>
              </div>
              <p className="text-xs text-[#111010]/70 leading-relaxed max-w-md">
                A national circular-economy pilot across 15 Sri Lankan schools. Empowering student-led recycling enterprises with transparent metrics and performance-based seed grants.
              </p>
            </div>

            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="hai-chrome-box p-3.5">
                <div className="font-bold text-[#005FA3] uppercase tracking-wider text-[10px]">
                  1. Students (Telegram)
                </div>
                <p className="text-[#111010]/80 mt-1">
                  Send uncompressed activity photos as Files on Telegram to log waste (kg) and sales (Rs.).
                </p>
              </div>
              <div className="hai-chrome-box p-3.5">
                <div className="font-bold text-[#005FA3] uppercase tracking-wider text-[10px]">
                  2. Teachers (≤ Rs. 15,000)
                </div>
                <p className="text-[#111010]/80 mt-1">
                  Verify on-campus student logs up to Rs. 15,000 to award school points immediately.
                </p>
              </div>
              <div className="hai-chrome-box p-3.5">
                <div className="font-bold text-[#005FA3] uppercase tracking-wider text-[10px]">
                  3. National Panel (&gt; Rs. 15,000)
                </div>
                <p className="text-[#111010]/80 mt-1">
                  Score larger school sales across 6 criteria and unlock top-off seed funding in Rs.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
