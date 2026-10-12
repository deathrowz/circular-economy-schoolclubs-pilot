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
        `Ayubowan / Vanakkam! Welcome to the Haritha Pasal Student Bot (${selectedClub.name} • ${selectedSchool.name}).\n\n` +
        `📌 IMPORTANT PHOTO RULE:\n` +
        `Always send your activity photo as a "Document / File" (📎 Attach → File), NOT as a normal compressed photo, so the date and school GPS location remain intact.\n\n` +
        `Click /log_impact below to submit a new activity or /resubmit log-108 to resubmit a rejected entry.`,
      timestamp: '09:30 AM',
      badge: 'Telegram Bot Ready',
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
        badge: data.createdLogId
          ? `Submitted ${data.createdLogId} (Pending Teacher)`
          : data.rejectedReason
          ? `Rejected: ${data.rejectedReason}`
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

  const rejectedLogs = impactLogs.filter((l) => l.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* School Club Selector Header */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#181C21] border border-[#095856] text-[#14C7C3]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
              Student Telegram Submission Simulator
            </h2>
            <p className="text-xs text-[#B8F4F3]">
              Students send uncompressed File photos to log waste recycled (kg) and sales (Rs.)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            aria-label="Select School Club"
            className="bg-[#181C21] border border-[#095856] rounded-lg px-3 py-2 text-xs text-[#E0FFF9] font-semibold focus:outline-none focus:border-[#14C7C3]"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.school_name} — {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={onNavigateToVerification}
            className="figma-skeuomorphic-btn px-3.5 py-2 text-xs font-semibold cursor-pointer"
          >
            Teacher Approvals →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat Window (7 cols) */}
        <div className="lg:col-span-7 bg-[#1C2126] border border-[#095856] rounded-xl flex flex-col overflow-hidden">
          <div className="bg-[#0C111D] border-b border-[#095856] px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#E0FFF9]">
                @HarithaPasalBot • {selectedSchool.name} ({selectedSchool.city})
              </div>
              <div className="text-[11px] text-[#B8F4F3]">
                School GPS: {selectedSchool.campus_lat.toFixed(4)}, {selectedSchool.campus_lng.toFixed(4)}
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
                className="px-2.5 py-1 rounded-full bg-[#181C21] border border-[#095856] text-[#E0FFF9] text-xs font-mono cursor-pointer"
              >
                /status
              </button>
            </div>
          </div>

          {/* Chat Bubbles */}
          <div className="p-4 space-y-3 h-[360px] overflow-y-auto bg-[#181C21]">
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
                    <div className="text-[10px] font-mono uppercase mb-1 pb-1 border-b border-current/20 font-bold">
                      {item.badge}
                    </div>
                  )}
                  {item.text}
                </div>
                <span className="text-[10px] text-[#B8F4F3]/70 mt-1 px-1">{item.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Test Photo Attachment Buttons */}
          <div className="bg-[#1C2126] border-t border-[#095856] p-3.5 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                disabled={isSending}
                onClick={() =>
                  sendWebhookUpdate(
                    { sentAsCompressedPhoto: true },
                    '📷 [Sent Normal Compressed Photo]',
                    'Compressed Photo (Rejected)'
                  )
                }
                className="p-2.5 rounded-lg bg-[#181C21] hover:bg-rose-950/40 border border-rose-500/40 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                  <CameraOff className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Normal Photo</span>
                </div>
                <div className="text-[10px] text-[#B8F4F3] mt-0.5">
                  Bot rejects (EXIF stripped)
                </div>
              </button>

              <button
                disabled={isSending}
                onClick={() =>
                  sendWebhookUpdate(
                    {
                      document: {
                        fileName: 'NO_GPS_PHOTO.JPG',
                        mimeType: 'image/jpeg',
                        simulatedExif: {
                          timestamp: new Date().toISOString(),
                          lat: null,
                          lng: null,
                        },
                      },
                    },
                    '📎 [Sent File without GPS]',
                    'Missing GPS (Rejected)'
                  )
                }
                className="p-2.5 rounded-lg bg-[#181C21] hover:border-[#FDB022] border border-[#FDB022]/40 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#FDB022] font-semibold text-xs">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>2. File Missing GPS</span>
                </div>
                <div className="text-[10px] text-[#B8F4F3] mt-0.5">
                  Bot rejects missing location
                </div>
              </button>

              <button
                disabled={isSending}
                onClick={() =>
                  sendWebhookUpdate(
                    {
                      document: {
                        fileName: `${selectedSchool.code}_SCHOOL_ACTIVITY.JPG`,
                        mimeType: 'image/jpeg',
                        simulatedExif: {
                          timestamp: new Date().toISOString(),
                          lat: Number((selectedSchool.campus_lat + 0.0001).toFixed(6)),
                          lng: Number((selectedSchool.campus_lng - 0.0001).toFixed(6)),
                          deviceMake: 'Samsung',
                          deviceModel: 'Galaxy A54 (Uncompressed File)',
                        },
                      },
                    },
                    `📎 [Sent Valid File: ${selectedSchool.code}_SCHOOL_ACTIVITY.JPG]`,
                    'Valid EXIF File'
                  )
                }
                className="p-2.5 rounded-lg bg-[#181C21] hover:border-[#14C7C3] border border-[#095856] text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#75E0A7] font-semibold text-xs">
                  <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                  <span>3. Valid School File</span>
                </div>
                <div className="text-[10px] text-[#B8F4F3] mt-0.5">
                  Verifies GPS &amp; asks questions
                </div>
              </button>
            </div>

            <form onSubmit={handleSendText} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  botStage === 'AWAITING_ACTIVITY_TITLE'
                    ? 'Enter activity name (e.g. "Canteen Compost Batch")...'
                    : botStage === 'AWAITING_WASTE_KG'
                    ? 'Enter waste recycled in kg (e.g. "20")...'
                    : botStage === 'AWAITING_REVENUE_USD'
                    ? 'Enter sales in Rs. (e.g. "9000" or "24000")...'
                    : 'Type /log_impact or reply here...'
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

        {/* Right Column: Resubmission & Recent Bot Messages (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#FDB022] font-semibold text-xs uppercase">
                <RefreshCw className="w-4 h-4" />
                <span>Rejected Submissions (1x Resubmission Allowed)</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {rejectedLogs.map((rLog) => (
                <div
                  key={rLog.id}
                  className="bg-[#181C21] border border-[#095856] rounded-lg p-3.5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#E0FFF9]">
                      {rLog.activity_title} ({rLog.school_name})
                    </span>
                    <span className="figma-code-chip px-2 py-0.5 font-mono text-[10px] text-[#E0FFF9]">
                      {rLog.resubmission_count}/1 used
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
                        'Resubmit Entry'
                      )
                    }
                    className="w-full py-1.5 rounded-lg bg-[#1C2126] hover:bg-[#095856]/40 border border-[#095856] text-[#14C7C3] font-semibold text-xs transition cursor-pointer"
                  >
                    Resubmit {rLog.id} in Bot →
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#14C7C3] font-semibold text-xs uppercase">
              <MessageSquareWarning className="w-4 h-4" />
              <span>Recent Telegram Notifications Sent to Students</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {telegramMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-[#181C21] border border-[#095856] rounded-lg p-3 text-xs space-y-1"
                >
                  <div className="font-semibold text-[#E0FFF9]">
                    To: {msg.student_name} ({msg.telegram_username})
                  </div>
                  <p className="text-[#B8F4F3] whitespace-pre-wrap text-[11px] leading-relaxed">
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
