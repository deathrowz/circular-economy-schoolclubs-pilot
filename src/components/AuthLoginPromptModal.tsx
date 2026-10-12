'use client';

import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Gavel,
  KeyRound,
  Lock,
  LogOut,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { UserProfile, UserRole } from '@/types/domain';

interface AuthLoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  activeUser: UserProfile | null;
  onSelectUser: (user: UserProfile) => void;
  promptReason?: string | null;
}

export function AuthLoginPromptModal({
  isOpen,
  onClose,
  users,
  activeUser,
  onSelectUser,
  promptReason,
}: AuthLoginPromptModalProps) {
  const [activeTab, setActiveTab] = useState<'dummy_quick' | 'code_login'>('dummy_quick');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<
    'all' | 'super_admin' | 'expert_admin' | 'teacher' | 'student'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('Pilot2026!');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const gizUsers = users.filter((u) => u.role === 'super_admin');
  const expertUsers = users.filter((u) => u.role === 'expert_admin');
  const teacherUsers = users.filter((u) => u.role === 'teacher');
  const studentUsers = users.filter((u) => u.role === 'student');
  const mentorUsers = users.filter((u) => u.role === 'mentor');

  const filteredUsers = users.filter((u) => {
    if (selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.login_code?.toLowerCase().includes(q) ||
      (u.school_name && u.school_name.toLowerCase().includes(q)) ||
      (u.school_code && u.school_code.toLowerCase().includes(q))
    );
  });

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = loginInput.trim().toLowerCase();
    if (!clean) {
      setErrorMessage('Please enter your login code or email address.');
      return;
    }

    const match = users.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.login_code?.toLowerCase() === clean ||
        u.id.toLowerCase() === clean ||
        (u.school_code && u.school_code.toLowerCase() === clean)
    );

    if (!match) {
      setErrorMessage(
        `No account found matching "${loginInput}". Try: GIZ-SUPER-ADMIN, EXPERT-PANEL-01, TEACHER-SCH-01, or STUDENT-SCH-01.`
      );
      return;
    }

    setErrorMessage(null);
    onSelectUser(match);
    onClose();
  };

  const handlePickDummyUser = (user: UserProfile) => {
    onSelectUser(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111010]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FFFFFF] rounded-2xl border border-[#111010]/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#005FA3] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#9CF2F2] text-xs font-mono font-bold uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              <span>Haritha Pasal • Authentication Gateway</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Select or Sign In to a Pilot Account
            </h2>
            <p className="text-xs sm:text-sm text-[#E6F1FA]/85 mt-1 max-w-xl">
              {promptReason ||
                'Access role-specific features across the 15 schools, Teacher approval queue, Expert scoring panel, and GIZ Super Admin audits.'}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#111010]/12 bg-[#F0F3F5] px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('dummy_quick')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'dummy_quick'
                ? 'bg-[#FFFFFF] text-[#005FA3] border-t-2 border-t-[#005FA3] shadow-xs'
                : 'text-[#111010]/70 hover:text-[#111010]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>1-Click Dummy Profiles ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('code_login')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'code_login'
                ? 'bg-[#FFFFFF] text-[#005FA3] border-t-2 border-t-[#005FA3] shadow-xs'
                : 'text-[#111010]/70 hover:text-[#111010]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Login Code / Email &amp; Password</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-[#FAFBFB]">
          {activeTab === 'dummy_quick' ? (
            <div className="space-y-4">
              {/* Category Filter Pills & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setSelectedRoleFilter('all')}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                      selectedRoleFilter === 'all'
                        ? 'bg-[#005FA3] text-white'
                        : 'bg-[#F0F3F5] text-[#111010]/70 hover:bg-[#E6F1FA]'
                    }`}
                  >
                    All ({users.length})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('super_admin')}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                      selectedRoleFilter === 'super_admin'
                        ? 'bg-[#005FA3] text-white'
                        : 'bg-[#F0F3F5] text-[#111010]/70 hover:bg-[#E6F1FA]'
                    }`}
                  >
                    1. GIZ Super Admin ({gizUsers.length})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('expert_admin')}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                      selectedRoleFilter === 'expert_admin'
                        ? 'bg-[#005FA3] text-white'
                        : 'bg-[#F0F3F5] text-[#111010]/70 hover:bg-[#E6F1FA]'
                    }`}
                  >
                    2. Expert Panel ({expertUsers.length})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('teacher')}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                      selectedRoleFilter === 'teacher'
                        ? 'bg-[#005FA3] text-white'
                        : 'bg-[#F0F3F5] text-[#111010]/70 hover:bg-[#E6F1FA]'
                    }`}
                  >
                    3. Teachers ({teacherUsers.length})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('student')}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                      selectedRoleFilter === 'student'
                        ? 'bg-[#005FA3] text-white'
                        : 'bg-[#F0F3F5] text-[#111010]/70 hover:bg-[#E6F1FA]'
                    }`}
                  >
                    4. Student Clubs ({studentUsers.length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#111010]/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search school or name..."
                    className="w-full hai-input pl-9 pr-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Grid of Profiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredUsers.map((u) => {
                  const isCurrent = activeUser?.id === u.id;
                  const roleBadgeColor =
                    u.role === 'super_admin'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : u.role === 'expert_admin'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : u.role === 'teacher'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : u.role === 'student'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-800 border-zinc-200';

                  const roleLabel =
                    u.role === 'super_admin'
                      ? 'GIZ Super Admin'
                      : u.role === 'expert_admin'
                      ? 'National Expert Panel'
                      : u.role === 'teacher'
                      ? 'Supervising Teacher'
                      : u.role === 'student'
                      ? 'Student Entrepreneur'
                      : 'Industry Mentor';

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handlePickDummyUser(u)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#E6F1FA] border-[#005FA3] shadow-sm ring-2 ring-[#005FA3]/30'
                          : 'bg-white border-[#111010]/12 hover:border-[#005FA3] hover:shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadgeColor}`}
                          >
                            {roleLabel}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#005FA3] bg-[#E6F1FA] px-1.5 py-0.5 rounded">
                            {u.login_code}
                          </span>
                        </div>

                        <div className="font-bold text-sm text-[#111010] line-clamp-1">
                          {u.full_name}
                        </div>

                        {u.school_name && (
                          <div className="text-xs text-[#005FA3] font-semibold mt-0.5 line-clamp-1">
                            {u.school_name}
                          </div>
                        )}

                        <div className="text-[11px] text-[#111010]/60 mt-1 truncate">
                          {u.email}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#111010]/8 flex items-center justify-between text-xs font-semibold text-[#005FA3]">
                        <span>{isCurrent ? '✓ Currently Active' : 'Sign In Now →'}</span>
                        {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#005FA3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto py-4 space-y-5">
              <form onSubmit={handleManualLogin} className="hai-card p-6 space-y-4 shadow-sm">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-[#E6F1FA] text-[#005FA3] flex items-center justify-center mx-auto mb-2">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#111010]">
                    Sign In with Login Code or Email
                  </h3>
                  <p className="text-xs text-[#111010]/70">
                    Real Supabase authentication against <code>circular-schools-pilot</code>
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-[#111010]">Login Code or Email</label>
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="e.g. TEACHER-SCH-01 or circular-pilot@giz.de"
                    className="w-full hai-input px-3.5 py-2 text-xs"
                    autoFocus
                  />
                  <p className="text-[10px] text-[#111010]/60">
                    Examples: <code>GIZ-SUPER-ADMIN</code>, <code>EXPERT-PANEL-01</code>,{' '}
                    <code>TEACHER-SCH-01</code>, <code>STUDENT-SCH-01</code>
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-[#111010]">Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Password (default: Pilot2026!)"
                    className="w-full hai-input px-3.5 py-2 text-xs font-mono"
                  />
                  <p className="text-[10px] text-[#111010]/60">
                    All 34 dummy accounts use the default password: <code>Pilot2026!</code>
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full hai-btn-primary py-2.5 text-xs font-bold cursor-pointer"
                >
                  Authenticate &amp; Open Dashboard →
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('dummy_quick')}
                  className="text-xs text-[#005FA3] hover:underline font-semibold"
                >
                  ← Or click here to use 1-Click Dummy Profiles
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FFFFFF] border-t border-[#111010]/12 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-[#111010]/70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Supabase Project: <strong>dqrdhvrunmnufxpcxnuq</strong> (ap-south-1)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="hai-btn-secondary px-4 py-1.5 text-xs cursor-pointer"
            >
              Browse as Guest (Public Index)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
