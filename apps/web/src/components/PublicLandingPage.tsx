'use client';

import React from 'react';
import {
  Armchair,
  CheckCircle2,
  IndianRupee,
  Clock,
  ShieldCheck,
  Zap,
  Users,
  Building2,
  Layers,
  ArrowRight,
  Sparkles,
  Smartphone,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { FooterShareBar } from './FooterShareBar';

interface PublicLandingPageProps {
  onOpenAuth: () => void;
  onLaunchDemo: () => void;
}

export function PublicLandingPage({ onOpenAuth, onLaunchDemo }: PublicLandingPageProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between transition-colors w-full max-w-full">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer shrink-0"
          title="seeLibrary Home"
        >
          <img
            src="/icons/icon-192x192.png"
            alt="seeLibrary Logo"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white shadow-xs group-hover:scale-105 border border-slate-200 dark:border-slate-800 transition-transform duration-200"
          />
          <div className="flex items-center gap-1">
            <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              see<span className="text-indigo-600 dark:text-indigo-400">Library</span>
            </span>
          </div>
        </a>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer shadow-2xs shrink-0"
            aria-label="Toggle theme"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenAuth}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onLaunchDemo}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-200 fill-amber-200" />
            <span className="hidden sm:inline">1-Click Demo (Without Login)</span>
            <span className="sm:hidden">1-Click Demo</span>
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="relative px-4 sm:px-8 pt-14 sm:pt-20 pb-16 sm:pb-24 max-w-6xl mx-auto w-full flex flex-col items-center text-center overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-purple-400/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-xs shadow-2xs animate-in fade-in slide-in-from-bottom-3 duration-500">
          <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
          <span>The Next-Gen Operating System for Study Centers & Libraries</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl leading-tight">
          Effortless Management for <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400 bg-clip-text text-transparent">
            Study Libraries & Reading Rooms
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Say goodbye to messy paper registers and WhatsApp groups. Manage multiple branches, design interactive seat layouts, schedule shifts, collect monthly fees, and manage student KYC in one fast, mobile-first app.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span>Start Free (Google / OTP)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLaunchDemo}
            className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-slate-800/90 hover:bg-amber-50/50 dark:hover:bg-slate-700/90 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm dark:shadow-lg dark:shadow-amber-500/10 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>1-Click Demo</span>
          </button>
        </div>

        {/* Free Tier Highlight */}
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>100% Free Initially • No credit card required • Create multiple libraries</span>
        </div>
      </section>

      {/* 4-Step How It Works Walkthrough Banner */}
      <section className="px-4 sm:px-8 py-12 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Fast 4-Step Onboarding
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            From Zero to Fully Operational in Minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Create Your Library',
              desc: 'Add your study center name, phone, and address. Manage multiple branches with ease.',
              icon: Building2,
              color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
            },
            {
              step: '02',
              title: 'Define Rooms & Rows',
              desc: 'Configure silent study halls, AC cubicles, and numbered seat rows.',
              icon: Layers,
              color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
            },
            {
              step: '03',
              title: 'Enroll Students',
              desc: 'Assign shift seats, track admission KYC, record monthly fees, and issue digital receipts.',
              icon: Users,
              color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 hover:border-indigo-300 dark:hover:border-slate-600 hover:shadow-md transition-all flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-wider">
                      STEP {item.step}
                    </span>
                    <div className={`p-2.5 rounded-xl border ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="px-4 sm:px-8 py-12 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Built Specially for Study Center Owners
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto">
            Everything you need to maximize seat occupancy, prevent payment leakages, and ensure uninterrupted quiet study environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-6 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Armchair className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Visual Seat Grid</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Color-coded status matrix (Occupied, Available, Maintenance, Reserved) showing live occupancy at a glance.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-6 hover:border-purple-400 dark:hover:border-purple-500/50 shadow-xs hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Shift Turnover System</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Allocate same seat to multiple students across distinct shifts (Morning, Evening, Full Day, Night) without collision.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-6 hover:border-emerald-400 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <IndianRupee className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Fee & Revenue History</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Collect 4h, half-day, and full-day monthly fees. Automated expiry alerts 5 days prior with payment mode records.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-6 hover:border-sky-400 dark:hover:border-sky-500/50 shadow-xs hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-600/20 border border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Multi-Library Support</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Manage 2, 5, or 10 branches from a single login. Switch branches with 1-click and maintain separate student databases.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-6 hover:border-amber-400 dark:hover:border-amber-500/50 shadow-xs hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-600/20 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">PWA & Offline Ready</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Install directly onto Android / iPhone home screens. Operates smoothly with cached roster even during Wi-Fi dropouts.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-6 hover:border-rose-400 dark:hover:border-rose-500/50 shadow-xs hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-600/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Digital KYC & ID Upload</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Store government ID copies, target competitive exam purposes (UPSC, CA, NEET), and emergency guardian contacts safely.
            </p>
          </div>
        </div>
      </section>

      {/* Free Plan Pricing Callout */}
      <section className="px-4 sm:px-8 py-12 max-w-4xl mx-auto w-full">
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-purple-950/60 border border-indigo-200 dark:border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md dark:shadow-2xl relative overflow-hidden transition-colors">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" /> Free Starter Tier
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Get Started for 0₹. No Payments Initially.
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md">
              Create your library, define rooms, generate your first seats, and enroll students. Upgrade to Pro only when scaling past capacity.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span>Start Free Now</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 py-8 text-xs text-slate-500 dark:text-slate-400 max-w-6xl mx-auto w-full transition-colors flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-center sm:text-left">
            <span className="font-extrabold text-slate-900 dark:text-white text-sm">seeLibrary</span>
            <span className="hidden sm:inline">•</span>
            <span>Study Library OS</span>
          </div>

          {/* Social Share & Conditional PWA Download */}
          <FooterShareBar />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-neutral-500 gap-2 text-center sm:text-left">
          <p>© 2026 seeLibrary. Built for physical reading rooms and competitive exam centers.</p>
          <p className="font-medium">Fast • Offline-Ready • Installable PWA</p>
        </div>
      </footer>
    </div>
  );
}

