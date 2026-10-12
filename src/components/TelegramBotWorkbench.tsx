'use client';

import React, { useState } from 'react';
import {
  AlertOctagon,
  Bot,
  CameraOff,
  CloudUpload,
  MessageSquareWarning,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  Club,
  ImpactLog,
  School,
  TelegramBotOutboundMessage,
  UserProfile,
} from '@/types/domain';
import { postTelegramWebhookClient } from '@/lib/client/platform-bridge';

interface TelegramBotWorkbenchProps {
  clubs: Club[];
  schools: School[];
  users: UserProfile[];
  impactLogs: ImpactLog[];
  telegramMessages: TelegramBotOutboundMessage[];
  onRefreshSnapshot: (snapshot: any) => void;
  onNavigateToVerification: () => void;
}

interface ChatBubble {
  id: string;
  sender: 'student' | 'bot';
  text: string;
  timestamp: string;
  badge?: string;
  isError?: boolean;
}

export function TelegramBotWorkbench({
  clubs,
  schools,
  impactLogs,
  telegramMessages,
  onRefreshSnapshot,
  onNavigateToVerification,
}: TelegramBotWorkbenchProps) {
  const [selectedClubId, setSelectedClubId] = useState<string>('club-01');
  const [botStage, setBotStage] = useState<string>('IDLE');
  const [chatInput, setChatInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const selectedClub = clubs.find((c) => c.id === selectedClubId) || clubs[0];
  const selectedSchool =
    schools.find((s) => s.id === selectedClub.school_id) || schools[0];

  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text:
        `👋 Welcome to the Circular-Economy Student Enterprise Bot (${selectedClub.name})!\n\n` +
        `📌 THE METADATA CONSTRAINT:\n` +
        `You MUST send activity photos as uncompressed "Documents/Files" (📎 Attach → File), NOT as standard compressed photos, so EXIF Timestamp and GPS coordinates are preserved.\n\n` +
        `Type /log_impact to begin a new submission or /resubmit log-108 to test the Step 5 Resolution Loop.`,
      timestamp: '11:20 AM',
      badge: 'Telegram Webhook Ready',
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
    studentDisplayMessage: string,
    studentBadge?: string
  ) => {
    setIsSending(true);
    appendBubble({
      sender: 'student',
      text: studentDisplayMessage,
      badge: studentBadge,
    });

    try {
      const data = await postTelegramWebhookClient({
        chatId: 800101,
        studentId: 'usr-student-01',
        clubId: selectedClub.id,
        ...payload,
      });

      if (data.stage) setBotStage(data.stage);
      if (data.snapshot) onRefreshSnapshot(data.snapshot);

      appendBubble({
        sender: 'bot',
        text: data.botReply || data.error || 'No response from bot.',
        badge: data.s3Uploaded
          ? `S3 Uploaded (${data.s3Uploaded.mode})`
          : data.createdLogId
          ? `Created ${data.createdLogId} (status: pending)`
          : data.rejectedReason
          ? `Rejected: ${data.rejectedReason}`
          : `Stage: ${data.stage || 'IDLE'}`,
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

  // Rejected logs available for Step 5 Resolution Loop Resubmission
  const rejectedLogs = impactLogs.filter((l) => l.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Architecture Explainer Header */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#181C21] border border-[#095856] text-[#14C7C3] shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                Client 1: Node.js Telegram Bot & EXIF Metadata Pipeline
              </h2>
              <span className="figma-emerald-pill px-2.5 py-0.5 text-[11px] font-mono">
                POST /api/telegram/webhook
              </span>
            </div>
            <p className="text-xs text-[#B8F4F3] mt-1 leading-relaxed">
              Test the complete 6-step student workflow: (1) Command listener → (2) Uncompressed Document vs. Compressed Photo filter → (3) Binary EXIF Timestamp & GPS parser → (4) S3 Presigned/SDK upload → (5) Contextual follow-up questions → (6) POST to Supabase as <code className="text-[#14C7C3]">status: pending</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            aria-label="Select Club for Telegram Simulator"
            className="bg-[#181C21] border border-[#095856] rounded-lg px-3 py-2 text-xs text-[#E0FFF9] font-semibold focus:outline-none focus:border-[#14C7C3]"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.school_code}: {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={onNavigateToVerification}
            className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Open Teacher Queue →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Telegram Bot Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-[#1C2126] border border-[#095856] rounded-xl flex flex-col overflow-hidden shadow-lg">
          {/* Telegram Header Bar */}
          <div className="bg-[#0C111D] border-b border-[#095856] px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#14C7C3] flex items-center justify-center text-[#074140] font-black text-xs">
                TG
              </div>
              <div>
                <div className="text-xs font-semibold text-[#E0FFF9] flex items-center gap-2 font-[var(--font-jakarta)]">
                  <span>@CircularEnterpriseBot</span>
                  <span className="figma-code-chip text-[10px] px-1.5 py-0.2 font-mono text-[#14C7C3]">
                    State: {botStage}
                  </span>
                </div>
                <div className="text-[11px] text-[#B8F4F3]">
                  Active Club: {selectedClub.name} ({selectedSchool.code} Campus: {selectedSchool.campus_lat.toFixed(4)}, {selectedSchool.campus_lng.toFixed(4)})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => sendWebhookUpdate({ text: '/log_impact' }, '/log_impact')}
                className="figma-emerald-pill px-2.5 py-1 text-xs font-mono font-semibold cursor-pointer"
              >
                /log_impact
              </button>
              <button
                onClick={() => sendWebhookUpdate({ text: '/status' }, '/status')}
                className="px-2.5 py-1 rounded-full bg-[#181C21] border border-[#095856] hover:border-[#14C7C3] text-[#E0FFF9] text-xs font-mono cursor-pointer"
              >
                /status
              </button>
              <button
                onClick={() => sendWebhookUpdate({ text: '/cancel' }, '/cancel')}
                className="px-2.5 py-1 rounded-full bg-[#181C21] border border-[#095856] text-[#B8F4F3] text-xs font-mono cursor-pointer"
              >
                /cancel
              </button>
            </div>
          </div>

          {/* Chat Messages Window */}
          <div className="p-4 space-y-3 h-[380px] overflow-y-auto bg-[#181C21]">
            {chatHistory.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${
                  item.sender === 'student' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed ${
                    item.sender === 'student'
                      ? 'bg-[#14C7C3] text-[#074140] font-medium rounded-br-none'
                      : item.isError
                      ? 'bg-rose-950/90 border border-rose-500/50 text-rose-200 rounded-bl-none'
                      : 'bg-[#1C2126] border border-[#095856] text-[#E0FFF9] rounded-bl-none'
                  }`}
                >
                  {item.badge && (
                    <div
                      className={`text-[10px] font-mono uppercase tracking-wider mb-1 pb-1 border-b ${
                        item.sender === 'student'
                          ? 'border-[#074140]/20 text-[#074140] font-bold'
                          : item.isError
                          ? 'border-rose-500/30 text-rose-300 font-bold'
                          : 'border-[#095856] text-[#14C7C3] font-bold'
                      }`}
                    >
                      {item.badge}
                    </div>
                  )}
                  {item.text}
                </div>
                <span className="text-[10px] text-[#B8F4F3]/70 mt-1 px-1">{item.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Metadata Constraint & Attachment Test Toolbar */}
          <div className="bg-[#1C2126] border-t border-[#095856] p-3.5 space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#B8F4F3] flex items-center justify-between">
              <span>Simulate Telegram Photo vs. Uncompressed Document Attachment:</span>
              <span className="text-[#14C7C3] font-mono">Step 2, 3 & 4</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Button 1: Send Standard Compressed Photo (MUST REJECT!) */}
              <button
                disabled={isSending}
                onClick={() =>
                  sendWebhookUpdate(
                    { sentAsCompressedPhoto: true },
                    '📷 [Sent Standard Compressed Photo]',
                    'message.photo (EXIF Stripped)'
                  )
                }
                className="p-2.5 rounded-lg bg-[#181C21] hover:bg-rose-950/40 border border-rose-500/40 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                  <CameraOff className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Send Compressed Photo</span>
                </div>
                <div className="text-[10px] text-[#B8F4F3] mt-0.5">
                  Tests Metadata Constraint (Bot MUST reject)
                </div>
              </button>

              {/* Button 2: Send Document Missing EXIF GPS (MUST REJECT!) */}
              <button
                disabled={isSending}
                onClick={() =>
                  sendWebhookUpdate(
                    {
                      document: {
                        fileName: 'NO_GPS_DOCUMENT.JPG',
                        mimeType: 'image/jpeg',
                        simulatedExif: {
                          timestamp: new Date().toISOString(),
                          lat: null,
                          lng: null,
                        },
                      },
                    },
                    '📎 [Sent Document: NO_GPS_DOCUMENT.JPG]',
                    'message.document (Missing GPS)'
                  )
                }
                className="p-2.5 rounded-lg bg-[#181C21] hover:border-[#FDB022] border border-[#FDB022]/40 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#FDB022] font-semibold text-xs">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>2. Doc Missing EXIF GPS</span>
                </div>
                <div className="text-[10px] text-[#B8F4F3] mt-0.5">
                  Tests EXIF Parser (Rejects missing GPS)
                </div>
              </button>

              {/* Button 3: Send Valid Uncompressed Document with On-Campus EXIF */}
              <button
                disabled={isSending}
                onClick={() =>
                  sendWebhookUpdate(
                    {
                      document: {
                        fileName: `${selectedSchool.code}_CAMPUS_EVIDENCE_RAW.JPG`,
                        mimeType: 'image/jpeg',
                        simulatedExif: {
                          timestamp: new Date().toISOString(),
                          lat: Number((selectedSchool.campus_lat + 0.00011).toFixed(6)),
                          lng: Number((selectedSchool.campus_lng - 0.00011).toFixed(6)),
                          deviceMake: 'Apple',
                          deviceModel: 'iPhone 15 Pro (Uncompressed Document)',
                        },
                      },
                    },
                    `📎 [Sent Uncompressed Document: ${selectedSchool.code}_CAMPUS_EVIDENCE_RAW.JPG]`,
                    'message.document (Valid EXIF + S3)'
                  )
                }
                className="p-2.5 rounded-lg bg-[#181C21] hover:border-[#14C7C3] border border-[#095856] text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#75E0A7] font-semibold text-xs">
                  <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                  <span>3. Send Valid EXIF Doc</span>
                </div>
                <div className="text-[10px] text-[#B8F4F3] mt-0.5">
                  Extracts EXIF, uploads S3 & asks questions
                </div>
              </button>
            </div>

            {/* Text Input Form for Contextual Follow-up Questions */}
            <form onSubmit={handleSendText} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  botStage === 'AWAITING_ACTIVITY_TITLE'
                    ? 'Enter activity title (e.g. "Refurbished Solar Charger Batch")...'
                    : botStage === 'AWAITING_WASTE_KG'
                    ? 'Enter kilograms of waste diverted (e.g. "22.5")...'
                    : botStage === 'AWAITING_REVENUE_USD'
                    ? 'Enter revenue in $ USD (e.g. "40" for Micro or "160" for Macro)...'
                    : 'Type a command (/log_impact, /resubmit log-108) or message...'
                }
                className="flex-1 bg-[#181C21] border border-[#095856] rounded-lg px-3.5 py-2 text-xs text-[#E0FFF9] placeholder-[#B8F4F3]/50 focus:outline-none focus:border-[#14C7C3]"
              />
              <button
                type="submit"
                disabled={isSending}
                className="figma-skeuomorphic-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Step 5 Resolution Loop Resubmission & Outbound Bot Notifications (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 5 Resolution Loop Quick Resubmission Panel */}
          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#FDB022] font-semibold text-xs uppercase tracking-wider">
                <RefreshCw className="w-4 h-4" />
                <span>Step 5: Resolution Loop (Single Resubmission)</span>
              </div>
              <span className="figma-code-chip px-2 py-0.5 text-[11px] font-mono text-[#B8F4F3]">
                Max 1 Attempt
              </span>
            </div>

            <p className="text-xs text-[#B8F4F3]">
              When a Teacher or Expert rejects a submission, the bot pushes the exact reason back to the student and unlocks a <strong className="text-[#E0FFF9]">single (1x) resubmission attempt</strong>.
            </p>

            <div className="space-y-2.5">
              {rejectedLogs.map((rLog) => (
                <div
                  key={rLog.id}
                  className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-[#FDB022]">
                      {rLog.id} • {rLog.activity_title}
                    </span>
                    <span className="figma-code-chip px-2 py-0.5 font-mono text-[10px] text-[#E0FFF9]">
                      Attempts used: {rLog.resubmission_count}/1
                    </span>
                  </div>
                  <div className="text-rose-300 text-[11px]">
                    Reason: &ldquo;{rLog.rejection_reason}&rdquo;
                  </div>
                  <button
                    onClick={() =>
                      sendWebhookUpdate(
                        { text: `/resubmit ${rLog.id}` },
                        `/resubmit ${rLog.id}`,
                        'Resolution Loop Command'
                      )
                    }
                    className="w-full py-1.5 rounded-lg bg-[#1C2126] hover:bg-[#095856]/40 border border-[#095856] text-[#14C7C3] font-semibold text-xs transition cursor-pointer"
                  >
                    Trigger `/resubmit {rLog.id}` in Bot →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Outbound Telegram Bot Notification Log */}
          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#14C7C3] font-semibold text-xs uppercase tracking-wider">
                <MessageSquareWarning className="w-4 h-4" />
                <span>Outbound Telegram Bot Notification Stream</span>
              </div>
              <span className="figma-emerald-pill px-2 py-0.2 text-[11px]">Live Push Log</span>
            </div>

            <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
              {telegramMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-[#181C21] border border-[#095856] rounded-lg p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#E0FFF9]">
                      To: {msg.student_name} ({msg.telegram_username})
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full font-mono text-[10px] border ${
                        msg.type === 'REJECTION_RESOLUTION'
                          ? 'border-[#FDB022]/50 text-[#FDB022]'
                          : msg.type === 'FRAUD_PENALTY_NOTICE'
                          ? 'border-rose-500/50 text-rose-300'
                          : msg.type === 'METADATA_REJECTION'
                          ? 'border-rose-500/50 text-rose-300'
                          : 'figma-emerald-pill'
                      }`}
                    >
                      {msg.type}
                    </span>
                  </div>
                  <p className="text-[#B8F4F3] whitespace-pre-wrap text-[11px] leading-relaxed">
                    {msg.text}
                  </p>
                  <div className="text-[10px] text-[#B8F4F3]/60">
                    Dispatched at {new Date(msg.sent_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
