'use client';

import React from 'react';
import {
  LayoutDashboard,
  Armchair,
  Users,
  IndianRupee,
  MoreHorizontal,
  ShieldCheck,
  Building2,
  ChevronDown,
  Plus,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Bell,
  Pencil,
} from 'lucide-react';
import { LibraryBranch } from '../app/page';
import { useTheme } from './ThemeProvider';

interface DesktopSidebarProps {
  activeTab: 'home' | 'seats' | 'students' | 'transactions' | 'more';
  onSelectTab: (tab: 'home' | 'seats' | 'students' | 'transactions' | 'more') => void;
  activeLibrary: LibraryBranch | null;
  libraries: LibraryBranch[];
  onSelectLibrary: (lib: LibraryBranch) => void;
  onOpenCreateLibrary: () => void;
  onOpenEditLibrary?: () => void;
  currentUser: {
    fullName: string;
    email: string;
    phone: string;
    role: string;
    avatar?: string;
  } | null;
  onLogout: () => void;
  isSuperAdmin?: boolean;
  hasActiveSubscription?: boolean;
  onOpenAdminPortal?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  onOpenAddStudent: () => void;
  onOpenCollectFee: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  activeLibrary,
  libraries,
  onSelectLibrary,
  onOpenCreateLibrary,
  onOpenEditLibrary,
  currentUser,
  onLogout,
  isSuperAdmin,
  hasActiveSubscription,
  onOpenAdminPortal,
  onOpenNotifications,
  unreadNotificationCount = 0,
  onOpenAddStudent,
  onOpenCollectFee,
}) => {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const navItems: {
    id: 'home' | 'seats' | 'students' | 'transactions' | 'more';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'seats', label: 'Seat Layout', icon: Armchair },
    { id: 'students', label: 'Students', icon: Users, badge: activeLibrary ? `${activeLibrary.students.length}` : undefined },
    {
      id: 'transactions',
      label: 'Fee History',
      icon: IndianRupee,
      badge: !hasActiveSubscription && !isSuperAdmin ? 'PRO' : undefined,
    },
    { id: 'more', label: 'Settings & Branch', icon: MoreHorizontal },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-black border-r border-slate-200 dark:border-[#262626] fixed left-0 top-0 bottom-0 z-30 select-none transition-colors duration-150">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 dark:border-[#262626] flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 text-left group cursor-pointer transition-all"
          title="Go to Home Dashboard"
        >
          <img
            src="/icons/icon-192x192.png"
            alt="seeLibrary Logo"
            className="w-11 h-11 rounded-xl object-contain bg-white shadow-xs group-hover:scale-105 border border-slate-200 dark:border-neutral-800 shrink-0 transition-transform duration-200"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 dark:text-white text-xl tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                seeLibrary
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#737373] font-semibold">Smart Library Management</p>
          </div>
        </button>

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-neutral-800 relative transition-colors cursor-pointer"
            title="Open Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full shadow-xs">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Library Branch Selector */}
      <div className="p-3 border-b border-slate-100 dark:border-[#262626] relative">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#737373] mb-1 px-1">
          Active Branch
        </label>
        <button
          type="button"
          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#121212] hover:bg-slate-100 dark:hover:bg-[#1a1a1a] border border-slate-200/80 dark:border-[#262626] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
              {activeLibrary?.name || 'Select Branch'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373] shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isBranchDropdownOpen && (
          <div className="absolute left-3 right-3 top-16 bg-white dark:bg-[#121212] rounded-xl shadow-xl border border-slate-200 dark:border-[#262626] p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {libraries.map((lib) => (
                <button
                  key={lib.id}
                  type="button"
                  onClick={() => {
                    onSelectLibrary(lib);
                    setIsBranchDropdownOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    lib.id === activeLibrary?.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'text-slate-600 dark:text-[#a8a8a8] hover:bg-slate-50 dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className="truncate">{lib.name}</span>
                  {lib.id === activeLibrary?.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="pt-1 border-t border-slate-100 dark:border-[#262626] space-y-0.5">
              {onOpenEditLibrary && activeLibrary && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBranchDropdownOpen(false);
                    onOpenEditLibrary();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Edit Active Branch</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsBranchDropdownOpen(false);
                  onOpenCreateLibrary();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create New Branch</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#737373] mb-1.5 px-2">
          Navigation
        </label>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#a8a8a8] hover:bg-slate-100 dark:hover:bg-[#1a1a1a] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-[#737373]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#262626] text-slate-500 dark:text-[#a8a8a8]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* SuperAdmin Link */}
        {isSuperAdmin && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Admin Portal</span>
              </div>
              <span className="text-[9px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.2 rounded">
                ROOT
              </span>
            </button>
          </div>
        )}

        {/* Quick CTA Actions */}
        <div className="pt-4 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#737373] mb-1 px-2">
            Quick Actions
          </label>
          <button
            type="button"
            onClick={onOpenAddStudent}
            className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Enroll Student</span>
          </button>
          <button
            type="button"
            onClick={onOpenCollectFee}
            className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>+ Collect Fee</span>
          </button>
        </div>
      </nav>

      {/* Theme Switcher (Instagram Dark Aesthetic) */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-[#262626]">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#737373] mb-1.5 px-1">
          Appearance
        </label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-[#121212] rounded-xl border border-slate-200/60 dark:border-[#262626]">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Light Mode"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="text-[10px]">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-black dark:bg-[#262626] text-white shadow-2xs'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Dark Mode (Instagram Style)"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="text-[10px]">Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              theme === 'system'
                ? 'bg-white dark:bg-[#262626] text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Follow System Theme"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="text-[10px]">Auto</span>
          </button>
        </div>
      </div>

      {/* User Profile & Sign Out Footer */}
      {currentUser && (
        <div className="p-3 border-t border-slate-100 dark:border-[#262626] bg-slate-50/50 dark:bg-black/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  currentUser.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.fullName}</h5>
                <p className="text-[10px] text-slate-400 dark:text-[#737373] truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 dark:text-[#737373] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
