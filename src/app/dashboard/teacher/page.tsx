'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  FileCheck2,
  Phone,
  Recycle,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
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
import { fetchPlatformSnapshotClient } from '@/lib/client/platform-bridge';
import { VerificationEngineView } from '@/components/VerificationEngineView';
import { WhatsAppCloudWorkbench } from '@/components/WhatsAppCloudWorkbench';
import { ClubProfilesView } from '@/components/ClubProfilesView';
import { LeaderboardView } from '@/components/LeaderboardView';

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

type TeacherTab = 'verification' | 'whatsapp_ingestion' | 'clubs' | 'leaderboard';

export default function TeacherDashboardPage() {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [activeTab, setActiveTab] = useState<TeacherTab>('verification');

  useEffect(() => {
    let isMounted = true;
    fetchPlatformSnapshotClient().then((data) => {
      if (!isMounted) return;
      setSnapshot(data);
    });

    const interval = setInterval(() => {
      fetchPlatformSnapshotClient().then((data) => {
        if (!isMounted) return;
        setSnapshot(data);
      });
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="hai-card p-8 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#005FA3] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-[#111010]">
            Loading Teacher Approval Queue...
          </span>
        </div>
      </div>
    );
  }

  // Active teacher: +94772234501 (Royal College Colombo)
  const teacherUser =
    snapshot.users.find(
      (u) => u.phone_number === '94772234501' || u.id === 'usr-teacher-01'
    ) ||
    snapshot.users.find((u) => u.role === 'teacher') ||
    snapshot.users[0];

  const teacherClub =
    snapshot.clubs.find(
      (c) => c.id === teacherUser.club_id || c.school_id === teacherUser.school_id
    ) || snapshot.clubs[0];

  const teacherSchool =
    snapshot.schools.find((s) => s.id === teacherUser.school_id) ||
    snapshot.schools[0];

  const pendingCount = snapshot.impactLogs.filter(
    (l) =>
      (l.status === 'pending' || l.status === 'flagged') &&
      l.school_id === teacherUser.school_id
  ).length;

  const navItems = [
    {
      id: 'verification' as TeacherTab,
      label: 'Student Approvals',
      icon: ShieldCheck,
      count: pendingCount,
    },
    {
      id: 'whatsapp_ingestion' as TeacherTab,
      label: 'Activity & Receipt Approval',
      icon: Phone,
    },
    {
      id: 'clubs' as TeacherTab,
      label: 'Our School Enterprise',
      icon: Building2,
    },
    {
      id: 'leaderboard' as TeacherTab,
      label: 'National School Index',
      icon: Trophy,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#111010]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#111010]/15">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-[#005FA3] text-[#9CF2F2] flex items-center justify-center shrink-0 shadow-xs hover:opacity-90 transition"
              title="Return to Portal Home"
            >
              <Recycle className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#111010] font-[var(--font-jakarta)]">
                  Haritha Pasal
                </span>
                <span className="hai-cyan-pill text-[10px] font-bold uppercase tracking-wider">
                  Supervising Teacher
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#111010]/65 mt-0.5">
                {teacherSchool.name} • {teacherClub.name}
              </div>
            </div>
          </div>

          {/* Clean Non-Interactive School Badge - No Switcher Allowed */}
          <div className="hidden md:flex items-center gap-3">
            <div className="px-4 py-1.5 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{teacherSchool.name} — {teacherClub.name}</span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#005FA3] bg-[#E6F1FA] px-2.5 py-1 rounded-md">
              +94772234501
            </span>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Teacher Navigation" className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#005FA3] text-[#9CF2F2]'
                      : 'text-[#111010]/80 hover:bg-[#9CF2F2]/60 hover:text-[#005FA3]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-[#9CF2F2] text-[#005FA3]'
                          : 'bg-[#005FA3] text-white'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <Link
            href="/"
            className="text-xs text-[#005FA3] font-bold hover:underline"
          >
            ← Portal
          </Link>
        </div>

        {/* Mobile Nav Strip */}
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
                {item.count !== undefined && item.count > 0 ? ` (${item.count})` : ''}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-8 pt-6 pb-16 space-y-6">
        {/* Editorial Eyebrow */}
        <section className="pb-4 border-b border-[#111010]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#005FA3] block">
              Category 3 • Supervising Teacher • {teacherSchool.name} ({teacherSchool.code})
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111010] font-[var(--font-jakarta)] mt-1">
              {activeTab === 'verification'
                ? `${teacherSchool.name} Teacher Approvals Queue`
                : activeTab === 'whatsapp_ingestion'
                ? 'Teacher Activity & Receipt Approval'
                : activeTab === 'clubs'
                ? `${teacherSchool.name} Eco Club Enterprise`
                : 'National 15-School Rankings & Top-Off Grants'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Locked: {teacherSchool.name}</span>
          </div>
        </section>

        {activeTab === 'verification' && (
          <VerificationEngineView
            activeUser={teacherUser}
            users={snapshot.users}
            schools={snapshot.schools}
            impactLogs={snapshot.impactLogs}
            config={snapshot.gamificationConfig}
            leaderboard={snapshot.leaderboard}
            hideRoleSwitcher={true}
            onSwitchUser={() => {}}
            onRefreshSnapshot={setSnapshot}
          />
        )}

        {activeTab === 'whatsapp_ingestion' && (
          <WhatsAppCloudWorkbench
            clubs={snapshot.clubs}
            schools={snapshot.schools}
            users={snapshot.users}
            impactLogs={snapshot.impactLogs}
            whatsappMessages={snapshot.telegramMessages}
            activeUser={teacherUser}
            isAdmin={false}
            isDev={false}
            initialRole="teacher"
            initialClubId={teacherClub.id}
            onRefreshSnapshot={setSnapshot}
            onNavigateToVerification={() => setActiveTab('verification')}
          />
        )}

        {activeTab === 'clubs' && (
          <ClubProfilesView
            clubs={snapshot.clubs}
            impactLogs={snapshot.impactLogs}
            activeUser={teacherUser}
            selectedClubId={teacherClub.id}
            onSelectClub={() => {}}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            leaderboard={snapshot.leaderboard}
            config={snapshot.gamificationConfig}
            activeSchoolId={teacherSchool.id}
            onSelectClubProfile={() => setActiveTab('clubs')}
            onOpenTelegramWorkbench={() => setActiveTab('whatsapp_ingestion')}
            onOpenVerification={() => setActiveTab('verification')}
          />
        )}
      </main>
    </div>
  );
}
