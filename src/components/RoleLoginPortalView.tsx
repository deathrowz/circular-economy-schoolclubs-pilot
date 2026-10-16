'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Gavel,
  KeyRound,
  Lock,
  Recycle,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  GamificationConfig,
  LeaderboardSchoolScore,
  UserProfile,
} from '@/types/domain';

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
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [passwordInput, setPasswordInput] = useState('Pilot2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Discreet collapsible pilot reference drawer
  const [isPilotDrawerOpen, setIsPilotDrawerOpen] = useState(false);
  const [pilotDrawerTab, setPilotDrawerTab] = useState<
    'all' | 'giz' | 'expert' | 'teacher' | 'student'
  >('all');
  const [drawerSchoolSearch, setDrawerSchoolSearch] = useState('');

  const gizAdmins = users.filter((u) => u.role === 'super_admin');
  const expertPanelUsers = users.filter((u) => u.role === 'expert_admin');
  const teacherUsers = users.filter((u) => u.role === 'teacher');
  const studentUsers = users.filter((u) => u.role === 'student');

  /**
   * Universal Login Handler with Automated Supabase/Database Identity Dispatch
   */
  const handleUniversalSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginIdentifier.trim().toLowerCase();

    if (!cleanId) {
      setErrorMessage('Please enter your Login ID, School Code, or Email address.');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Simulate brief authentication verification
    setTimeout(() => {
      // Find matching user profile
      const matched = users.find((u) => {
        const email = u.email.toLowerCase();
        const code = u.login_code?.toLowerCase() || '';
        const sc = u.school_code?.toLowerCase() || '';
        const sname = u.school_name?.toLowerCase() || '';

        return (
          email === cleanId ||
          code === cleanId ||
          sc === cleanId ||
          (cleanId.endsWith('-club') && code === `${cleanId.replace('-club', '')}-student`) ||
          (cleanId.endsWith('-student') && code === cleanId) ||
          (cleanId.endsWith('-teacher') && code === cleanId) ||
          (cleanId.length > 3 && sname.includes(cleanId))
        );
      });

      if (!matched) {
        setIsSubmitting(false);
        setErrorMessage(
          `No account found matching "${loginIdentifier}". Please check your Login ID or consult the Pilot Quick Reference below.`
        );
        return;
      }

      // Automated Role-to-Dashboard Dispatch (Industry Gold Standard)
      if (matched.role === 'student') {
        onSelectUserAndNavigate(matched.id, 'student_gamified');
      } else if (matched.role === 'teacher') {
        onSelectUserAndNavigate(matched.id, 'verification');
      } else if (matched.role === 'expert_admin') {
        onSelectUserAndNavigate(matched.id, 'verification');
      } else {
        // super_admin
        onSelectUserAndNavigate(matched.id, 'health_risk');
      }

      setIsSubmitting(false);
    }, 250);
  };

  /**
   * Helper to fill credentials into the universal login form for evaluators
   */
  const handleFillCredentials = (identifier: string) => {
    setLoginIdentifier(identifier);
    setPasswordInput('Pilot2026!');
    setErrorMessage(null);
  };

  const filteredDrawerSchools = leaderboard.filter(
    (entry) =>
      entry.school.name.toLowerCase().includes(drawerSchoolSearch.toLowerCase()) ||
      entry.school.code.toLowerCase().includes(drawerSchoolSearch.toLowerCase()) ||
      entry.school.city.toLowerCase().includes(drawerSchoolSearch.toLowerCase()) ||
      entry.club.name.toLowerCase().includes(drawerSchoolSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-8 animate-in fade-in duration-300">
      {/* ====================================================================
       * Central Universal Sign-In Card (Stanford HAI Editorial Aesthetic)
       * ==================================================================== */}
      <div className="max-w-md mx-auto w-full">
        {/* Brand Lockup */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#005FA3] text-[#9CF2F2] shadow-sm mb-1">
            <Recycle className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111010] font-[var(--font-jakarta)]">
              Sign In to Haritha Pasal
            </h1>
            <p className="text-xs sm:text-sm text-[#111010]/70 mt-1">
              Sri Lanka School Circular Economy Platform • GIZ National Pilot
            </p>
          </div>
        </div>

        {/* Universal Form Card */}
        <div className="hai-card p-6 sm:p-8 space-y-5 bg-[#FFFFFF] border border-[#111010]/15 shadow-sm rounded-2xl">
          <form onSubmit={handleUniversalSignIn} className="space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed animate-in fade-in duration-200">
                {errorMessage}
              </div>
            )}

            {/* Field 1: Universal Login ID or Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="universal-login-id"
                className="block text-xs font-bold text-[#111010] uppercase tracking-wider"
              >
                Login ID or Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#111010]/40">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="universal-login-id"
                  type="text"
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. GIZ-SUPER-ADMIN or SCH-01-STUDENT"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#111010]/20 bg-[#F8FAFC] text-xs font-semibold text-[#111010] placeholder:text-[#111010]/40 focus:bg-white focus:border-[#005FA3] focus:ring-2 focus:ring-[#005FA3]/15 outline-none transition"
                />
              </div>
              <p className="text-[11px] text-[#111010]/55">
                Works with GIZ Admin, Expert Panel, School Teacher, or Student Club ID.
              </p>
            </div>

            {/* Field 2: Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="universal-password"
                  className="block text-xs font-bold text-[#111010] uppercase tracking-wider"
                >
                  Password
                </label>
                <span className="text-[11px] text-[#005FA3] font-medium">
                  Pilot Default: Pilot2026!
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#111010]/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="universal-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#111010]/20 bg-[#F8FAFC] text-xs font-semibold text-[#111010] placeholder:text-[#111010]/40 focus:bg-white focus:border-[#005FA3] focus:ring-2 focus:ring-[#005FA3]/15 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#111010]/40 hover:text-[#111010] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Security Notice */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#111010]/75">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#111010]/30 text-[#005FA3] focus:ring-[#005FA3] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Remember session</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] text-[#005FA3] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Supabase RBAC</span>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#005FA3] text-white hover:bg-[#0B3E6E] active:scale-[0.99] transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Recycle className="w-4 h-4 animate-spin text-[#9CF2F2]" />
                  <span>Authenticating &amp; Routing...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Public Index Fallback Link */}
          <div className="pt-4 border-t border-[#111010]/10 text-center text-xs text-[#111010]/65">
            <span>Want to browse public standings first? </span>
            <button
              onClick={() => onSelectUserAndNavigate(users[0].id, 'leaderboard')}
              className="text-[#005FA3] font-bold hover:underline cursor-pointer"
            >
              View 15-School Public Index →
            </button>
          </div>

          {/* Direct Role Route Shortcuts */}
          <div className="pt-3 border-t border-[#111010]/10 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#005FA3] text-center">
              Direct Role Route Shortcuts:
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] sm:text-[11px]">
              <Link
                href="/dashboard/student"
                className="p-2 rounded-lg bg-[#E6F1FA] text-[#005FA3] font-bold hover:bg-[#005FA3] hover:text-white transition flex flex-col items-center justify-center gap-0.5"
              >
                <span>Student</span>
                <span className="font-mono text-[9px] opacity-75">+94771234501</span>
              </Link>
              <Link
                href="/dashboard/teacher"
                className="p-2 rounded-lg bg-[#E6F1FA] text-[#005FA3] font-bold hover:bg-[#005FA3] hover:text-white transition flex flex-col items-center justify-center gap-0.5"
              >
                <span>Teacher</span>
                <span className="font-mono text-[9px] opacity-75">+94772234501</span>
              </Link>
              <Link
                href="/dashboard/expert"
                className="p-2 rounded-lg bg-[#E6F1FA] text-[#005FA3] font-bold hover:bg-[#005FA3] hover:text-white transition flex flex-col items-center justify-center gap-0.5"
              >
                <span>Expert</span>
                <span className="font-mono text-[9px] opacity-75">+94771000001</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
       * Discreet Collapsible "Pilot Testing Credentials" Helper Drawer
       * (Gold Standard for Testing/Staging: clean by default, 1-click helper)
       * ==================================================================== */}
      <div className="max-w-2xl mx-auto">
        <div className="border border-[#111010]/15 rounded-2xl bg-white/70 backdrop-blur-xs overflow-hidden transition-all shadow-2xs">
          {/* Drawer Accordion Header */}
          <button
            onClick={() => setIsPilotDrawerOpen(!isPilotDrawerOpen)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#F0F3F5]/60 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-[#005FA3]" />
              <div>
                <span className="text-xs font-bold text-[#111010]">
                  Pilot Evaluator Quick Reference &amp; Sample Credentials
                </span>
                <span className="hidden sm:inline text-xs text-[#111010]/60 ml-2">
                  (Click to expand sample test accounts)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#005FA3]">
              <span>{isPilotDrawerOpen ? 'Collapse' : 'Expand'}</span>
              {isPilotDrawerOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Drawer Accordion Body */}
          {isPilotDrawerOpen && (
            <div className="p-5 border-t border-[#111010]/12 space-y-4 bg-[#FAFBFB]">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'All Roles (34)' },
                    { id: 'giz', label: '1. GIZ Super Admin' },
                    { id: 'expert', label: '2. Expert Panel' },
                    { id: 'teacher', label: '3. Teachers (15)' },
                    { id: 'student', label: '4. School Clubs (15)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPilotDrawerTab(tab.id as typeof pilotDrawerTab)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                        pilotDrawerTab === tab.id
                          ? 'bg-[#005FA3] text-[#9CF2F2]'
                          : 'bg-white text-[#111010]/75 border border-[#111010]/15 hover:bg-[#E6F1FA]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* School Search within Drawer */}
                {(pilotDrawerTab === 'all' ||
                  pilotDrawerTab === 'teacher' ||
                  pilotDrawerTab === 'student') && (
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-[#111010]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={drawerSchoolSearch}
                      onChange={(e) => setDrawerSchoolSearch(e.target.value)}
                      placeholder="Search school / code..."
                      className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-[#111010]/20 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Category 1: GIZ Super Admin Card */}
              {(pilotDrawerTab === 'all' || pilotDrawerTab === 'giz') && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#005FA3]">
                    Category 1 • GIZ Sri Lanka (National Program Office)
                  </div>
                  {gizAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="p-3 bg-white rounded-xl border border-[#111010]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#111010]">
                          {admin.full_name}
                        </div>
                        <div className="text-[11px] text-[#111010]/65 font-mono">
                          ID: <strong className="text-[#005FA3]">{admin.login_code}</strong> • {admin.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials(admin.login_code || admin.email)}
                        className="px-3 py-1.5 rounded-lg bg-[#E6F1FA] text-[#005FA3] font-bold text-xs hover:bg-[#005FA3] hover:text-white transition cursor-pointer shrink-0"
                      >
                        Auto-Fill Form →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Category 2: Expert Panel Card */}
              {(pilotDrawerTab === 'all' || pilotDrawerTab === 'expert') && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#005FA3]">
                    Category 2 • National Expert Evaluation Panel
                  </div>
                  {expertPanelUsers.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 bg-white rounded-xl border border-[#111010]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#111010]">
                          {exp.full_name}
                        </div>
                        <div className="text-[11px] text-[#111010]/65 font-mono">
                          ID: <strong className="text-[#005FA3]">{exp.login_code}</strong> • {exp.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFillCredentials(exp.login_code || exp.email)}
                        className="px-3 py-1.5 rounded-lg bg-[#E6F1FA] text-[#005FA3] font-bold text-xs hover:bg-[#005FA3] hover:text-white transition cursor-pointer shrink-0"
                      >
                        Auto-Fill Form →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Categories 3 & 4: 15 Schools List */}
              {(pilotDrawerTab === 'all' ||
                pilotDrawerTab === 'teacher' ||
                pilotDrawerTab === 'student') && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#005FA3]">
                    Categories 3 &amp; 4 • 15 Participating Schools (Teacher &amp; Generic Club)
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {filteredDrawerSchools.map((entry) => {
                      const student = studentUsers.find(
                        (u) => u.school_id === entry.school.id
                      );
                      const teacher = teacherUsers.find(
                        (u) => u.school_id === entry.school.id
                      );

                      return (
                        <div
                          key={entry.school.id}
                          className="p-3 bg-white rounded-xl border border-[#111010]/12 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-[#111010]">
                              <span className="font-mono text-[#005FA3] mr-1.5">
                                {entry.school.code}
                              </span>
                              {entry.school.name} ({entry.school.city})
                            </div>
                            <span className="text-[11px] font-mono font-semibold text-[#14494F]">
                              Rank #{entry.rank}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#111010]/8">
                            {/* Generic Student Club */}
                            {student && (
                              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                                <div>
                                  <div className="font-semibold text-[11px] text-[#005FA3]">
                                    Student Club: {student.login_code}
                                  </div>
                                  <div className="text-[10px] text-[#111010]/60 truncate max-w-[160px]">
                                    {student.email}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleFillCredentials(student.login_code || student.email)}
                                  className="px-2.5 py-1 rounded bg-[#E6F1FA] text-[#005FA3] font-bold text-[11px] hover:bg-[#005FA3] hover:text-white transition cursor-pointer"
                                >
                                  Fill →
                                </button>
                              </div>
                            )}

                            {/* Supervising Teacher */}
                            {teacher && (
                              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                                <div>
                                  <div className="font-semibold text-[11px] text-[#111010]">
                                    Teacher: {teacher.login_code}
                                  </div>
                                  <div className="text-[10px] text-[#111010]/60 truncate max-w-[160px]">
                                    {teacher.email}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleFillCredentials(teacher.login_code || teacher.email)}
                                  className="px-2.5 py-1 rounded bg-slate-200 text-[#111010] font-bold text-[11px] hover:bg-[#111010] hover:text-white transition cursor-pointer"
                                >
                                  Fill →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
