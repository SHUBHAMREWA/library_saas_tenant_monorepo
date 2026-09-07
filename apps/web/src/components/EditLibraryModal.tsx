'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, Phone, MapPin, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface EditLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: {
    id: string;
    name: string;
    contactPhone: string;
    address?: string;
  } | null;
  onSave: (data: { name: string; contactPhone: string; address?: string }) => Promise<void> | void;
}

export function EditLibraryModal({ isOpen, onClose, library, onSave }: EditLibraryModalProps) {
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (library) {
      setName(library.name || '');
      setContactPhone(library.contactPhone || '');
      setAddress(library.address || '');
      setErrorMsg(null);
    }
  }, [library, isOpen]);

  if (!isOpen || !library) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Library name is required');
      return;
    }
    if (!contactPhone.trim()) {
      setErrorMsg('Contact phone number is required');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await onSave({
        name: name.trim(),
        contactPhone: contactPhone.trim(),
        address: address.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update library details');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-indigo-600 dark:bg-indigo-700 p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Edit Library Details</h3>
              <p className="text-xs text-indigo-100">
                Update name, contact number, and branch address
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
              Branch Contact Phone / Mobile *
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
            <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">
              Used for WhatsApp receipts, SMS updates, and student inquiries.
            </p>
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
                placeholder="e.g. Civil Lines, Rewa"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !contactPhone.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
