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
} from 'lucide-react';
import { LibraryBranch } from '../app/page';

interface DesktopSidebarProps {
  activeTab: 'home' | 'seats' | 'students' | 'transactions' | 'more';
  onSelectTab: (tab: 'home' | 'seats' | 'students' | 'transactions' | 'more') => void;
  activeLibrary: LibraryBranch | null;
  libraries: LibraryBranch[];
  onSelectLibrary: (lib: LibraryBranch) => void;
  onOpenCreateLibrary: () => void;
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
  currentUser,
  onLogout,
  isSuperAdmin,
  hasActiveSubscription,
  onOpenAdminPortal,
  onOpenAddStudent,
  onOpenCollectFee,
}) => {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);

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
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed left-0 top-0 bottom-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
            sL
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-base tracking-tight">seeLibrary</span>
              <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded border border-indigo-200">
                SaaS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Smart Library Management</p>
          </div>
        </div>
      </div>

      {/* Library Branch Selector */}
      <div className="p-3 border-b border-slate-100 relative">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
          Active Branch
        </label>
        <button
          type="button"
          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 truncate">
              {activeLibrary?.name || 'Select Branch'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isBranchDropdownOpen && (
          <div className="absolute left-3 right-3 top-16 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
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
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{lib.name}</span>
                  {lib.id === activeLibrary?.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsBranchDropdownOpen(false);
                  onOpenCreateLibrary();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors"
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
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
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
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Admin Portal</span>
              </div>
              <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.2 rounded">
                ROOT
              </span>
            </button>
          </div>
        )}

        {/* Quick CTA Actions */}
        <div className="pt-4 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-2">
            Quick Actions
          </label>
          <button
            type="button"
            onClick={onOpenAddStudent}
            className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Enroll Student</span>
          </button>
          <button
            type="button"
            onClick={onOpenCollectFee}
            className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>+ Collect Fee</span>
          </button>
        </div>
      </nav>

      {/* User Profile & Sign Out Footer */}
      {currentUser && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  currentUser.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</h5>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
