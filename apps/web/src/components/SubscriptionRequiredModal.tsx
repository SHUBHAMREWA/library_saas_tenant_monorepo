'use client';

import React from 'react';
import { Crown, CheckCircle2, X, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface SubscriptionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeClick: () => void;
  actionTitle?: string;
}

export const SubscriptionRequiredModal: React.FC<SubscriptionRequiredModalProps> = ({
  isOpen,
  onClose,
  onUpgradeClick,
  actionTitle = 'This Action',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-[#262626] relative overflow-hidden">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />

        <div className="flex items-start justify-between pt-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Crown className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-neutral-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Subscription Required
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Unlock Student & Fee Management
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
            Creating libraries, rooms, and seat layouts is <strong className="text-slate-700 dark:text-neutral-200">100% free</strong>.
            To {actionTitle.toLowerCase()}, your library requires an active SaaS subscription.
          </p>
        </div>

        {/* Feature List */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-100 dark:border-[#262626] space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-neutral-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Enroll unlimited students & assign seats</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-neutral-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Instant fee collection with digital receipts</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-neutral-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Full Fee Ledger & monthly revenue reports</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-neutral-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Automated WhatsApp & SMS dues alerts</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onUpgradeClick();
            }}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Subscription Plans & Upgrade</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
          >
            Continue with Library & Room Design
          </button>
        </div>
      </div>
    </div>
  );
};
