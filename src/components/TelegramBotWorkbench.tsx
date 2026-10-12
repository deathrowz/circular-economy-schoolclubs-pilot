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
      <div className="hai-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[10px_10px_10px_2px] bg-[#005FA3] text-[#9CF2F2]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111010] font-[var(--font-jakarta)]">
              Student Telegram Submission Simulator
            </h2>
            <p className="text-xs text-[#111010]/70">
              Students send uncompressed File photos to log waste recycled (kg) and sales (Rs.)
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
            className="hai-btn-primary px-4 py-2 text-xs cursor-pointer"
          >
            Teacher Approvals →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat Window (7 cols) */}
        <div className="lg:col-span-7 hai-card flex flex-col overflow-hidden">
          <div className="bg-[#005FA3] text-white px-5 py-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">
                @HarithaPasalBot • {selectedSchool.name} ({selectedSchool.city})
              </div>
              <div className="text-[11px] text-[#9CF2F2]">
                School GPS: {selectedSchool.campus_lat.toFixed(4)}, {selectedSchool.campus_lng.toFixed(4)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => sendWebhookUpdate({ text: '/log_impact' }, '/log_impact')}
                className="hai-btn-on-zeal px-3 py-1 text-xs font-mono cursor-pointer"
              >
                /log_impact
              </button>
              <button
                onClick={() => sendWebhookUpdate({ text: '/status' }, '/status')}
                className="px-3 py-1 rounded-full bg-white/15 border border-white/30 text-white text-xs font-mono cursor-pointer hover:bg-white/25"
              >
                /status
              </button>
            </div>
          </div>

          {/* Chat Bubbles */}
          <div className="p-5 space-y-3.5 h-[360px] overflow-y-auto bg-[#F0F3F5]">
            {chatHistory.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${
                  item.sender === 'student' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-[16px_16px_16px_4px] px-4 py-3 text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                    item.sender === 'student'
                      ? 'bg-[#005FA3] text-white font-medium'
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
                <span className="text-[10px] text-[#111010]/60 mt-1 px-1">{item.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Test Photo Attachment Buttons */}
          <div className="bg-[#FFFFFF] border-t border-[#111010]/12 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                disabled={isSending}
                onClick={() =>
                  sendWebhookUpdate(
                    { sentAsCompressedPhoto: true },
                    '📷 [Sent Normal Compressed Photo]',
                    'Compressed Photo (Rejected)'
                  )
                }
                className="p-3 rounded-[12px_12px_12px_2px] bg-rose-50/70 hover:bg-rose-100/70 border border-rose-300 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                  <CameraOff className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Normal Photo</span>
                </div>
                <div className="text-[10px] text-rose-700/80 mt-0.5">
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
                className="p-3 rounded-[12px_12px_12px_2px] bg-[#F0F3F5] hover:bg-[#E6F1FA] border border-[#111010]/20 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#111010] font-bold text-xs">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-[#005FA3]" />
                  <span>2. File Missing GPS</span>
                </div>
                <div className="text-[10px] text-[#111010]/65 mt-0.5">
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
                className="p-3 rounded-[12px_12px_12px_2px] bg-[#E6F1FA] hover:bg-[#9CF2F2]/60 border border-[#005FA3]/30 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[#005FA3] font-bold text-xs">
                  <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                  <span>3. Valid School File</span>
                </div>
                <div className="text-[10px] text-[#111010]/70 mt-0.5">
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

        {/* Right Column: Resubmission & Recent Bot Messages (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="hai-card p-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#005FA3] font-bold text-xs uppercase">
                <RefreshCw className="w-4 h-4" />
                <span>Rejected Submissions (1x Resubmission Allowed)</span>
              </div>
            </div>

            <div className="space-y-3">
              {rejectedLogs.map((rLog) => (
                <div
                  key={rLog.id}
                  className="hai-chrome-box p-4 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111010]">
                      {rLog.activity_title} ({rLog.school_name})
                    </span>
                    <span className="hai-tag font-mono text-[10px] font-bold">
                      {rLog.resubmission_count}/1 used
                    </span>
                  </div>
                  <div className="text-rose-700 font-medium text-[11px]">
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
                    className="w-full py-2 hai-btn-secondary text-xs cursor-pointer"
                  >
                    Resubmit {rLog.id} in Bot →
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="hai-card p-6 space-y-3.5">
            <div className="flex items-center gap-2 text-[#005FA3] font-bold text-xs uppercase">
              <MessageSquareWarning className="w-4 h-4" />
              <span>Recent Telegram Notifications Sent to Students</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {telegramMessages.map((msg) => (
                <div key={msg.id} className="hai-chrome-box p-3.5 text-xs space-y-1">
                  <div className="font-bold text-[#111010]">
                    To: {msg.student_name} ({msg.telegram_username})
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
