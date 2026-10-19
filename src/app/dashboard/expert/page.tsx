'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Gavel,
  LogOut,
  Phone,
  Recycle,
  ShieldCheck,
  Sliders,
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
  whatsappMessages: WhatsAppBotOutboundMessage[];
  telegramMessages?: any[];
  leaderboard: LeaderboardSchoolScore[];
  healthAlerts: HealthRiskAlert[];
}

type ExpertTab = 'verification' | 'whatsapp_ingestion' | 'leaderboard' | 'clubs';

export default function ExpertDashboardPage() {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [activeTab, setActiveTab] = useState<ExpertTab>('verification');
  const [selectedClubId, setSelectedClubId] = useState<string>('club-01');
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('i2i_auth_user_id') || localStorage.getItem('haritha_auth_user_id');
      if (stored) {
        setSessionUserId(stored);
      } else {
        const match = document.cookie.match(/(?:i2i_auth_user_id|haritha_auth_user_id)=([^;]+)/);
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
            Loading Expert Evaluation Queue...
          </span>
        </div>
      </div>
    );
  }

  // Active expert user: dynamically resolved from session cookie / localStorage
  const expertUser =
    (sessionUserId
      ? snapshot.users.find(
          (u) =>
            (u.id === sessionUserId || u.auth_user_id === sessionUserId) &&
            (u.role === 'expert' || u.role === 'expert_admin' || u.role === 'admin' || u.role === 'super_admin')
        ) ||
        snapshot.users.find(
          (u) => u.id === sessionUserId || u.auth_user_id === sessionUserId
        )
      : null) ||
    snapshot.users.find((u) => u.role === 'expert' || u.role === 'expert_admin') ||
    snapshot.users[0];

  const pendingExpertCount = snapshot.impactLogs.filter(
    (l) =>
      l.status === 'pending_expert_review' ||
      (l.random_audit_selected && l.audit_status === 'pending_audit')
  ).length;

  const navItems = [
    {
      id: 'verification' as ExpertTab,
      label: 'Criteria Scoring & Audit',
      icon: Gavel,
      count: pendingExpertCount,
    },
    {
      id: 'whatsapp_ingestion' as ExpertTab,
      label: 'WhatsApp Invoices & Dossiers',
      icon: Phone,
    },
    {
      id: 'leaderboard' as ExpertTab,
      label: '15-School Leaderboard',
      icon: Trophy,
    },
    {
      id: 'clubs' as ExpertTab,
      label: '15 School Dossiers',
      icon: Building2,
    },
  ];

  const handleLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'i2i_auth_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'haritha_auth_user_id=; path=/; max-age=0; SameSite=Lax';
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('i2i_auth_user_id');
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
                  National Expert Panel
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#111010]/65 mt-0.5">
                {expertUser.full_name} • 15 Pilot Schools Evaluator
              </div>
            </div>
          </div>

          {/* Expert Badge + 15 School Multi-Context Indicator */}
          <div className="hidden md:flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-[#005FA3] text-[#9CF2F2] text-xs font-bold flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-300" />
              <span>Full 15-School Evaluator Access</span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#005FA3] bg-[#E6F1FA] px-2.5 py-1 rounded-md">
              {expertUser.login_code || 'EXPERT'}
            </span>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Expert Navigation" className="hidden lg:flex items-center gap-2">
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
              Category 2 • National Expert Evaluation Panel
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111010] font-[var(--font-jakarta)] mt-1">
              Expert Adjudication &amp; Criteria Scoring Queue
            </h1>
            <p className="text-xs text-[#111010]/70 mt-1">
              Score high-impact enterprise sales (&gt; Rs. 15,000) across 6 selection criteria, and adjudicate the 10% random micro transaction integrity sample.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100 text-[#005FA3] text-xs font-bold border border-cyan-300 self-start sm:self-auto">
            <span>15-School Multi-School Filter Active</span>
          </div>
        </section>

        {activeTab === 'verification' && (
          <VerificationEngineView
            activeUser={expertUser}
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
            whatsappMessages={snapshot.whatsappMessages || snapshot.telegramMessages}
            activeUser={expertUser}
            isAdmin={false}
            isDev={false}
            initialRole="expert"
            initialClubId={selectedClubId}
            onRefreshSnapshot={setSnapshot}
            onNavigateToVerification={() => setActiveTab('verification')}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            leaderboard={snapshot.leaderboard}
            config={snapshot.gamificationConfig}
            activeSchoolId={snapshot.schools[0].id}
            onSelectClubProfile={(clubId) => {
              setSelectedClubId(clubId);
              setActiveTab('clubs');
            }}
            onOpenWhatsAppWorkbench={() => setActiveTab('whatsapp_ingestion')}
            onOpenVerification={() => setActiveTab('verification')}
          />
        )}

        {activeTab === 'clubs' && (
          <ClubProfilesView
            clubs={snapshot.clubs}
            impactLogs={snapshot.impactLogs}
            activeUser={expertUser}
            selectedClubId={selectedClubId}
            onSelectClub={setSelectedClubId}
          />
        )}
      </main>
    </div>
  );
}
