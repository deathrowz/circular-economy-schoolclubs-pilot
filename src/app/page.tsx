'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  Figma,
  Layers,
  PanelRightClose,
  PanelRightOpen,
  Recycle,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  X,
} from 'lucide-react';
import { LeaderboardView } from '@/components/LeaderboardView';
import { ClubProfilesView } from '@/components/ClubProfilesView';
import { VerificationEngineView } from '@/components/VerificationEngineView';
import { TelegramBotWorkbench } from '@/components/TelegramBotWorkbench';
import { HealthRiskDashboardView } from '@/components/HealthRiskDashboardView';
import { fetchPlatformSnapshotClient } from '@/lib/client/platform-bridge';
import {
  FigmaRocketIcon,
  FigmaTierBronzeIcon,
  FigmaTierGoldIcon,
  FigmaTierPlatinumIcon,
  FigmaTierSilverIcon,
} from '@/components/FigmaIcons';
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
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [showFigmaSpecModal, setShowFigmaSpecModal] = useState<boolean>(false);

  useEffect(() => {
    fetchPlatformSnapshotClient().then((data) => setSnapshot(data));
  }, []);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#0C111D] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[#14C7C3] font-semibold text-sm">
          <Recycle className="w-6 h-6 animate-spin" />
          <span>Initializing 15-School Circular-Economy Enterprise Engine...</span>
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
      title: 'Circular-Economy Leaderboard',
      subtitle:
        'Live composite ranking across 15 pilot schools • Harmonic Financial-to-Environmental Normalization ($3.50/kg equilibrium)',
      badge: '15 Schools',
    },
    clubs: {
      title: 'Student Enterprise Profiles & Ledger',
      subtitle:
        'Circular business model canvases, student executive org charts, seed tranches, and verified milestone ledgers',
    },
    verification: {
      title: 'Two-Tier Verification & Adjudication Engine',
      subtitle:
        'Tier 1 Teacher Campus Geofence Endorsement & Tier 2 Expert Panel 6-Criteria Scoring + 10% Random Micro-Audit',
      badge: pendingTeacherCount + pendingExpertCount,
    },
    telegram_bot: {
      title: 'Client 1: Telegram Bot & Uncompressed EXIF Workbench',
      subtitle:
        'Simulates /log_impact student submissions, enforces uncompressed Document/File EXIF GPS & Timestamp validation, and Step 5 single-attempt resubmission loop',
    },
    health_risk: {
      title: 'Health, Risk & Postgres Trigger Audit Ledger',
      subtitle:
        'Automated anomaly detection (high revenue with zero environmental impact, inactive clubs, fraud penalties) & immutable audit_logs stream',
      badge: snapshot.healthAlerts.length,
    },
  };

  return (
    <div className="min-h-screen flex bg-[#0C111D] text-[#E0FFF9]">
      {/* =====================================================================
          PANE 1: FIGMA LEFT SIDEBAR NAVIGATION (#1:385556 from UL6MdGaqnCWJiejfZj9CUG)
         ===================================================================== */}
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
                  EcoLoop Pilot
                </span>
                <span className="figma-emerald-pill px-1.5 py-0.2 text-[10px] font-mono">
                  v1.4
                </span>
              </div>
              <p className="text-[11px] text-[#B8F4F3] truncate">
                15-School Circular Ledger
              </p>
            </div>
          </div>

          {/* Primary Navigation Items */}
          <nav className="space-y-1">
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94969C]">
              Platform Workspaces
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
                <span>Leaderboard</span>
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
                <span>Club Profiles & Ledger</span>
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
                <span>Verification Engine</span>
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
                <span>Telegram EXIF Bot</span>
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#181C21] border border-[#095856] text-[#14C7C3]">
                Client 1
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
                <span>Health & Audit Logs</span>
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-950/80 border border-rose-500/40 text-rose-300">
                {snapshot.healthAlerts.length}
              </span>
            </button>
          </nav>

          {/* Figma MCP Design System Card in Sidebar */}
          <div className="p-3.5 rounded-xl bg-[#1C2126] border border-[#095856] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E0FFF9]">
                <Figma className="w-3.5 h-3.5 text-[#14C7C3]" />
                Figma MCP UI Active
              </span>
              <span className="text-[10px] font-mono text-[#14C7C3]">v4.1</span>
            </div>
            <p className="text-[11px] text-[#B8F4F3] leading-relaxed">
              Styled with tokens & SVG icons extracted via Figma MCP from{' '}
              <code className="text-[#E0FFF9]">T0J4d7...</code> &{' '}
              <code className="text-[#E0FFF9]">UL6MdG...</code>.
            </p>
            <button
              onClick={() => setShowFigmaSpecModal(true)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#181C21] hover:bg-[#095856]/40 border border-[#095856] text-[11px] font-semibold text-[#14C7C3] flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Inspect Figma Nodes</span>
            </button>
          </div>
        </div>

        {/* Bottom Active User RBAC Switcher (#1:385579 Avatar + Account Card) */}
        <div className="p-4 border-t border-[#1F242F] bg-[#0C111D] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#94969C]">
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-[#14C7C3]" />
              RBAC Session
            </span>
            <span className="figma-emerald-pill px-2 py-0.2 text-[10px] font-mono uppercase">
              {activeUser.role}
            </span>
          </div>
          <select
            value={activeUser.id}
            onChange={(e) => setActiveUserId(e.target.value)}
            aria-label="Switch RBAC User Session"
            className="w-full bg-[#161B26] border border-[#1F242F] rounded-lg px-2.5 py-2 text-xs font-medium text-[#E0FFF9] focus:outline-none focus:border-[#14C7C3] cursor-pointer"
          >
            {snapshot.users.map((u) => (
              <option key={u.id} value={u.id}>
                [{u.role.toUpperCase()}] {u.full_name}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* =====================================================================
          PANE 2: FIGMA CENTER MAIN WORKSPACE (#1:385557 & #1353:10928)
         ===================================================================== */}
      <div className="flex-1 min-w-0 bg-[#181C21] flex flex-col">
        {/* Mobile Navigation Bar (visible on <lg screens) */}
        <div className="lg:hidden bg-[#0C111D] border-b border-[#1F242F] px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Recycle className="w-5 h-5 text-[#14C7C3]" />
              <span className="font-bold text-sm text-[#E0FFF9]">EcoLoop Pilot</span>
            </div>
            <select
              value={activeUser.id}
              onChange={(e) => setActiveUserId(e.target.value)}
              aria-label="Mobile Switch RBAC Session"
              className="bg-[#161B26] border border-[#1F242F] rounded-lg px-2 py-1 text-xs text-[#E0FFF9]"
            >
              {snapshot.users.map((u) => (
                <option key={u.id} value={u.id}>
                  [{u.role.toUpperCase()}] {u.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                ['leaderboard', 'Leaderboard'],
                ['clubs', 'Clubs'],
                ['verification', 'Verification'],
                ['telegram_bot', 'Telegram Bot'],
                ['health_risk', 'Health & Risk'],
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

        {/* Main Content Padding Container (Figma #1353:10928 padding: 32px, gap: 32px) */}
        <main className="flex-1 p-5 sm:p-8 space-y-7 max-w-[1440px] w-full mx-auto">
          {/* Figma Top Alert Banner (#1353:10929) with Concentric Featured Icon Outline & Downloaded rocket-01.svg */}
          {showBanner && (
            <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
              <div className="flex items-start sm:items-center gap-3.5">
                {/* Figma Featured icon outline (concentric 2px rings around rocket-01.svg) */}
                <div className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[#181C21] border-2 border-[#14C7C3]/30 shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center border border-[#14C7C3]/60 text-[#14C7C3]">
                    <FigmaRocketIcon className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#E0FFF9]">
                    <span>
                      Circular-Economy Student Enterprise Seed Pool Active Across 15 Pilot Schools
                    </span>
                    <span className="figma-emerald-pill px-2 py-0.2 text-[11px] font-medium">
                      EXIF Geofence Enforced
                    </span>
                  </div>
                  <p className="text-xs text-[#B8F4F3]">
                    Students submit uncompressed Document photos via Telegram (<code className="text-[#E0FFF9]">/log_impact</code>) • Micro logs (&le;$50) auto-award on Teacher approval with a 10% Expert Panel random audit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => setShowFigmaSpecModal(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#181C21] hover:bg-[#095856]/40 text-[#E0FFF9] border border-[#0C7471] transition cursor-pointer"
                >
                  Figma MCP Spec
                </button>
                <button
                  onClick={() => setActiveTab('telegram_bot')}
                  className="figma-skeuomorphic-btn px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Simulate Telegram Entry
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  aria-label="Dismiss alert banner"
                  className="p-1.5 rounded-lg text-[#B8F4F3] hover:text-[#E0FFF9] hover:bg-[#181C21] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Figma Section Header (#1353:10939 — Display sm/Semibold 30px Plus Jakarta Sans) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#095856]">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-[30px] sm:leading-[38px] font-semibold tracking-tight text-[#E0FFF9] font-[var(--font-jakarta)]">
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

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setShowRightPanel((v) => !v)}
                className="hidden xl:inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#1C2126] hover:bg-[#095856]/30 text-[#E0FFF9] border border-[#095856] transition cursor-pointer"
              >
                {showRightPanel ? (
                  <>
                    <PanelRightClose className="w-4 h-4 text-[#14C7C3]" />
                    <span>Hide Live Stream</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-4 h-4 text-[#14C7C3]" />
                    <span>Show Live Stream</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Workspace Component */}
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

      {/* =====================================================================
          PANE 3: FIGMA RIGHT DOCKED SIDE PANEL (#1:385625 from UL6MdGaqnCWJiejfZj9CUG)
         ===================================================================== */}
      {showRightPanel && (
        <aside className="w-80 shrink-0 bg-[#161B26] border-l border-[#1F242F] hidden xl:flex flex-col justify-between sticky top-0 h-screen">
          {/* Frosted Card Header (#1:385627 — rgba(12, 17, 29, 0.9) backdrop-blur) */}
          <div className="px-5 py-4 bg-[#0C111D]/90 backdrop-blur-md border-b border-[#1F242F] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#17B26A] ring-4 ring-[#17B26A]/20" />
              <div>
                <h2 className="text-xs font-semibold text-[#ECECED] font-[var(--font-jakarta)]">
                  Telegram & Audit Feed
                </h2>
                <p className="text-[11px] text-[#94969C]">
                  Real-time Bot & Trigger Events
                </p>
              </div>
            </div>
            <span className="figma-code-chip px-2 py-0.5 text-[10px] font-mono text-[#14C7C3]">
              LIVE
            </span>
          </div>

          {/* Scrollable Message & Audit Stream (#1:385639) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Section 1: Outbound Telegram Resolution & Confirmation Messages */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#94969C]">
                <span>Client 1: @CircularClubsBot</span>
                <span className="text-[#14C7C3] font-mono">
                  {snapshot.telegramMessages.length} msgs
                </span>
              </div>

              {snapshot.telegramMessages.slice(0, 4).map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl bg-[#1C2126] border border-[#095856] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#B8F4F3]">
                    <span className="font-semibold text-[#E0FFF9]">
                      To: {msg.student_name}
                    </span>
                    <span className="font-mono text-[10px] text-[#14C7C3]">
                      {msg.type}
                    </span>
                  </div>
                  <p className="text-[#B8F4F3] text-[11px] leading-relaxed line-clamp-3">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Section 2: Postgres Trigger Audit Stream (trg_impact_logs_status_change) */}
            <div className="space-y-2.5 pt-2 border-t border-[#1F242F]">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#94969C]">
                <span>Postgres audit_logs Trigger</span>
                <span className="text-[#75E0A7] font-mono">
                  {snapshot.auditLogs.length} rows
                </span>
              </div>

              {snapshot.auditLogs.slice(0, 5).map((audit) => (
                <div
                  key={audit.id}
                  className="p-3 rounded-xl bg-[#0C111D] border border-[#1F242F] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1C2126] text-[#14C7C3] border border-[#095856]">
                      {audit.previous_status ?? 'NEW'} → {audit.new_status}
                    </span>
                    <span className="text-[10px] text-[#94969C] uppercase font-mono">
                      {audit.actor_role}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#ECECED] font-medium pt-0.5">
                    {audit.action_type}
                  </p>
                  {audit.reason_or_notes && (
                    <p className="text-[11px] text-[#94969C] line-clamp-2">
                      {audit.reason_or_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Message Input / Quick Action Bar (#1:385679) */}
          <div className="p-4 border-t border-[#1F242F] bg-[#0C111D] space-y-2">
            <button
              onClick={() => setActiveTab('telegram_bot')}
              className="w-full py-2 px-3 rounded-lg bg-[#1C2126] hover:bg-[#095856]/40 border border-[#095856] text-xs font-semibold text-[#E0FFF9] flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#14C7C3]" />
                <span>Send /log_impact EXIF File</span>
              </span>
              <Send className="w-3.5 h-3.5 text-[#14C7C3]" />
            </button>
          </div>
        </aside>
      )}

      {/* =====================================================================
          FIGMA MCP DESIGN SPECIFICATION MODAL
         ===================================================================== */}
      {showFigmaSpecModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C2126] border border-[#095856] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#095856] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#181C21] border border-[#095856] flex items-center justify-center text-[#14C7C3]">
                  <Figma className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                    Figma MCP Browsed Design System & Extracted Assets
                  </h3>
                  <p className="text-xs text-[#B8F4F3]">
                    Fetched via <code className="text-[#14C7C3]">mcp_figma_get_figma_data</code> &{' '}
                    <code className="text-[#14C7C3]">mcp_figma_download_figma_images</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFigmaSpecModal(false)}
                className="p-1.5 rounded-lg text-[#B8F4F3] hover:text-[#E0FFF9] bg-[#181C21] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#181C21] border border-[#095856] space-y-2">
                <div className="font-semibold text-[#14C7C3] uppercase tracking-wider">
                  1. Leaderboard File (T0J4d7sapn2no8t7ixmNY3)
                </div>
                <p className="text-[#B8F4F3]">
                  Node <code className="text-[#E0FFF9]">#677:7696</code> →{' '}
                  <code className="text-[#E0FFF9]">Leaderboard - v1.4 (#1353:10928)</code>
                </p>
                <ul className="space-y-1 text-[#B8F4F3]">
                  <li>• Canvas: <code className="text-[#E0FFF9]">#181C21</code> • Cards: <code className="text-[#E0FFF9]">#1C2126</code></li>
                  <li>• Border Stroke: <code className="text-[#E0FFF9]">1px solid #095856</code></li>
                  <li>• Display Font: <code className="text-[#E0FFF9]">Plus Jakarta Sans</code> + <code className="text-[#E0FFF9]">Inter</code></li>
                  <li>• Hero Cards: <code className="text-[#E0FFF9]">168px</code> height + Skeuomorphic Pill CTA</li>
                  <li>• Table: <code className="text-[#E0FFF9]">44px</code> header, <code className="text-[#E0FFF9]">72px</code> rows</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#181C21] border border-[#095856] space-y-2">
                <div className="font-semibold text-[#14C7C3] uppercase tracking-wider">
                  2. 3-Pane Shell (UL6MdGaqnCWJiejfZj9CUG)
                </div>
                <p className="text-[#B8F4F3]">
                  Node <code className="text-[#E0FFF9]">#1:385555</code> →{' '}
                  <code className="text-[#E0FFF9]">❖ Dashboards 01</code>
                </p>
                <ul className="space-y-1 text-[#B8F4F3]">
                  <li>• Left Sidebar (<code className="text-[#E0FFF9]">#1:385556</code>): <code className="text-[#E0FFF9]">#0C111D</code></li>
                  <li>• Active Nav Pill: <code className="text-[#E0FFF9]">#1F242F</code> + <code className="text-[#E0FFF9]">#14C7C3</code> indicator</li>
                  <li>• Right Side Panel (<code className="text-[#E0FFF9]">#1:385625</code>): <code className="text-[#E0FFF9]">#161B26</code></li>
                  <li>• Frosted Header (<code className="text-[#E0FFF9]">#1:385627</code>): <code className="text-[#E0FFF9]">backdrop-blur</code></li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#181C21] border border-[#095856] space-y-2.5">
              <div className="text-xs font-semibold text-[#E0FFF9]">
                Downloaded Figma Vector SVGs (<code className="text-[#14C7C3]">src/components/FigmaIcons.tsx</code>)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-[#14C7C3] text-[#14C7C3]">
                  <FigmaRocketIcon className="w-4 h-4" /> rocket-01.svg (#1353:10932)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border-[1.5px] border-[#FDB022] text-[#FDB022]">
                  <FigmaTierPlatinumIcon className="w-4 h-4" /> tier-platinum.svg (#1353:11035)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border-[1.5px] border-[#F670C7] text-[#F670C7]">
                  <FigmaTierGoldIcon className="w-4 h-4" /> tier-gold.svg (#1353:11039)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border-[1.5px] border-[#14C7C3] text-[#14C7C3]">
                  <FigmaTierSilverIcon className="w-4 h-4" /> tier-silver.svg (#1353:11044)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border-[1.5px] border-[#8997A9] text-[#B8F4F3]">
                  <FigmaTierBronzeIcon className="w-4 h-4" /> tier-bronze.svg (#1353:11049)
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowFigmaSpecModal(false)}
                className="figma-skeuomorphic-btn px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
