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
      <div className="min-h-screen bg-[#0C111D] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[#14C7C3] font-semibold text-sm">
          <Recycle className="w-6 h-6 animate-spin" />
          <span>Loading Sri Lanka 15-School Circular Enterprise Dashboard...</span>
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
    { title: string; subtitle: string; badge?: string | number }
  > = {
    leaderboard: {
      title: 'Sri Lanka School Circular Leaderboard',
      subtitle:
        'Tracking waste recycled (kg), student sales (Rs.), and seed grants across 15 pilot schools',
      badge: '15 Schools',
    },
    clubs: {
      title: 'School Clubs & Student Projects',
      subtitle:
        'Simple overview of each school club, student office bearers, and verified sales & recycling logs',
    },
    verification: {
      title: 'Teacher & National Panel Approvals',
      subtitle:
        'Teachers verify school activities (≤ Rs. 15,000) • National Panel scores larger sales (> Rs. 15,000) & 10% audits',
      badge: pendingTeacherCount + pendingExpertCount,
    },
    telegram_bot: {
      title: 'Student Telegram Submission Bot',
      subtitle:
        'Students send uncompressed activity photos via Telegram (/log_impact) to log waste (kg) and sales (Rs.)',
    },
    health_risk: {
      title: 'School Activity Alerts & Audit Log',
      subtitle:
        'Flags inactive clubs (>14 days), off-campus photos, and high sales with zero recycled material',
      badge: snapshot.healthAlerts.length,
    },
  };

  return (
    <div className="min-h-screen flex bg-[#0C111D] text-[#E0FFF9]">
      {/* Left Sidebar Navigation */}
      <aside className="w-64 shrink-0 bg-[#0C111D] border-r border-[#1F242F] flex flex-col justify-between sticky top-0 h-screen hidden lg:flex">
        <div className="p-4 space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-lg bg-[#1C2126] border border-[#095856] flex items-center justify-center text-[#14C7C3] shadow-sm shrink-0">
              <Recycle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-[#E0FFF9] font-[var(--font-jakarta)] truncate">
                  Haritha Pasal
                </span>
                <span className="figma-emerald-pill px-1.5 py-0.2 text-[10px] font-mono">
                  LK
                </span>
              </div>
              <p className="text-[11px] text-[#B8F4F3] truncate">
                15-School Circular Pilot
              </p>
            </div>
          </div>

          {/* Primary Navigation Items */}
          <nav className="space-y-1.5">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#94969C]">
              School Dashboard
            </div>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`w-full px-3 py-2.5 rounded-md text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-[#1F242F] text-[#ECECED] border-l-2 border-[#14C7C3]'
                  : 'text-[#94969C] hover:bg-[#161B26] hover:text-[#ECECED]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Trophy
                  className={`w-4 h-4 ${
                    activeTab === 'leaderboard' ? 'text-[#14C7C3]' : 'text-[#94969C]'
                  }`}
                />
                <span>School Leaderboard</span>
              </span>
              <span className="figma-code-chip px-1.5 py-0.5 text-[10px] font-mono text-[#B8F4F3]">
                15
              </span>
            </button>

            <button
              onClick={() => setActiveTab('clubs')}
              className={`w-full px-3 py-2.5 rounded-md text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                activeTab === 'clubs'
                  ? 'bg-[#1F242F] text-[#ECECED] border-l-2 border-[#14C7C3]'
                  : 'text-[#94969C] hover:bg-[#161B26] hover:text-[#ECECED]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Building2
                  className={`w-4 h-4 ${
                    activeTab === 'clubs' ? 'text-[#14C7C3]' : 'text-[#94969C]'
                  }`}
                />
                <span>School Clubs</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`w-full px-3 py-2.5 rounded-md text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                activeTab === 'verification'
                  ? 'bg-[#1F242F] text-[#ECECED] border-l-2 border-[#14C7C3]'
                  : 'text-[#94969C] hover:bg-[#161B26] hover:text-[#ECECED]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck
                  className={`w-4 h-4 ${
                    activeTab === 'verification' ? 'text-[#14C7C3]' : 'text-[#94969C]'
                  }`}
                />
                <span>Teacher & Panel Review</span>
              </span>
              <span className="figma-emerald-pill px-1.5 py-0.2 text-[10px] font-mono">
                {pendingTeacherCount + pendingExpertCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('telegram_bot')}
              className={`w-full px-3 py-2.5 rounded-md text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                activeTab === 'telegram_bot'
                  ? 'bg-[#1F242F] text-[#ECECED] border-l-2 border-[#14C7C3]'
                  : 'text-[#94969C] hover:bg-[#161B26] hover:text-[#ECECED]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Bot
                  className={`w-4 h-4 ${
                    activeTab === 'telegram_bot' ? 'text-[#14C7C3]' : 'text-[#94969C]'
                  }`}
                />
                <span>Telegram Student Bot</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('health_risk')}
              className={`w-full px-3 py-2.5 rounded-md text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                activeTab === 'health_risk'
                  ? 'bg-[#1F242F] text-[#ECECED] border-l-2 border-[#14C7C3]'
                  : 'text-[#94969C] hover:bg-[#161B26] hover:text-[#ECECED]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity
                  className={`w-4 h-4 ${
                    activeTab === 'health_risk' ? 'text-rose-400' : 'text-[#94969C]'
                  }`}
                />
                <span>School Alerts</span>
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-950/80 border border-rose-500/40 text-rose-300">
                {snapshot.healthAlerts.length}
              </span>
            </button>
          </nav>

          {/* Simple Sri Lanka Program Summary Box */}
          <div className="p-3.5 rounded-xl bg-[#1C2126] border border-[#095856] space-y-2 text-xs">
            <div className="font-semibold text-[#E0FFF9]">
              Quick Guide for Schools
            </div>
            <ul className="space-y-1.5 text-[11px] text-[#B8F4F3]">
              <li>• <strong className="text-[#E0FFF9]">Students:</strong> Send activity photos as Files on Telegram</li>
              <li>• <strong className="text-[#E0FFF9]">Teachers:</strong> Approve school activities up to Rs. 15,000</li>
              <li>• <strong className="text-[#E0FFF9]">National Panel:</strong> Scores sales &gt; Rs. 15,000 &amp; awards seed grants</li>
            </ul>
          </div>
        </div>

        {/* Bottom Active User Role Switcher */}
        <div className="p-4 border-t border-[#1F242F] bg-[#0C111D] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#94969C]">
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-[#14C7C3]" />
              Logged In As
            </span>
            <span className="figma-emerald-pill px-2 py-0.2 text-[10px] font-mono uppercase">
              {activeUser.role.replace('_', ' ')}
            </span>
          </div>
          <select
            value={activeUser.id}
            onChange={(e) => setActiveUserId(e.target.value)}
            aria-label="Switch User Account"
            className="w-full bg-[#161B26] border border-[#1F242F] rounded-lg px-2.5 py-2 text-xs font-medium text-[#E0FFF9] focus:outline-none focus:border-[#14C7C3] cursor-pointer"
          >
            {snapshot.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-[#181C21] flex flex-col">
        {/* Mobile Navigation Bar */}
        <div className="lg:hidden bg-[#0C111D] border-b border-[#1F242F] px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Recycle className="w-5 h-5 text-[#14C7C3]" />
              <span className="font-bold text-sm text-[#E0FFF9]">Haritha Pasal LK</span>
            </div>
            <select
              value={activeUser.id}
              onChange={(e) => setActiveUserId(e.target.value)}
              aria-label="Mobile Switch User"
              className="bg-[#161B26] border border-[#1F242F] rounded-lg px-2 py-1 text-xs text-[#E0FFF9]"
            >
              {snapshot.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                ['leaderboard', 'Leaderboard'],
                ['clubs', 'School Clubs'],
                ['verification', 'Approvals'],
                ['telegram_bot', 'Telegram Bot'],
                ['health_risk', 'Alerts'],
              ] as [NavTab, string][]
            ).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-[#14C7C3] text-[#074140]'
                    : 'bg-[#161B26] text-[#B8F4F3]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace Container */}
        <main className="flex-1 p-5 sm:p-8 space-y-6 max-w-[1280px] w-full mx-auto">
          {/* Clean Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#095856]">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#E0FFF9] font-[var(--font-jakarta)]">
                  {navMeta[activeTab].title}
                </h1>
                {navMeta[activeTab].badge !== undefined && (
                  <span className="figma-emerald-pill px-2.5 py-0.5 text-xs font-medium">
                    {navMeta[activeTab].badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#B8F4F3]">{navMeta[activeTab].subtitle}</p>
            </div>
          </div>

          {/* Active View */}
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
        </main>
      </div>
    </div>
  );
}
