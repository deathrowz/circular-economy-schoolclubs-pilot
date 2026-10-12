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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="hai-card p-5">
          <div className="flex items-center justify-between text-[#005FA3] text-xs font-bold">
            <span>Inactive Clubs (&gt;14 Days)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111010] font-[var(--font-jakarta)]">
            {inactiveCount} Schools
          </div>
          <p className="text-xs text-[#111010]/70 mt-1">
            Need Teacher follow-up on Telegram
          </p>
        </div>

        <div className="hai-card p-5">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>High Sales / 0 kg Waste</span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111010] font-[var(--font-jakarta)]">
            {greenwashCount} Flagged
          </div>
          <p className="text-xs text-[#111010]/70 mt-1">
            Sales reported without recycled material
          </p>
        </div>

        <div className="hai-card p-5">
          <div className="flex items-center justify-between text-[#005FA3] text-xs font-bold">
            <span>Off-Campus Photos</span>
            <MapPinOff className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#111010] font-[var(--font-jakarta)]">
            {geofenceCount} Photos
          </div>
          <p className="text-xs text-[#111010]/70 mt-1">
            GPS outside school boundary
          </p>
        </div>

        <div className="hai-card p-5">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Audit Penalties</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 font-[var(--font-jakarta)]">
            {fraudCount} Applied
          </div>
          <p className="text-xs text-[#111010]/70 mt-1">
            Flagged in 10% random audit
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="hai-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-[#005FA3]" />
          <h3 className="text-sm font-semibold text-[#111010] font-[var(--font-jakarta)]">
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-[#005FA3] text-[#9CF2F2]'
                  : 'bg-[#F0F3F5] text-[#111010]/80 hover:bg-[#9CF2F2]/50 hover:text-[#005FA3]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="hai-card p-6 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="hai-tag font-mono text-xs font-bold">
                  {alert.school_name}
                </span>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800">
                  {alert.metric_highlight}
                </span>
              </div>

              <h4 className="mt-3 text-base font-semibold text-[#111010] font-[var(--font-jakarta)]">
                {alert.title}
              </h4>
              <p className="text-xs text-[#111010]/75 mt-1 leading-relaxed">
                {alert.description}
              </p>
            </div>

            <div className="pt-3.5 border-t border-[#111010]/12 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#005FA3] font-semibold">
                Next Step: {alert.recommended_action}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onInspectClub(alert.club_id)}
                  className="hai-btn-secondary px-3.5 py-1.5 text-xs cursor-pointer"
                >
                  View Club
                </button>
                {alert.related_log_id && (
                  <button
                    onClick={onNavigateToVerification}
                    className="hai-btn-primary px-3.5 py-1.5 text-xs cursor-pointer"
                  >
                    Review →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simplified 5-Column Approval & Audit History Table */}
      <div className="hai-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#111010]/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#005FA3]" />
            <h3 className="text-base font-semibold text-[#111010] font-[var(--font-jakarta)]">
              Recent Approval &amp; Audit History
            </h3>
          </div>
          <span className="hai-cyan-pill font-mono text-xs font-bold">
            {auditLogs.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="h-[44px] border-b border-[#111010]/15 bg-[#F0F3F5] text-[#111010]/75 font-semibold">
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-4">School &amp; Club</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4">Status Change</th>
                <th className="py-3 px-6">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111010]/12">
              {auditLogs.map((entry) => (
                <tr key={entry.id} className="h-[64px] hover:bg-[#E6F1FA]/50">
                  <td className="py-3 px-6 font-mono text-[#111010]/70 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#111010]">{entry.school_name}</div>
                    <div className="text-[11px] text-[#111010]/65">{entry.club_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#111010]">{entry.actor_name}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <span className="text-[#111010]/65">{entry.previous_status || 'new'}</span>
                    <span className="mx-1.5 text-[#005FA3] font-bold">→</span>
                    <span className="text-[#005FA3] font-bold">{entry.new_status}</span>
                    {entry.points_delta !== 0 && (
                      <span
                        className={`ml-2 font-bold ${
                          entry.points_delta > 0 ? 'text-[#14494F]' : 'text-rose-700'
                        }`}
                      >
                        ({entry.points_delta > 0 ? `+${entry.points_delta}` : entry.points_delta} pts)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-[#111010]/75 max-w-md">
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
