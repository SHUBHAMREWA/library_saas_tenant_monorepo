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
  Star,
  Check,
} from 'lucide-react';

interface PublicLandingPageProps {
  onOpenAuth: () => void;
}

export function PublicLandingPage({ onOpenAuth }: PublicLandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20">
            sL
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-white">
              see<span className="text-indigo-400">Library</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              SaaS OS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>Sign In / Start Free</span>
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="relative px-4 sm:px-8 pt-16 pb-20 max-w-6xl mx-auto w-full flex flex-col items-center text-center overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-xs animate-in fade-in slide-in-from-bottom-3 duration-500">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>The Next-Gen Operating System for Study Centers & Libraries</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
          Effortless Management for <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Study Libraries & Reading Rooms
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          Say goodbye to messy paper registers and WhatsApp groups. Manage multiple branches, design interactive seat layouts, schedule shifts, collect monthly fees, and manage student KYC in one fast, mobile-first app.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span>Start Free (Google / OTP)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-sm rounded-2xl transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>1-Click Demo</span>
          </button>
        </div>

        {/* Free Tier Highlight */}
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>100% Free Initially • No credit card required • Create multiple libraries</span>
        </div>
      </section>

      {/* 4-Step How It Works Walkthrough Banner */}
      <section className="px-4 sm:px-8 py-12 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Fast 4-Step Onboarding
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
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
              color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
            },
            {
              step: '02',
              title: 'Define Rooms & Rows',
              desc: 'Configure silent study halls, AC cubicles, and numbered rows (Row A, Row B...).',
              icon: Layers,
              color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
            },
            {
              step: '03',
              title: 'Generate Seats',
              desc: 'Batch create seats with auto-numbering from A-01 to A-50 in a single tap.',
              icon: Armchair,
              color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
            },
            {
              step: '04',
              title: 'Enroll Students',
              desc: 'Assign shift seats, track admission KYC, record monthly fees, and issue digital receipts.',
              icon: Users,
              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-slate-500 tracking-wider">
                      STEP {item.step}
                    </span>
                    <div className={`p-2.5 rounded-xl border ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
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
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Core Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Built Specially for Study Center Owners
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Everything you need to maximize seat occupancy, prevent payment leakages, and ensure uninterrupted quiet study environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 hover:border-indigo-500/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4">
              <Armchair className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Visual Seat Grid</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Color-coded status matrix (Occupied, Available, Maintenance, Reserved) showing live occupancy at a glance.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Shift Turnover System</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Allocate same seat to multiple students across distinct shifts (Morning, Evening, Full Day, Night) without collision.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 hover:border-emerald-500/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
              <IndianRupee className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Fee & Revenue History</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Collect 4h, half-day, and full-day monthly fees. Automated expiry alerts 5 days prior with payment mode records.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 hover:border-sky-500/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Multi-Library Support</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Manage 2, 5, or 10 branches from a single login. Switch branches with 1-click and maintain separate student databases.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 hover:border-amber-500/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">PWA & Offline Ready</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Install directly onto Android / iPhone home screens. Operates smoothly with cached roster even during Wi-Fi dropouts.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 hover:border-rose-500/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Digital KYC & ID Upload</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Store government ID copies, target competitive exam purposes (UPSC, CA, NEET), and emergency guardian contacts safely.
            </p>
          </div>
        </div>
      </section>

      {/* Free Plan Pricing Callout */}
      <section className="px-4 sm:px-8 py-12 max-w-4xl mx-auto w-full">
        <div className="bg-gradient-to-r from-indigo-900/60 via-slate-800 to-purple-900/60 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Free Starter Tier
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Get Started for 0₹. No Payments Initially.
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
              Create your library, define rooms, generate your first seats, and enroll students. Upgrade to Pro only when scaling past capacity.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>Start Free Now</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 px-4 sm:px-8 py-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto w-full gap-3">
        <div className="flex items-center gap-2 font-bold text-slate-400">
          <span>seeLibrary SaaS</span>
          <span>•</span>
          <span>Study Library OS</span>
        </div>
        <p>© 2026 seeLibrary. Built for physical reading rooms and competitive exam centers.</p>
      </footer>
    </div>
  );
}
