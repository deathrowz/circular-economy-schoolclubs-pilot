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
      {/* Top Risk KPI Cards (Figma #1C2126 + 1px #095856 border) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#FDB022] text-xs font-semibold uppercase tracking-wider">
            <span>Inactive Clubs (&gt;14d)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
            {inactiveCount} Enterprises
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            Stalled Telegram bot activity requiring faculty check-in
          </p>
        </div>

        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <span>High Rev / Zero Impact</span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
            {greenwashCount} Flagged
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            Anomalous revenue logged with 0 kg circular waste diverted
          </p>
        </div>

        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#14C7C3] text-xs font-semibold uppercase tracking-wider">
            <span>Off-Campus EXIF GPS</span>
            <MapPinOff className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#E0FFF9] font-[var(--font-jakarta)]">
            {geofenceCount} Submissions
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            EXIF coordinates outside school campus geofence radius
          </p>
        </div>

        <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#F670C7] text-xs font-semibold uppercase tracking-wider">
            <span>Audit Fraud Penalties</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400 font-[var(--font-jakarta)]">
            {fraudCount} Confirmed
          </div>
          <p className="text-xs text-[#B8F4F3] mt-1">
            Caught by 10% random micro-transaction Expert audit
          </p>
        </div>
      </div>

      {/* Anomaly Filter Bar */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E0FFF9] font-[var(--font-jakarta)]">
            Enterprise Health & Anomaly Detection Feed ({filteredAlerts.length})
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'HIGH_REVENUE_ZERO_IMPACT', label: 'High Rev / Zero Impact' },
            { id: 'INACTIVE_CLUB', label: 'Inactive Clubs' },
            { id: 'EXIF_GEOFENCE_ANOMALY', label: 'EXIF Geofence Drift' },
            { id: 'AUDIT_FRAUD_DETECTED', label: 'Random Audit Fraud' },
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

      {/* Anomaly Cards Grid */}
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500 text-[#0C111D]'
                          : alert.severity === 'high'
                          ? 'bg-[#FDB022] text-[#0C111D]'
                          : 'bg-[#181C21] text-[#14C7C3] border border-[#095856]'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="figma-code-chip px-2 py-0.5 font-mono text-xs font-semibold text-[#E0FFF9]">
                      {alert.school_code} • {alert.school_name}
                    </span>
                  </div>

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

              <div className="pt-3 border-t border-[#095856] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-[#FDB022] font-medium">
                  ⚡ Action: {alert.recommended_action}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onInspectClub(alert.club_id)}
                    className="px-3 py-1 rounded-full bg-[#181C21] hover:bg-[#095856]/40 border border-[#095856] text-[#E0FFF9] font-semibold cursor-pointer"
                  >
                    Club Profile
                  </button>
                  {alert.related_log_id && (
                    <button
                      onClick={onNavigateToVerification}
                      className="figma-skeuomorphic-btn px-3 py-1 text-xs font-semibold cursor-pointer"
                    >
                      Adjudicate ({alert.related_log_id}) →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Immutable PostgreSQL Trigger `audit_logs` Table */}
      <div className="bg-[#1C2126] border border-[#095856] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#095856] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#14C7C3]" />
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E0FFF9] font-[var(--font-jakarta)]">
                PostgreSQL Trigger Audit Trail (`public.audit_logs`)
              </h3>
              <p className="text-xs text-[#B8F4F3]">
                Populated automatically by <code className="text-[#14C7C3]">trg_impact_logs_status_audit</code> every time a transaction status or fraud flag changes.
              </p>
            </div>
          </div>
          <span className="figma-emerald-pill px-3 py-1 font-mono text-xs">
            {auditLogs.length} Immutable Trigger Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="h-[44px] border-b border-[#095856] bg-[#1C2126] text-[#B8F4F3] font-medium">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-4">Log ID & School</th>
                <th className="py-3 px-4">Trigger Action Type</th>
                <th className="py-3 px-4">Actor & RBAC Role</th>
                <th className="py-3 px-4">State Transition</th>
                <th className="py-3 px-4 text-right">Points Delta</th>
                <th className="py-3 px-6">Audit Notes / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#095856]">
              {auditLogs.map((entry) => (
                <tr key={entry.id} className="h-[72px] hover:bg-[#181C21]/90">
                  <td className="py-3.5 px-6 font-mono text-[11px] text-[#B8F4F3] whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-[#E0FFF9]">{entry.impact_log_id}</div>
                    <div className="text-[11px] text-[#B8F4F3]">
                      {entry.school_code} • {entry.club_name}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                        entry.action_type.includes('FRAUD')
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                          : entry.action_type.includes('REJECTED')
                          ? 'bg-[#181C21] text-[#FDB022] border-[#FDB022]/50'
                          : entry.action_type.includes('APPROVED')
                          ? 'figma-emerald-pill'
                          : 'bg-[#181C21] text-[#14C7C3] border-[#095856]'
                      }`}
                    >
                      {entry.action_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#E0FFF9]">{entry.actor_name}</div>
                    <div className="font-mono text-[10px] uppercase text-[#B8F4F3]">
                      role: {entry.actor_role}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <span className="text-[#B8F4F3]">{entry.previous_status || 'NULL'}</span>
                    <span className="mx-1.5 text-[#14C7C3]">→</span>
                    <span className="text-[#E0FFF9] font-bold">{entry.new_status}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold">
                    <span
                      className={
                        entry.points_delta > 0
                          ? 'text-[#75E0A7]'
                          : entry.points_delta < 0
                          ? 'text-rose-400'
                          : 'text-[#B8F4F3]'
                      }
                    >
                      {entry.points_delta > 0
                        ? `+${entry.points_delta}`
                        : entry.points_delta < 0
                        ? `${entry.points_delta}`
                        : '0.0'}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-[#B8F4F3] max-w-md">
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
