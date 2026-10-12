'use client';

import React, { useState } from 'react';
import {
  AlertOctagon,
  Clock,
  Database,
  MapPinOff,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';
import { AuditLogEntry, HealthRiskAlert } from '@/types/domain';

interface HealthRiskDashboardViewProps {
  healthAlerts: HealthRiskAlert[];
  auditLogs: AuditLogEntry[];
  onInspectClub: (clubId: string) => void;
  onNavigateToVerification: () => void;
}

export function HealthRiskDashboardView({
  healthAlerts,
  auditLogs,
  onInspectClub,
  onNavigateToVerification,
}: HealthRiskDashboardViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const inactiveCount = healthAlerts.filter((a) => a.category === 'INACTIVE_CLUB').length;
  const greenwashCount = healthAlerts.filter(
    (a) => a.category === 'HIGH_REVENUE_ZERO_IMPACT'
  ).length;
  const geofenceCount = healthAlerts.filter(
    (a) => a.category === 'EXIF_GEOFENCE_ANOMALY'
  ).length;
  const fraudCount = healthAlerts.filter((a) => a.category === 'AUDIT_FRAUD_DETECTED').length;

  const filteredAlerts =
    selectedCategory === 'ALL'
      ? healthAlerts
      : healthAlerts.filter((a) => a.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* 4 Simple Alert Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#FDB022] text-xs font-semibold">
            <span>Inactive Clubs (&gt;14 Days)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
            {inactiveCount} Schools
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            Need Teacher follow-up on Telegram
          </p>
        </div>

        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>High Sales / 0 kg Waste</span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
            {greenwashCount} Flagged
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            Sales reported without recycled material
          </p>
        </div>

        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#14C7C3] text-xs font-semibold">
            <span>Off-Campus Photos</span>
            <MapPinOff className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
            {geofenceCount} Photos
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            GPS outside school boundary
          </p>
        </div>

        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#F670C7] text-xs font-semibold">
            <span>Audit Penalties</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400 font-[var(--font-jakarta)]">
            {fraudCount} Applied
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            Flagged in 10% random audit
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
            School Activity Alerts ({filteredAlerts.length})
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'HIGH_REVENUE_ZERO_IMPACT', label: 'High Sales / 0 kg Waste' },
            { id: 'INACTIVE_CLUB', label: 'Inactive Schools' },
            { id: 'EXIF_GEOFENCE_ANOMALY', label: 'Off-Campus GPS' },
            { id: 'AUDIT_FRAUD_DETECTED', label: 'Audit Penalties' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-[#14C7C3] text-[#074140]'
                  : 'bg-[#181C21] text-[#B8F4F3] border border-[#095856] hover:text-[#E0FFF9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAlerts.map((alert) => {
          const borderStyle =
            alert.severity === 'critical'
              ? 'border-rose-500/60 bg-[#1C2126]'
              : alert.severity === 'high'
              ? 'border-[#FDB022]/60 bg-[#1C2126]'
              : 'border-[#095856] bg-[#1C2126]';

          return (
            <div
              key={alert.id}
              className={`border rounded-xl p-5 flex flex-col justify-between gap-4 ${borderStyle}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="figma-code-chip px-2.5 py-0.5 font-mono text-xs font-semibold text-[#E0FFF9]">
                    {alert.school_name}
                  </span>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#181C21] border border-[#095856] text-rose-300">
                    {alert.metric_highlight}
                  </span>
                </div>

                <h4 className="mt-2.5 text-base font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
                  {alert.title}
                </h4>
                <p className="text-xs text-[#B8F4F3] mt-1 leading-relaxed">
                  {alert.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#095856] flex items-center justify-between gap-2 text-xs">
                <span className="text-[#FDB022] font-medium">
                  Next Step: {alert.recommended_action}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onInspectClub(alert.club_id)}
                    className="px-3 py-1 rounded-full bg-[#181C21] border border-[#095856] text-[#E0FFF9] font-semibold cursor-pointer"
                  >
                    View Club
                  </button>
                  {alert.related_log_id && (
                    <button
                      onClick={onNavigateToVerification}
                      className="figma-skeuomorphic-btn px-3 py-1 text-xs font-semibold cursor-pointer"
                    >
                      Review →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simplified 5-Column Approval & Audit History Table */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#095856] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#14C7C3]" />
            <h3 className="text-sm font-semibold text-[#E0FFF9] font-[var(--font-jakarta)]">
              Recent Approval &amp; Audit History
            </h3>
          </div>
          <span className="figma-emerald-pill px-2.5 py-0.5 font-mono text-xs">
            {auditLogs.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="h-[44px] border-b border-[#095856] bg-[#1C2126] text-[#B8F4F3] font-medium">
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-4">School &amp; Club</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4">Status Change</th>
                <th className="py-3 px-6">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#095856]">
              {auditLogs.map((entry) => (
                <tr key={entry.id} className="h-[64px] hover:bg-[#181C21]/90">
                  <td className="py-3 px-6 font-mono text-[#B8F4F3] whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#E0FFF9]">{entry.school_name}</div>
                    <div className="text-[11px] text-[#B8F4F3]">{entry.club_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#E0FFF9]">{entry.actor_name}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <span className="text-[#B8F4F3]">{entry.previous_status || 'new'}</span>
                    <span className="mx-1.5 text-[#14C7C3]">→</span>
                    <span className="text-[#E0FFF9] font-bold">{entry.new_status}</span>
                    {entry.points_delta !== 0 && (
                      <span
                        className={`ml-2 font-bold ${
                          entry.points_delta > 0 ? 'text-[#75E0A7]' : 'text-rose-400'
                        }`}
                      >
                        ({entry.points_delta > 0 ? `+${entry.points_delta}` : entry.points_delta} pts)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-[#B8F4F3] max-w-md">
                    {entry.reason_or_notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
