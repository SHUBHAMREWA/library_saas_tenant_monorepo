'use client';

import React from 'react';
import {
  Building2,
  Layers,
  Armchair,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface QuickCheckHeroProps {
  onOpenAuth: () => void;
  onOpenCreateLibrary: () => void;
  onOpenAddRoom: () => void;
  onOpenGenerateSeats: () => void;
  onOpenAddStudent: () => void;
  isLoggedIn: boolean;
  libraryName: string;
}

export function QuickCheckHero({
  onOpenAuth,
  onOpenCreateLibrary,
  onOpenAddRoom,
  onOpenGenerateSeats,
  onOpenAddStudent,
  isLoggedIn,
  libraryName,
}: QuickCheckHeroProps) {
  const STEPS = [
    {
      step: '1',
      title: 'Create Library',
      description: 'Define your study branch, contact, and hours',
      icon: Building2,
      action: onOpenCreateLibrary,
      actionText: 'Setup Library',
      badge: 'Step 1',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      step: '2',
      title: 'Add Rooms & Rows',
      description: 'Set up quiet halls, AC cabins, and numbered rows',
      icon: Layers,
      action: onOpenAddRoom,
      actionText: 'Add Room',
      badge: 'Step 2',
      color: 'from-indigo-600 to-violet-600',
    },
    {
      step: '3',
      title: 'Generate Seats',
      description: 'Auto-sequence seat grids from A-01 to A-50',
      icon: Armchair,
      action: onOpenGenerateSeats,
      actionText: 'Batch Seats',
      badge: 'Step 3',
      color: 'from-violet-600 to-purple-600',
    },
    {
      step: '4',
      title: 'Add Students',
      description: 'Assign shift seats, upload KYC, track fee dues',
      icon: Users,
      action: onOpenAddStudent,
      actionText: 'Enroll Student',
      badge: 'Step 4',
      color: 'from-emerald-600 to-teal-600',
    },
  ];

  return (
    <section className="bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-indigo-800/40 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-indigo-800/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-2 backdrop-blur-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Mobile-First Study Center OS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            see<span className="text-indigo-400">Library</span>
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/90 mt-1 max-w-xl">
            The modern operating system for study libraries, reading rooms, and competitive exam centers.
            Manage seats, shifts, student KYC, and fee collections effortlessly.
          </p>
        </div>

        {/* Auth / Branch Status */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Login / Sign Up</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-indigo-900/80 border border-indigo-700/60 px-3.5 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <p className="text-[10px] text-indigo-300 font-medium">Active Branch</p>
                <p className="text-xs font-bold text-white">{libraryName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4-Step Interactive Workflow */}
      <div className="relative z-10 pt-6">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-bold text-indigo-100 flex items-center gap-2">
            <span>Setup & Workflow Guide</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
              4 Easy Steps
            </span>
          </h3>
          <span className="text-xs text-indigo-300 font-medium hidden sm:inline">
            Click any step to launch setup modal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/40 rounded-2xl p-4 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200">
                      {item.badge}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shadow-xs`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={item.action}
                  className="mt-4 w-full py-2 bg-white/10 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
