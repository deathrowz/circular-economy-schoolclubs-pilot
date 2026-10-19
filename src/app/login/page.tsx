'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Recycle } from 'lucide-react';
import { RoleLoginPortalView } from '@/components/RoleLoginPortalView';
import { fetchPlatformSnapshotClient } from '@/lib/client/platform-bridge';
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('returnUrl') || searchParams?.get('redirectTo');

  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);

  useEffect(() => {
    fetchPlatformSnapshotClient().then((data) => {
      setSnapshot(data);
    });
  }, []);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#E6F1FA] flex items-center justify-center p-6">
        <div className="hai-card px-6 py-4 flex items-center gap-3 text-[#005FA3] font-semibold text-sm shadow-xs">
          <Recycle className="w-5 h-5 animate-spin" />
          <span>Loading Universal Authentication Gateway...</span>
        </div>
      </div>
    );
  }

  const handleSelectUserAndNavigate = (userId: string) => {
    const matched = snapshot.users.find((u) => u.id === userId || u.auth_user_id === userId);

    if (typeof document !== 'undefined') {
      document.cookie = `haritha_auth_user_id=${userId}; path=/; max-age=2592000; SameSite=Lax`;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('haritha_auth_user_id', userId);
    }

    if (redirectTo && redirectTo.startsWith('/')) {
      router.push(redirectTo);
      return;
    }

    // Role-based target route
    if (matched?.role === 'student') {
      router.push('/dashboard/student');
    } else if (matched?.role === 'teacher') {
      router.push('/dashboard/teacher');
    } else if (matched?.role === 'expert_admin' || matched?.role === 'expert') {
      router.push('/dashboard/expert');
    } else {
      // super_admin / admin -> Platform GIZ Oversight
      router.push('/');
    }
  };

  const activeUser = snapshot.users[0];

  return (
    <div className="min-h-screen bg-[#E6F1FA] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-[1360px] mx-auto">
        <RoleLoginPortalView
          activeUser={activeUser}
          users={snapshot.users}
          leaderboard={snapshot.leaderboard}
          config={snapshot.gamificationConfig}
          onSelectUserAndNavigate={handleSelectUserAndNavigate}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#E6F1FA] flex items-center justify-center p-6">
          <div className="hai-card px-6 py-4 flex items-center gap-3 text-[#005FA3] font-semibold text-sm shadow-xs">
            <Recycle className="w-5 h-5 animate-spin" />
            <span>Loading Authentication Portal...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
