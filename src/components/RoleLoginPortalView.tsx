'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  Award,
  Building2,
  CheckCircle2,
  Gavel,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  GamificationConfig,
  LeaderboardSchoolScore,
  UserProfile,
  UserRole,
} from '@/types/domain';
import { formatLkr } from '@/lib/gamification/engine';

interface RoleLoginPortalViewProps {
  activeUser: UserProfile;
  users: UserProfile[];
  leaderboard: LeaderboardSchoolScore[];
  config: GamificationConfig;
  onSelectUserAndNavigate: (
    userId: string,
    targetTab:
      | 'student_gamified'
      | 'verification'
      | 'leaderboard'
      | 'health_risk'
      | 'login_portal'
  ) => void;
}

export function RoleLoginPortalView({
  activeUser,
  users,
  leaderboard,
  onSelectUserAndNavigate,
}: RoleLoginPortalViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'super_admin' | 'expert_admin' | 'teacher' | 'student'
  >('all');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [quickLoginCode, setQuickLoginCode] = useState('');
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);

  const gizAdmins = users.filter((u) => u.role === 'super_admin');
  const expertPanelUsers = users.filter((u) => u.role === 'expert_admin');
  const teacherUsers = users.filter((u) => u.role === 'teacher');
  const studentUsers = users.filter((u) => u.role === 'student');

  const handleQuickCodeSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickLoginCode.trim().toUpperCase();
    if (!cleaned) return;

    const matched = users.find(
      (u) =>
        u.login_code?.toUpperCase() === cleaned ||
        u.email.toUpperCase() === cleaned ||
        u.school_code?.toUpperCase() === cleaned
    );

    if (!matched) {
      setLoginFeedback(
        `No account found for "${quickLoginCode}". Try GIZ-SUPER-ADMIN, EXPERT-PANEL-01, SCH-01-TEACHER, or SCH-01-STUDENT.`
      );
      return;
    }

    setLoginFeedback(null);
    if (matched.role === 'student') {
      onSelectUserAndNavigate(matched.id, 'student_gamified');
    } else if (matched.role === 'teacher' || matched.role === 'expert_admin') {
      onSelectUserAndNavigate(matched.id, 'verification');
    } else {
      onSelectUserAndNavigate(matched.id, 'health_risk');
    }
  };

  const filteredSchools = leaderboard.filter(
    (entry) =>
      entry.school.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      entry.school.code.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      entry.school.city.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      entry.club.name.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* ====================================================================
       * 4 User Categories Overview & Quick Access Code Login Bar
       * ==================================================================== */}
      <section className="hai-zeal-banner p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/20">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[#9CF2F2]">
              <KeyRound className="w-4 h-4" />
              <span>Role-Based Access Control (RBAC) • 4 User Categories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white font-[var(--font-jakarta)]">
              Sign In to Your Role Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-white/85">
              Currently signed in as{' '}
              <strong className="text-[#9CF2F2]">{activeUser.full_name}</strong> (
              <span className="font-mono">{activeUser.login_code}</span>). Select any of the 4 user categories below or enter a school login code.
            </p>
          </div>

          {/* Quick Login by Access Code */}
          <form
            onSubmit={handleQuickCodeSignIn}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0"
          >
            <input
              type="text"
              value={quickLoginCode}
              onChange={(e) => setQuickLoginCode(e.target.value)}
              placeholder="Enter Login ID (e.g. SCH-01-STUDENT)..."
              className="px-4 py-2.5 rounded-[8px_8px_8px_0px] bg-white text-[#111010] text-xs font-mono font-semibold w-full sm:w-64 focus:outline-none"
            />
            <button
              type="submit"
              className="hai-btn-on-zeal px-5 py-2.5 text-xs font-bold cursor-pointer"
            >
              Sign In with Code →
            </button>
          </form>
        </div>

        {loginFeedback && (
          <div className="bg-rose-900/60 border border-rose-300/50 rounded-xl p-3 text-xs text-white">
            {loginFeedback}
          </div>
        )}

        {/* 4 Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Super Admin (GIZ) */}
          <div className="bg-white/10 border border-white/25 rounded-[18px_18px_18px_4px] p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#9CF2F2]">
                <span>1. Super Admin (GIZ)</span>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                GIZ Program Secretariat
              </div>
              <p className="text-xs text-white/80 mt-1">
                National oversight across 15 schools, seed grant governance, risk alerts &amp; algorithm weights.
              </p>
            </div>
            <button
              onClick={() =>
                onSelectUserAndNavigate(gizAdmins[0].id, 'health_risk')
              }
              className="hai-btn-on-zeal w-full py-2 text-xs font-bold cursor-pointer"
            >
              Sign In as GIZ Super Admin →
            </button>
          </div>

          {/* 2. Expert Panel */}
          <div className="bg-white/10 border border-white/25 rounded-[18px_18px_18px_4px] p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#9CF2F2]">
                <span>2. Expert Panel</span>
                <Gavel className="w-4 h-4" />
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                National Adjudicators
              </div>
              <p className="text-xs text-white/80 mt-1">
                Scores Macro-Transactions (&gt; Rs. 15,000) across 6 criteria &amp; audits 10% micro sample.
              </p>
            </div>
            <button
              onClick={() =>
                onSelectUserAndNavigate(expertPanelUsers[0].id, 'verification')
              }
              className="hai-btn-on-zeal w-full py-2 text-xs font-bold cursor-pointer"
            >
              Sign In as Expert Panel →
            </button>
          </div>

          {/* 3. School Teacher */}
          <div className="bg-white/10 border border-white/25 rounded-[18px_18px_18px_4px] p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#9CF2F2]">
                <span>3. Teacher (School Level)</span>
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                15 School Validators
              </div>
              <p className="text-xs text-white/80 mt-1">
                Approves on-campus student logs (≤ Rs. 15,000) &amp; endorses Macro sales for their school.
              </p>
            </div>
            <button
              onClick={() =>
                onSelectUserAndNavigate(teacherUsers[0].id, 'verification')
              }
              className="hai-btn-on-zeal w-full py-2 text-xs font-bold cursor-pointer"
            >
              Sign In as School Teacher →
            </button>
          </div>

          {/* 4. 15 Single-User School Student Logins */}
          <div className="bg-white/10 border border-white/25 rounded-[18px_18px_18px_4px] p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#9CF2F2]">
                <span>4. Student Club Login</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                15 Gamified School Logins
              </div>
              <p className="text-xs text-white/80 mt-1">
                1 single-user login per school with XP progress bar, 6 badges, rivalry tracker &amp; Telegram bot.
              </p>
            </div>
            <button
              onClick={() =>
                onSelectUserAndNavigate(studentUsers[0].id, 'student_gamified')
              }
              className="hai-btn-on-zeal w-full py-2 text-xs font-bold cursor-pointer"
            >
              Open Gamified Student View →
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * Category 1 & Category 2: GIZ Super Admin & National Expert Panel Logins
       * ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category 1: GIZ Super Admin */}
        <div className="hai-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#005FA3]">
                Category 1 • National Program Oversight
              </span>
              <h3 className="text-lg font-bold text-[#111010] font-[var(--font-jakarta)] mt-0.5">
                Super Admin (GIZ Sri Lanka)
              </h3>
            </div>
            <span className="hai-cyan-pill text-xs font-mono font-bold">
              Full Access
            </span>
          </div>

          {gizAdmins.map((admin) => (
            <div
              key={admin.id}
              className="hai-chrome-box p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="hai-tag font-mono text-xs font-bold">
                    {admin.login_code}
                  </span>
                  <span className="text-xs text-[#111010]/70 font-mono">
                    {admin.email}
                  </span>
                </div>
                <div className="font-bold text-sm text-[#111010] mt-1.5">
                  {admin.full_name}
                </div>
                <p className="text-xs text-[#111010]/70 mt-0.5">
                  Monitors all 15 schools, seed funding tranches, audit logs, and scoring algorithm weights.
                </p>
              </div>
              <button
                onClick={() => onSelectUserAndNavigate(admin.id, 'health_risk')}
                className="hai-btn-primary px-4 py-2 text-xs shrink-0 cursor-pointer"
              >
                Login as GIZ Admin →
              </button>
            </div>
          ))}
        </div>

        {/* Category 2: Expert Panel */}
        <div className="hai-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#005FA3]">
                Category 2 • Tier 2 National Adjudication
              </span>
              <h3 className="text-lg font-bold text-[#111010] font-[var(--font-jakarta)] mt-0.5">
                Expert Panel Validators
              </h3>
            </div>
            <span className="hai-cyan-pill text-xs font-mono font-bold">
              Macro &amp; 10% Audit
            </span>
          </div>

          <div className="space-y-3">
            {expertPanelUsers.map((exp) => (
              <div
                key={exp.id}
                className="hai-chrome-box p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="hai-tag font-mono text-xs font-bold">
                      {exp.login_code}
                    </span>
                    <span className="text-xs text-[#111010]/70 font-mono">
                      {exp.email}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-[#111010] mt-1.5">
                    {exp.full_name}
                  </div>
                </div>
                <button
                  onClick={() => onSelectUserAndNavigate(exp.id, 'verification')}
                  className="hai-btn-primary px-4 py-2 text-xs shrink-0 cursor-pointer"
                >
                  Login as Panel →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====================================================================
       * Category 3 & Category 4: All 15 Schools — Single-User Student Logins & School Teacher Logins
       * ==================================================================== */}
      <section className="hai-card overflow-hidden">
        <div className="px-6 py-5 border-b border-[#111010]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#005FA3]">
              Categories 3 &amp; 4 • 15 Participating Sri Lankan Schools
            </span>
            <h3 className="text-xl font-semibold text-[#111010] font-[var(--font-jakarta)] mt-0.5">
              15 Single-User School Student Logins &amp; 15 School Teacher Validators
            </h3>
            <p className="text-xs text-[#111010]/70 mt-0.5">
              Each school has 1 shared gamified student club login (`SCH-XX-STUDENT`) and 1 supervising teacher validator login (`SCH-XX-TEACHER`).
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#111010]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={schoolSearch}
              onChange={(e) => setSchoolSearch(e.target.value)}
              placeholder="Search school, code (SCH-01), or town..."
              className="w-full hai-input pl-9 pr-3.5 py-2 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="h-[46px] border-b border-[#111010]/15 bg-[#F0F3F5] font-semibold text-[#111010]/75">
                <th className="py-3 px-6">School &amp; Club</th>
                <th className="py-3 px-4">Rank &amp; Grant Tier</th>
                <th className="py-3 px-4">
                  Single-User Student Login (Gamified Dashboard)
                </th>
                <th className="py-3 px-6">
                  School Teacher Login (School-Level Validator)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111010]/12">
              {filteredSchools.map((entry) => {
                const studentAccount = studentUsers.find(
                  (u) => u.school_id === entry.school.id
                )!;
                const teacherAccount = teacherUsers.find(
                  (u) => u.school_id === entry.school.id
                )!;

                const isCurrentStudent = activeUser.id === studentAccount?.id;
                const isCurrentTeacher = activeUser.id === teacherAccount?.id;

                return (
                  <tr
                    key={entry.school.id}
                    className="hover:bg-[#E6F1FA]/50 transition-colors"
                  >
                    {/* 1. School & Club */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="hai-tag font-mono text-[11px] font-bold">
                          {entry.school.code}
                        </span>
                        <span className="font-bold text-sm text-[#111010]">
                          {entry.school.name}
                        </span>
                      </div>
                      <div className="text-xs text-[#005FA3] font-semibold mt-0.5">
                        {entry.club.name} ({entry.school.city})
                      </div>
                    </td>

                    {/* 2. Rank & Score */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-sm text-[#111010]">
                        Rank #{entry.rank} • {entry.composite_leaderboard_score} pts
                      </div>
                      <div className="text-[11px] text-[#14494F] font-semibold mt-0.5">
                        {entry.topoff_funding_tier} • {entry.verified_waste_kg} kg
                      </div>
                    </td>

                    {/* 3. Single-User Student Login (1 per school) */}
                    <td className="py-4 px-4">
                      {studentAccount && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 hai-chrome-box p-3">
                          <div>
                            <div className="font-mono font-bold text-[#005FA3] text-xs">
                              {studentAccount.login_code}
                            </div>
                            <div className="text-[11px] text-[#111010]/75">
                              {studentAccount.email}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              onSelectUserAndNavigate(
                                studentAccount.id,
                                'student_gamified'
                              )
                            }
                            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold cursor-pointer shrink-0 ${
                              isCurrentStudent
                                ? 'bg-[#14494F] text-white'
                                : 'hai-btn-primary'
                            }`}
                          >
                            {isCurrentStudent
                              ? '✓ Active Student'
                              : 'Student Login →'}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 4. School Teacher Validator Login */}
                    <td className="py-4 px-6">
                      {teacherAccount && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 hai-chrome-box p-3">
                          <div>
                            <div className="font-mono font-bold text-[#111010] text-xs">
                              {teacherAccount.login_code}
                            </div>
                            <div className="text-[11px] text-[#111010]/75">
                              {teacherAccount.full_name.split(' (')[0]}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              onSelectUserAndNavigate(
                                teacherAccount.id,
                                'verification'
                              )
                            }
                            className={`px-3.5 py-1.5 text-xs rounded-full font-semibold cursor-pointer shrink-0 ${
                              isCurrentTeacher
                                ? 'bg-[#14494F] text-white'
                                : 'hai-btn-secondary'
                            }`}
                          >
                            {isCurrentTeacher
                              ? '✓ Active Teacher'
                              : 'Teacher Login →'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
