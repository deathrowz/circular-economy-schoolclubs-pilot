'use client';

import React, { useState } from 'react';
import {
  AlertOctagon,
  Bot,
  CameraOff,
  CheckCircle2,
  CloudUpload,
  FileCheck,
  FileText,
  Gavel,
  MessageSquareWarning,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  Club,
  DocumentCategory,
  ImpactLog,
  School,
  TelegramBotOutboundMessage,
  UserProfile,
  UserRole,
} from '@/types/domain';
import { postTelegramWebhookClient } from '@/lib/client/platform-bridge';
import { formatLkr } from '@/lib/gamification/engine';

interface TelegramBotWorkbenchProps {
  clubs: Club[];
  schools: School[];
  users: UserProfile[];
  impactLogs: ImpactLog[];
  telegramMessages: TelegramBotOutboundMessage[];
  initialRole?: 'student' | 'teacher' | 'expert';
  initialClubId?: string;
  onRefreshSnapshot: (snapshot: any) => void;
  onNavigateToVerification: () => void;
}

interface ChatBubble {
  id: string;
  sender: 'student' | 'teacher' | 'expert' | 'bot';
  text: string;
  timestamp: string;
  badge?: string;
  isError?: boolean;
}

export function TelegramBotWorkbench({
  clubs,
  schools,
  users,
  impactLogs,
  telegramMessages,
  initialRole,
  initialClubId,
  onRefreshSnapshot,
  onNavigateToVerification,
}: TelegramBotWorkbenchProps) {
  const [selectedClubId, setSelectedClubId] = useState<string>(initialClubId || 'club-01');
  const [activeBotRole, setActiveBotRole] = useState<'student' | 'teacher' | 'expert'>(
    initialRole || 'teacher'
  );

  React.useEffect(() => {
    if (initialRole) {
      setActiveBotRole(initialRole);
    }
  }, [initialRole]);

  React.useEffect(() => {
    if (initialClubId) {
      setSelectedClubId(initialClubId);
    }
  }, [initialClubId]);

  const [botStage, setBotStage] = useState<string>('IDLE');
  const [chatInput, setChatInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [selectedInvoiceLogId, setSelectedInvoiceLogId] = useState<string>('log-102');
  const [botQuickActions, setBotQuickActions] = useState<Array<{ label: string; value: string; variant?: string }>>([
    { label: '📸 Log Activity', value: '/log_impact', variant: 'primary' },
    { label: '📊 Club Status', value: '/status', variant: 'secondary' },
    { label: '🏆 Leaderboard', value: '/leaderboard', variant: 'accent' },
    { label: '❓ Photo Guide', value: '/photo_guide', variant: 'secondary' },
  ]);

  const selectedClub = clubs.find((c) => c.id === selectedClubId) || clubs[0];
  const selectedSchool =
    schools.find((s) => s.id === selectedClub.school_id) || schools[0];

  const currentActor = (() => {
    if (activeBotRole === 'expert') {
      return users.find((u) => u.role === 'expert_admin') || users[1];
    }
    if (activeBotRole === 'teacher') {
      return (
        users.find((u) => u.role === 'teacher' && u.school_id === selectedSchool.id) ||
        users.find((u) => u.role === 'teacher') ||
        users[3]
      );
    }
    return (
      users.find((u) => u.role === 'student' && u.school_id === selectedSchool.id) ||
      users.find((u) => u.role === 'student') ||
      users[0]
    );
  })();

  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text:
        `Ayubowan / Vanakkam! Welcome to the Haritha Pasal Circular Enterprise Telegram Gateway (${selectedClub.name} • ${selectedSchool.name}).\n\n` +
        `📋 COMPLETE VERIFICATION PIPELINE ACTIVE:\n` +
        `1. Students: Touch buttons for /log_impact & choices without typing\n` +
        `2. Teachers: Upload verified invoices & receipts via /upload_invoice <log_id>\n` +
        `3. GIZ & Experts: Review invoices & submit selection criteria scores via /score <log_id> ...\n\n` +
        `Switch the role tab above to simulate any step of the pipeline!`,
      timestamp: '09:30 AM',
      badge: 'Telegram Gateway Ready',
    },
  ]);

  const appendBubble = (bubble: Omit<ChatBubble, 'id' | 'timestamp'>) => {
    setChatHistory((prev) => [
      ...prev,
      {
        ...bubble,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  const sendWebhookUpdate = async (
    payload: Record<string, any>,
    displayMessage: string,
    badge?: string,
    senderRole: 'student' | 'teacher' | 'expert' = activeBotRole
  ) => {
    setIsSending(true);
    appendBubble({
      sender: senderRole,
      text: displayMessage,
      badge: badge || `${senderRole.toUpperCase()} ACTION`,
    });

    try {
      const data = await postTelegramWebhookClient({
        chatId: currentActor.telegram_user_id || 800101,
        actorId: currentActor.id,
        actorRole: currentActor.role,
        studentId: currentActor.role === 'student' ? currentActor.id : undefined,
        clubId: selectedClub.id,
        ...payload,
      });

      if (data.stage) setBotStage(data.stage);
      if (data.quickActions) setBotQuickActions(data.quickActions);
      if (data.snapshot) onRefreshSnapshot(data.snapshot);

      appendBubble({
        sender: 'bot',
        text: data.botReply || data.error || 'No response from bot.',
        badge: data.scoredPoints
          ? `🏆 SCORED VIA TELEGRAM: +${data.scoredPoints} pts posted to Leaderboard!`
          : data.attachedDocId
          ? `📄 INVOICE VERIFIED & FORWARDED TO GIZ/EXPERTS`
          : data.createdLogId
          ? `Logged ${data.createdLogId} (Pending Teacher)`
          : undefined,
        isError: !data.ok,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;
    const text = chatInput.trim();
    setChatInput('');
    await sendWebhookUpdate({ text }, text);
  };

  const pendingTeacherLogs = impactLogs.filter(
    (l) => l.school_id === selectedSchool.id && l.status !== 'approved'
  );

  const logsWithDocs = impactLogs.filter(
    (l) => l.verified_documents && l.verified_documents.length > 0
  );

  return (
    <div className="space-y-6">
      {/* School Club & Pipeline Role Selector Header */}
      <div className="hai-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#005FA3] text-[#9CF2F2]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111010] font-[var(--font-jakarta)]">
                Telegram Invoice, Receipt &amp; Criteria Scoring Gateway
              </h2>
              <p className="text-xs text-[#111010]/70">
                End-to-end pipeline: Student entry → Teacher invoice upload → GIZ dispatch → Expert criteria scoring via Telegram
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              aria-label="Select School Club"
              className="hai-input px-3.5 py-2 text-xs text-[#111010] font-semibold"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.school_name} — {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={onNavigateToVerification}
              className="hai-btn-secondary px-3.5 py-2 text-xs cursor-pointer"
            >
              Dashboard Approvals →
            </button>
          </div>
        </div>

        {/* Pipeline Role Mode Indicator */}
        <div className="pt-2 border-t border-[#111010]/12 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-[#005FA3] uppercase tracking-wider">
              {activeBotRole === 'student'
                ? 'Student Touch Gateway • Photo & Waste Logger'
                : activeBotRole === 'teacher'
                ? 'Teacher Gateway • Invoice & Scale Ticket Upload'
                : 'Expert Gateway • Scoring Dossier Review'}
            </span>
          </div>

          <div className="text-xs text-[#111010]/70 font-mono">
            Sender: <strong className="text-[#005FA3]">{currentActor.full_name}</strong> ({currentActor.role})
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Telegram Chat Gateway (7 cols) */}
        <div className="lg:col-span-7 hai-card flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#005FA3] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>@HarithaPasalBot</span>
                <span className="px-2 py-0.2 rounded-full bg-[#9CF2F2] text-[#005FA3] font-mono text-[10px] uppercase font-bold">
                  {activeBotRole.toUpperCase()} ACTIVE
                </span>
              </div>
              <div className="text-[11px] text-[#9CF2F2]">
                {selectedSchool.name} • Actor: {currentActor.full_name.split(' (')[0]}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeBotRole === 'teacher' && (
                <button
                  onClick={() =>
                    sendWebhookUpdate(
                      { text: `/upload_invoice ${selectedInvoiceLogId}` },
                      `/upload_invoice ${selectedInvoiceLogId}`,
                      'Teacher Invoice Prompt'
                    )
                  }
                  className="hai-btn-on-zeal px-3 py-1 text-xs font-mono cursor-pointer"
                >
                  /upload_invoice
                </button>
              )}
              {activeBotRole === 'expert' && (
                <button
                  onClick={() =>
                    sendWebhookUpdate(
                      { text: '/expert_queue' },
                      '/expert_queue',
                      'Expert Queue Check'
                    )
                  }
                  className="hai-btn-on-zeal px-3 py-1 text-xs font-mono cursor-pointer"
                >
                  /expert_queue
                </button>
              )}
              {activeBotRole === 'student' && (
                <button
                  onClick={() =>
                    sendWebhookUpdate({ text: '/log_impact' }, '/log_impact')
                  }
                  className="hai-btn-on-zeal px-3 py-1 text-xs font-mono cursor-pointer"
                >
                  /log_impact
                </button>
              )}
            </div>
          </div>

          {/* Chat Bubbles */}
          <div className="p-5 space-y-3.5 h-[370px] overflow-y-auto bg-[#F0F3F5]">
            {chatHistory.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${
                  item.sender !== 'bot' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-[16px_16px_16px_4px] px-4 py-3 text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                    item.sender === 'expert'
                      ? 'bg-[#14494F] text-white font-medium'
                      : item.sender === 'teacher'
                      ? 'bg-[#005FA3] text-white font-medium'
                      : item.sender === 'student'
                      ? 'bg-[#0B3E6E] text-white font-medium'
                      : item.isError
                      ? 'bg-rose-50 border border-rose-300 text-rose-900'
                      : 'bg-[#FFFFFF] border border-[#111010]/12 text-[#111010]'
                  }`}
                >
                  {item.badge && (
                    <div className="text-[10px] font-mono uppercase mb-1 pb-1 border-b border-current/20 font-bold">
                      {item.badge}
                    </div>
                  )}
                  {item.text}
                </div>
                <span className="text-[10px] text-[#111010]/60 mt-1 px-1">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>

          {/* Action Pad tailored to Active Role */}
          <div className="bg-[#FFFFFF] border-t border-[#111010]/12 p-4 space-y-3">
            {/* 1. TEACHER INVOICE UPLOAD ACTION PAD */}
            {activeBotRole === 'teacher' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#005FA3]">
                  <span>Teacher Quick Document Uploads for {selectedSchool.name}:</span>
                  <select
                    value={selectedInvoiceLogId}
                    onChange={(e) => setSelectedInvoiceLogId(e.target.value)}
                    className="hai-input px-2 py-1 text-xs"
                    aria-label="Select Target Log for Invoice Upload"
                  >
                    {pendingTeacherLogs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id}: {l.activity_title.slice(0, 28)} ({formatLkr(l.revenue_usd)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    disabled={isSending}
                    onClick={() =>
                      sendWebhookUpdate(
                        {
                          actorId: currentActor.id,
                          actorRole: 'teacher',
                          docCategory: 'sales_invoice',
                          verifiedAmountLkr: 57000,
                          document: {
                            fileName: `INVOICE_${selectedSchool.code}_OFFICIAL_SALES.PDF`,
                            mimeType: 'application/pdf',
                          },
                        },
                        `📎 [Teacher Uploaded Verified Invoice: INVOICE_${selectedSchool.code}_OFFICIAL_SALES.PDF (Rs. 57,000)]`,
                        'Teacher Invoice Upload'
                      )
                    }
                    className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 border border-[#005FA3]/30 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[#005FA3] font-bold text-xs">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>1. Sales Invoice (PDF)</span>
                    </div>
                    <div className="text-[10px] text-[#111010]/70 mt-0.5">
                      Auto-forwards to GIZ &amp; Experts
                    </div>
                  </button>

                  <button
                    disabled={isSending}
                    onClick={() =>
                      sendWebhookUpdate(
                        {
                          actorId: currentActor.id,
                          actorRole: 'teacher',
                          docCategory: 'official_receipt',
                          verifiedAmountLkr: 11400,
                          document: {
                            fileName: `BOOKSHOP_RECEIPT_${selectedSchool.code}.JPG`,
                            mimeType: 'image/jpeg',
                          },
                        },
                        `📎 [Teacher Uploaded Verified Receipt: BOOKSHOP_RECEIPT_${selectedSchool.code}.JPG (Rs. 11,400)]`,
                        'Teacher Receipt Upload'
                      )
                    }
                    className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] border border-[#111010]/15 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[#111010] font-bold text-xs">
                      <FileCheck className="w-3.5 h-3.5 shrink-0 text-[#14494F]" />
                      <span>2. Pola Receipt (JPG)</span>
                    </div>
                    <div className="text-[10px] text-[#111010]/65 mt-0.5">
                      Teacher certified on campus
                    </div>
                  </button>

                  <button
                    disabled={isSending}
                    onClick={() =>
                      sendWebhookUpdate(
                        {
                          actorId: currentActor.id,
                          actorRole: 'teacher',
                          docCategory: 'waste_scale_ticket',
                          document: {
                            fileName: `WEIGHBRIDGE_SCALE_TICKET_${selectedSchool.code}.PDF`,
                            mimeType: 'application/pdf',
                          },
                        },
                        `📎 [Teacher Uploaded Scale Ticket: WEIGHBRIDGE_SCALE_TICKET_${selectedSchool.code}.PDF]`,
                        'Waste Scale Ticket'
                      )
                    }
                    className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] border border-[#111010]/15 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[#111010] font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#005FA3]" />
                      <span>3. Scale Ticket (PDF)</span>
                    </div>
                    <div className="text-[10px] text-[#111010]/65 mt-0.5">
                      Certified kg scale weight
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 2. EXPERT SELECTION CRITERIA SCORING ACTION PAD */}
            {activeBotRole === 'expert' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#005FA3]">
                  <span>Expert Scoring Actions via Telegram:</span>
                  <span className="font-mono text-[11px] text-[#14494F]">
                    Target: {selectedInvoiceLogId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    disabled={isSending}
                    onClick={() =>
                      sendWebhookUpdate(
                        {
                          actorId: 'usr-expert-01',
                          actorRole: 'expert_admin',
                          text: `/review ${selectedInvoiceLogId}`,
                        },
                        `/review ${selectedInvoiceLogId}`,
                        'Expert Review Dossier',
                        'expert'
                      )
                    }
                    className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] border border-[#111010]/15 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[#005FA3] font-bold text-xs">
                      <FileCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>1. Inspect Invoice Dossier</span>
                    </div>
                    <div className="text-[10px] text-[#111010]/65 mt-0.5">
                      Review invoice document &amp; metrics
                    </div>
                  </button>

                  <button
                    disabled={isSending}
                    onClick={() =>
                      sendWebhookUpdate(
                        {
                          actorId: 'usr-expert-01',
                          actorRole: 'expert_admin',
                          text: `/score ${selectedInvoiceLogId} 92 88 86 94 95 90`,
                        },
                        `/score ${selectedInvoiceLogId} 92 88 86 94 95 90`,
                        'Telegram Criteria Scores',
                        'expert'
                      )
                    }
                    className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#E9F5F4] hover:bg-[#9CF2F2]/60 border border-[#14494F]/30 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[#14494F] font-bold text-xs">
                      <Gavel className="w-3.5 h-3.5 shrink-0" />
                      <span>2. Submit 6 Scores via Telegram</span>
                    </div>
                    <div className="text-[10px] text-[#14494F]/80 mt-0.5">
                      Releases points live to Dashboard!
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 3. STUDENT ACTIVITY SUBMISSION ACTION PAD */}
            {activeBotRole === 'student' && (
              <div className="space-y-3">
                {/* Contextual Quick-Action Buttons / Choice Chips */}
                {botQuickActions.length > 0 && (
                  <div className="space-y-1.5 pb-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#005FA3]">
                      <span>✨ Tap to Select (No typing required):</span>
                      {botStage !== 'IDLE' && (
                        <button
                          onClick={() => sendWebhookUpdate({ text: '/cancel' }, '❌ Cancel', 'Cancel Flow', 'student')}
                          className="text-rose-700 hover:underline cursor-pointer text-[10px]"
                        >
                          ❌ Cancel Current Flow
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {botQuickActions.map((qa) => (
                        <button
                          key={qa.label}
                          disabled={isSending}
                          onClick={() => sendWebhookUpdate({ text: qa.value }, qa.label, 'Quick Tap', 'student')}
                          className={`px-3 py-1.5 rounded-[8px_8px_8px_2px] text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                            qa.variant === 'danger'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                              : qa.variant === 'accent'
                              ? 'bg-[#14494F] hover:bg-[#005FA3] text-white border border-[#14494F]'
                              : qa.variant === 'secondary'
                              ? 'bg-[#F0F3F5] hover:bg-[#E6F1FA] text-[#111010] border border-[#111010]/15'
                              : 'bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 text-[#005FA3] border border-[#005FA3]/30'
                          }`}
                        >
                          <span>{qa.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photo Simulation Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    disabled={isSending}
                    onClick={() =>
                      sendWebhookUpdate(
                        {
                          actorRole: 'student',
                          document: {
                            fileName: `${selectedSchool.code}_ACTIVITY.JPG`,
                            mimeType: 'image/jpeg',
                            simulatedExif: {
                              timestamp: new Date().toISOString(),
                              lat: Number((selectedSchool.campus_lat + 0.0001).toFixed(6)),
                              lng: Number((selectedSchool.campus_lng - 0.0001).toFixed(6)),
                              deviceMake: 'Samsung',
                              deviceModel: 'Galaxy A54 (Uncompressed)',
                            },
                          },
                        },
                        `📎 [Student Sent Valid EXIF File: ${selectedSchool.code}_ACTIVITY.JPG]`,
                        'Valid EXIF File',
                        'student'
                      )
                    }
                    className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 border border-[#005FA3]/30 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[#005FA3] font-bold text-xs">
                      <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                      <span>Send School Activity File</span>
                    </div>
                    <div className="text-[10px] text-[#111010]/70 mt-0.5">
                      Starts 4-step activity logging
                    </div>
                  </button>

                  <button
                    disabled={isSending}
                    onClick={() =>
                      sendWebhookUpdate(
                        { sentAsCompressedPhoto: true },
                        '📷 [Sent Normal Compressed Photo]',
                        'Compressed Photo',
                        'student'
                      )
                    }
                    className="p-2.5 rounded-[10px_10px_10px_2px] bg-rose-50 hover:bg-rose-100 border border-rose-300 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                      <CameraOff className="w-3.5 h-3.5 shrink-0" />
                      <span>Test Compressed Photo</span>
                    </div>
                    <div className="text-[10px] text-rose-700/80 mt-0.5">
                      Bot rejects (EXIF stripped)
                    </div>
                  </button>
                </div>

                {/* Persistent Student Touch Keyboard (when IDLE) */}
                {botStage === 'IDLE' && (
                  <div className="pt-1 border-t border-[#111010]/10">
                    <div className="text-[10px] font-bold text-[#005FA3] uppercase tracking-wider mb-1.5">
                      Telegram Touch Keyboard:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={isSending}
                        onClick={() => sendWebhookUpdate({ text: '/log_impact' }, '📸 Log New Activity', 'Touch Keyboard', 'student')}
                        className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#005FA3] text-[#9CF2F2] font-bold text-xs hover:bg-[#0B3E6E] transition cursor-pointer text-left flex items-center justify-between"
                      >
                        <span>📸 Log New Activity</span>
                        <span className="text-[10px] text-white/80">Tap here</span>
                      </button>
                      <button
                        disabled={isSending}
                        onClick={() => sendWebhookUpdate({ text: '/status' }, '📊 Our Club Status', 'Touch Keyboard', 'student')}
                        className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] text-[#111010] font-bold text-xs border border-[#111010]/15 transition cursor-pointer text-left flex items-center justify-between"
                      >
                        <span>📊 Our Club Status</span>
                        <span className="text-[10px] text-[#005FA3]">Summary</span>
                      </button>
                      <button
                        disabled={isSending}
                        onClick={() => sendWebhookUpdate({ text: '/leaderboard' }, '🏆 View Leaderboard', 'Touch Keyboard', 'student')}
                        className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#E9F5F4] hover:bg-[#9CF2F2]/60 text-[#14494F] font-bold text-xs border border-[#14494F]/30 transition cursor-pointer text-left flex items-center justify-between"
                      >
                        <span>🏆 View Leaderboard</span>
                        <span className="text-[10px] text-[#14494F]">Rankings</span>
                      </button>
                      <button
                        disabled={isSending}
                        onClick={() => sendWebhookUpdate({ text: '/photo_guide' }, '❓ How to Send Photo', 'Touch Keyboard', 'student')}
                        className="py-2.5 px-3 rounded-[10px_10px_10px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] text-[#111010] font-bold text-xs border border-[#111010]/15 transition cursor-pointer text-left flex items-center justify-between"
                      >
                        <span>❓ How to Send Photo</span>
                        <span className="text-[10px] text-[#111010]/60">Guide</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendText} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  activeBotRole === 'expert'
                    ? 'Enter: /score log-102 92 88 86 94 95 90 or /review log-102...'
                    : activeBotRole === 'teacher'
                    ? 'Enter: /upload_invoice log-102 or /invoices...'
                    : 'Type /log_impact or reply here...'
                }
                className="flex-1 hai-input px-3.5 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={isSending}
                className="hai-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Teacher Verified Documents & GIZ/Expert Notifications Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Teacher Invoices & Receipts Feed */}
          <div className="hai-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#005FA3] font-bold text-xs uppercase">
                <FileCheck className="w-4 h-4" />
                <span>Verified Invoices &amp; Receipts ({logsWithDocs.length})</span>
              </div>
              <span className="hai-cyan-pill text-[11px] font-bold">
                Forwarded to GIZ
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {logsWithDocs.length === 0 ? (
                <div className="hai-chrome-box p-4 text-xs text-[#111010]/70 text-center">
                  No invoices uploaded yet. Switch to Teacher Mode to upload an invoice for GIZ verification!
                </div>
              ) : (
                logsWithDocs.map((log) => (
                  <div key={log.id} className="hai-chrome-box p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111010]">
                        [{log.id}] {log.school_code} — {log.activity_title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'approved'
                            ? 'bg-[#005FA3] text-[#9CF2F2]'
                            : 'bg-[#9CF2F2] text-[#005FA3]'
                        }`}
                      >
                        {log.status === 'approved' ? '✓ Expert Scored' : 'Awaiting Expert Score'}
                      </span>
                    </div>

                    {log.verified_documents?.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white border border-[#111010]/10 rounded-[8px_8px_8px_0px] p-2.5 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-[#005FA3]">
                          <span>📄 {doc.file_name}</span>
                          <span>Rs. {(doc.verified_amount_lkr || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-[#111010]/70">
                          Teacher: {doc.verified_by_teacher_name} •{' '}
                          {doc.uploaded_via_telegram && 'Uploaded via Telegram'}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => {
                          setSelectedInvoiceLogId(log.id);
                          setActiveBotRole('expert');
                          sendWebhookUpdate(
                            {
                              actorId: 'usr-expert-01',
                              actorRole: 'expert_admin',
                              text: `/score ${log.id} 92 88 86 94 95 90`,
                            },
                            `/score ${log.id} 92 88 86 94 95 90`,
                            'Expert Telegram Score',
                            'expert'
                          );
                        }}
                        className="hai-btn-primary px-3 py-1 text-[11px] cursor-pointer"
                      >
                        Score via Telegram (/score {log.id}) →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Telegram Notifications Feed */}
          <div className="hai-card p-6 space-y-3.5">
            <div className="flex items-center gap-2 text-[#005FA3] font-bold text-xs uppercase">
              <MessageSquareWarning className="w-4 h-4" />
              <span>GIZ &amp; Expert Telegram Broadcast Feed</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {telegramMessages.slice(0, 6).map((msg) => (
                <div key={msg.id} className="hai-chrome-box p-3 text-xs space-y-1">
                  <div className="font-bold text-[#111010] flex items-center justify-between">
                    <span>To: {msg.student_name}</span>
                    <span className="font-mono text-[10px] text-[#111010]/60">
                      {new Date(msg.sent_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-[#111010]/75 whitespace-pre-wrap text-[11px] leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
