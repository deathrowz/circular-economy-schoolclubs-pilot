'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  LogOut,
  Phone,
  Recycle,
  Sparkles,
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
  UserProfile,
  WhatsAppBotOutboundMessage,
} from '@/types/domain';
import { fetchPlatformSnapshotClient } from '@/lib/client/platform-bridge';
import { StudentGamifiedDashboardView } from '@/components/StudentGamifiedDashboardView';
import { ClubProfilesView } from '@/components/ClubProfilesView';
import { LeaderboardView } from '@/components/LeaderboardView';
import { WhatsAppCloudWorkbench } from '@/components/WhatsAppCloudWorkbench';

interface SnapshotData {
  schools: School[];
  clubs: Club[];
  users: UserProfile[];
  impactLogs: ImpactLog[];
  auditLogs: AuditLogEntry[];
  gamificationConfig: GamificationConfig;
  whatsappMessages: WhatsAppBotOutboundMessage[];
  telegramMessages?: any[];
  leaderboard: LeaderboardSchoolScore[];
  healthAlerts: HealthRiskAlert[];
}

type StudentTab = 'student_gamified' | 'whatsapp_ingestion' | 'clubs' | 'leaderboard';

export default function StudentDashboardPage() {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [activeTab, setActiveTab] = useState<StudentTab>('student_gamified');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('haritha_auth_user_id');
      if (stored) {
        setSessionUserId(stored);
      } else {
        const match = document.cookie.match(/haritha_auth_user_id=([^;]+)/);
        if (match) setSessionUserId(match[1]);
      }
    }
  }, []);

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
            Loading Student Enterprise Portal...
          </span>
        </div>
      </div>
    );
  }

  // Active student user: dynamically resolved from session cookie / localStorage
  const studentUser =
    (sessionUserId
      ? snapshot.users.find(
          (u) =>
            (u.id === sessionUserId || u.auth_user_id === sessionUserId) &&
            u.role === 'student'
        ) ||
        snapshot.users.find(
          (u) => u.id === sessionUserId || u.auth_user_id === sessionUserId
        )
      : null) ||
    snapshot.users.find((u) => u.role === 'student') ||
    snapshot.users[0];

  const studentClub =
    snapshot.clubs.find(
      (c) =>
        (studentUser.club_id && c.id === studentUser.club_id) ||
        (studentUser.school_id && c.school_id === studentUser.school_id)
    ) || snapshot.clubs[0];

  const studentSchool =
    snapshot.schools.find(
      (s) =>
        (studentUser.school_id && s.id === studentUser.school_id) ||
        (studentClub && s.id === studentClub.school_id)
    ) || snapshot.schools[0];

  const navItems = [
    {
      id: 'student_gamified' as StudentTab,
      label: 'Gamified Club Hub',
      icon: Sparkles,
    },
    {
      id: 'whatsapp_ingestion' as StudentTab,
      label: 'Submit Photo Activity',
      icon: Phone,
    },
    {
      id: 'clubs' as StudentTab,
      label: 'Our Enterprise Dossier',
      icon: Building2,
    },
    {
      id: 'leaderboard' as StudentTab,
      label: 'National Standings',
      icon: Trophy,
    },
  ];

  const handleLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'haritha_auth_user_id=; path=/; max-age=0; SameSite=Lax';
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('haritha_auth_user_id');
    }
    window.location.href = '/login';
  };

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
                  I2I Clubs (Idea2Impact)
                </span>
                <span className="hai-cyan-pill text-[10px] font-bold uppercase tracking-wider">
                  Student Mode
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#111010]/65 mt-0.5">
                {studentSchool.name} • {studentClub.name}
              </div>
            </div>
          </div>

          {/* School Context Locked Badge */}
          <div className="hidden md:flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{studentSchool.name} — {studentClub.name}</span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#005FA3] bg-[#E6F1FA] px-2.5 py-1 rounded-md">
              {studentUser.login_code || 'STUDENT'}
            </span>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Student Navigation" className="hidden lg:flex items-center gap-2">
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
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-[#005FA3] font-bold hover:underline"
            >
              ← Portal
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer flex items-center gap-1.5 transition shrink-0"
              title="Sign Out of Session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sign Out</span>
            </button>
          </div>
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
              Category 4 • Student Enterprise Mode
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111010] font-[var(--font-jakarta)] mt-1">
              {studentSchool.name} — {studentClub.name}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>School Context Permanently Locked</span>
          </div>
        </section>

        {activeTab === 'student_gamified' && (
          <StudentGamifiedDashboardView
            activeUser={studentUser}
            allUsers={snapshot.users}
            schools={snapshot.schools}
            clubs={snapshot.clubs}
            impactLogs={snapshot.impactLogs}
            leaderboard={snapshot.leaderboard}
            config={snapshot.gamificationConfig}
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
            whatsappMessages={snapshot.whatsappMessages || snapshot.telegramMessages}
            activeUser={studentUser}
            isAdmin={false}
            isDev={false}
            initialRole="student"
            initialClubId={studentClub.id}
            onRefreshSnapshot={setSnapshot}
            onNavigateToVerification={() => setActiveTab('student_gamified')}
          />
        )}

        {activeTab === 'clubs' && (
          <ClubProfilesView
            clubs={snapshot.clubs}
            impactLogs={snapshot.impactLogs}
            activeUser={studentUser}
            selectedClubId={studentClub.id}
            onSelectClub={() => {}}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            leaderboard={snapshot.leaderboard}
            config={snapshot.gamificationConfig}
            activeSchoolId={studentSchool.id}
            onSelectClubProfile={() => setActiveTab('clubs')}
            onOpenWhatsAppWorkbench={() => setActiveTab('whatsapp_ingestion')}
            onOpenVerification={() => setActiveTab('student_gamified')}
          />
        )}
      </main>
    </div>
  );
}
