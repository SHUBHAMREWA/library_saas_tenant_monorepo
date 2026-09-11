'use client';

import React, { useState } from 'react';
import { X, Building2, Phone, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';

interface CreateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (library: { name: string; contactPhone: string; address?: string }) => void;
}

export function CreateLibraryModal({ isOpen, onClose, onCreated }: CreateLibraryModalProps) {
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactPhone.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onCreated({
        name: name.trim(),
        contactPhone: contactPhone.trim(),
        address: address.trim() || undefined,
      });
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-indigo-600 dark:bg-indigo-700 p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-6 h-6" />
            <h3 className="text-xl font-bold">Create Library Branch</h3>
          </div>
          <p className="text-xs text-indigo-100">
            Set up your study library or reading room workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Free Starter Tier:</strong> Create and manage your library branch for free with zero initial fees.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
              Library / Study Hub Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Study Hub - Central Branch"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
              Branch Contact Phone *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-neutral-500">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
              Address / City (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-neutral-500">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 2nd Floor, Civil Lines, Prayagraj"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !contactPhone.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Branch...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Create & Activate Branch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
