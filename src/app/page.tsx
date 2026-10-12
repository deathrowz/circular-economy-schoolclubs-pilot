'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Building2,
  KeyRound,
  Recycle,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { LeaderboardView } from '@/components/LeaderboardView';
import { ClubProfilesView } from '@/components/ClubProfilesView';
import { VerificationEngineView } from '@/components/VerificationEngineView';
import { TelegramBotWorkbench } from '@/components/TelegramBotWorkbench';
import { HealthRiskDashboardView } from '@/components/HealthRiskDashboardView';
import { StudentGamifiedDashboardView } from '@/components/StudentGamifiedDashboardView';
import { RoleLoginPortalView } from '@/components/RoleLoginPortalView';
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
  | 'student_gamified'
  | 'verification'
  | 'clubs'
  | 'telegram_bot'
  | 'health_risk'
  | 'login_portal';

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
  const [activeUserId, setActiveUserId] = useState<string>('usr-giz-admin-01');
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
    snapshot.users.find((u) => u.id === activeUserId) || snapshot.users[0];

  const handleSwitchUser = (newUserId: string, targetTab?: NavTab) => {
    setActiveUserId(newUserId);
    const found = snapshot.users.find((u) => u.id === newUserId);
    if (found?.club_id) {
      setSelectedClubId(found.club_id);
    }
    if (targetTab) {
      setActiveTab(targetTab);
    } else if (found?.role === 'student') {
      setActiveTab('student_gamified');
    } else if (found?.role === 'teacher' || found?.role === 'expert_admin') {
      setActiveTab('verification');
    }
  };

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
    student_gamified: {
      eyebrow: 'Category 4 • 15 Single-User School Student Logins',
      title: 'Gamified School Student Dashboard',
      subtitle:
        'Each of the 15 schools has 1 dedicated student club login featuring live XP tier progress, 6 school quests & badges, friendly rivalry gap, and Telegram activity logging.',
      badge: activeUser.school_code || '15 Schools',
    },
    verification: {
      eyebrow: 'Categories 2 & 3 • School Teacher & Expert Panel Validation',
      title: 'Teacher & National Panel Approvals',
      subtitle:
        'School Teachers validate campus activities (≤ Rs. 15,000). The Expert Panel & GIZ Admin score larger sales (> Rs. 15,000) and audit a 10% sample.',
      badge: pendingTeacherCount + pendingExpertCount,
    },
    clubs: {
      eyebrow: 'Participating Schools & Student Enterprises',
      title: 'School Clubs & Projects',
      subtitle:
        'Explore each school’s circular-economy enterprise, student office bearers, teacher-in-charge, and verified recycling & sales ledger.',
    },
    telegram_bot: {
      eyebrow: 'Student Data Entry (@HarithaPasalBot)',
      title: 'Telegram Activity Submission',
      subtitle:
        'Students submit uncompressed activity photos as Documents/Files via Telegram (/log_impact) to verify school GPS coordinates, waste (kg), and sales (Rs.).',
    },
    health_risk: {
      eyebrow: 'Category 1 • Super Admin (GIZ) Governance & Integrity',
      title: 'School Activity Alerts & Audit Log',
      subtitle:
        'GIZ Super Admin monitoring for inactive school clubs (>14 days), off-campus photo GPS coordinates, and high sales reported with zero recycled waste.',
      badge: snapshot.healthAlerts.length,
    },
    login_portal: {
      eyebrow: '4 User Categories • Role-Based Access Control (RBAC)',
      title: 'User Logins & 15-School Credentials',
      subtitle:
        'Dedicated logins for 1) Super Admin (GIZ), 2) Expert Panel Validators, 3) 15 School Teachers, and 4) 15 Single-User Gamified School Student Logins.',
      badge: `${snapshot.users.length} Logins`,
    },
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'leaderboard', label: 'School Index', icon: Trophy },
    {
      id: 'student_gamified',
      label: 'Student Dashboard',
      icon: Sparkles,
    },
    { id: 'clubs', label: 'School Clubs', icon: Building2 },
    {
      id: 'verification',
      label: 'Approvals',
      icon: ShieldCheck,
      count: pendingTeacherCount + pendingExpertCount,
    },
    {
      id: 'health_risk',
      label: 'GIZ Alerts',
      icon: Activity,
      count: snapshot.healthAlerts.length,
    },
    {
      id: 'login_portal',
      label: 'Role Logins',
      icon: KeyRound,
    },
  ];

  const gizUsers = snapshot.users.filter((u) => u.role === 'super_admin');
  const expertUsers = snapshot.users.filter((u) => u.role === 'expert_admin');
  const teacherUsers = snapshot.users.filter((u) => u.role === 'teacher');
  const studentUsers = snapshot.users.filter((u) => u.role === 'student');
  const mentorUsers = snapshot.users.filter((u) => u.role === 'mentor');

  return (
    <div className="min-h-screen flex flex-col bg-[#E6F1FA] text-[#111010]">
      {/* ====================================================================
       * Spacious 2-Tier Stanford HAI Style Header (Utility Role Bar + Main Nav)
       * ==================================================================== */}
      <header className="sticky top-0 z-30 bg-[#E6F1FA]/95 backdrop-blur-xs border-b border-[#111010]/15">
        {/* Tier 1: Slim Institutional & Role Switcher Utility Bar */}
        <div className="bg-[#FFFFFF]/85 border-b border-[#111010]/10">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left: Quick 4-Category Role Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#111010]/60 mr-1 hidden sm:inline">
                View As:
              </span>
              <button
                onClick={() => handleSwitchUser('usr-giz-admin-01', 'health_risk')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  activeUser.role === 'super_admin'
                    ? 'bg-[#005FA3] text-[#9CF2F2]'
                    : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/60'
                }`}
              >
                1. GIZ Super Admin
              </button>
              <button
                onClick={() => handleSwitchUser('usr-expert-01', 'verification')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  activeUser.role === 'expert_admin'
                    ? 'bg-[#005FA3] text-[#9CF2F2]'
                    : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/60'
                }`}
              >
                2. Expert Panel
              </button>
              <button
                onClick={() => handleSwitchUser('usr-teacher-01', 'verification')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  activeUser.role === 'teacher'
                    ? 'bg-[#005FA3] text-[#9CF2F2]'
                    : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/60'
                }`}
              >
                3. Teacher (15)
              </button>
              <button
                onClick={() => handleSwitchUser('usr-student-01', 'student_gamified')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  activeUser.role === 'student'
                    ? 'bg-[#005FA3] text-[#9CF2F2]'
                    : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/60'
                }`}
              >
                4. Student Club (15)
              </button>
            </div>

            {/* Right: Active Login Selector Dropdown */}
            <div className="flex items-center gap-2.5 ml-auto">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-[#005FA3] font-mono">
                <UserCheck className="w-3.5 h-3.5" />
                {activeUser.login_code}
              </span>
              <select
                value={activeUser.id}
                onChange={(e) => handleSwitchUser(e.target.value)}
                aria-label="Switch User Login Category"
                className="hai-input px-2.5 py-1 text-xs font-semibold text-[#111010] cursor-pointer max-w-[240px]"
              >
                <optgroup label="1. Super Admin (GIZ)">
                  {gizUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.login_code} — {u.full_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="2. Expert Panel (National Validator)">
                  {expertUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.login_code} — {u.full_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="3. Teacher Logins (15 Schools)">
                  {teacherUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.login_code} — {u.school_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="4. Gamified Student Logins (15 Schools)">
                  {studentUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.login_code} — {u.school_name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Industry Mentor (Read-Only)">
                  {mentorUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.login_code} — {u.full_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Tier 2: Spacious Main Brand & Primary Navigation Bar */}
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-6">
          {/* Left: Clean Brand Lockup */}
          <button
            onClick={() => setActiveTab('leaderboard')}
            className="flex items-center gap-3 text-left group cursor-pointer shrink-0"
          >
            <div className="w-9 h-9 rounded-[10px_10px_10px_2px] bg-[#005FA3] text-[#9CF2F2] flex items-center justify-center shadow-xs group-hover:bg-[#0B3E6E] transition">
              <Recycle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-base sm:text-lg font-bold tracking-tight text-[#111010] leading-none">
                  Haritha Pasal
                </div>
                <div className="text-[11px] font-medium text-[#111010]/65 mt-0.5">
                  Sri Lanka • 15-School Index
                </div>
              </div>
            </div>
          </button>

          {/* Right: Spacious Horizontal Navigation Tabs */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-2"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#005FA3] text-[#9CF2F2]'
                      : 'text-[#111010]/80 hover:bg-[#9CF2F2]/60 hover:text-[#005FA3]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
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
        </div>

        {/* Mobile / Tablet Navigation Strip */}
        <div className="lg:hidden border-t border-[#111010]/10 px-4 py-2 flex items-center gap-2 overflow-x-auto">
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
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-16 space-y-8">

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
            onOpenTelegramWorkbench={() => setActiveTab('student_gamified')}
            onOpenVerification={() => setActiveTab('verification')}
          />
        )}

        {activeTab === 'student_gamified' && (
          <StudentGamifiedDashboardView
            activeUser={activeUser}
            allUsers={snapshot.users}
            schools={snapshot.schools}
            clubs={snapshot.clubs}
            impactLogs={snapshot.impactLogs}
            leaderboard={snapshot.leaderboard}
            config={snapshot.gamificationConfig}
            onSwitchUser={(uid) => handleSwitchUser(uid, 'student_gamified')}
            onRefreshSnapshot={setSnapshot}
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

        {activeTab === 'login_portal' && (
          <RoleLoginPortalView
            activeUser={activeUser}
            users={snapshot.users}
            leaderboard={snapshot.leaderboard}
            config={snapshot.gamificationConfig}
            onSelectUserAndNavigate={(uid, tab) => handleSwitchUser(uid, tab)}
          />
        )}

        {/* ====================================================================
         * Stanford HAI AI Index Style White Asymmetric Footer Card
         * ==================================================================== */}
        <footer className="hai-card p-6 sm:p-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px_8px_8px_2px] bg-[#005FA3] text-[#9CF2F2] flex items-center justify-center">
                  <Recycle className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-[#111010]">
                  Haritha Pasal • GIZ Sri Lanka Pilot
                </span>
              </div>
              <p className="text-xs text-[#111010]/70 leading-relaxed">
                4-Category Role-Based Circular Enterprise Platform spanning 15 Sri Lankan schools.
              </p>
            </div>

            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
              <div className="hai-chrome-box p-3.5">
                <div className="font-bold text-[#005FA3] uppercase tracking-wider text-[10px]">
                  1. Super Admin (GIZ)
                </div>
                <p className="text-[#111010]/80 mt-1">
                  National program governance, risk alerts, audit ledger &amp; scoring weights.
                </p>
              </div>
              <div className="hai-chrome-box p-3.5">
                <div className="font-bold text-[#005FA3] uppercase tracking-wider text-[10px]">
                  2. Expert Panel
                </div>
                <p className="text-[#111010]/80 mt-1">
                  Scores Macro sales (&gt; Rs. 15,000) across 6 criteria &amp; runs 10% audits.
                </p>
              </div>
              <div className="hai-chrome-box p-3.5">
                <div className="font-bold text-[#005FA3] uppercase tracking-wider text-[10px]">
                  3. School Teachers (15)
                </div>
                <p className="text-[#111010]/80 mt-1">
                  1 teacher login per school to verify on-campus logs up to Rs. 15,000.
                </p>
              </div>
              <div className="hai-chrome-box p-3.5">
                <div className="font-bold text-[#005FA3] uppercase tracking-wider text-[10px]">
                  4. Student Clubs (15)
                </div>
                <p className="text-[#111010]/80 mt-1">
                  15 single-user school logins with XP level bars, 6 quests &amp; Telegram bot.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
