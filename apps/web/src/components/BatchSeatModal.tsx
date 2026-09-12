'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Layers, Armchair, Hash, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export interface BatchSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoomName?: string;
  targetRowName?: string;
  availableRows?: string[];
  existingSeats?: Array<{ seatNumber: string; rowName?: string; roomId?: string | null }>;
  onAddSeats: (data: {
    rowName: string;
    startNumber: number;
    count: number;
    prefix?: string;
    hasLocker?: boolean;
  }) => Promise<void> | void;
}

export const BatchSeatModal: React.FC<BatchSeatModalProps> = ({
  isOpen,
  onClose,
  targetRoomName,
  targetRowName,
  availableRows = [],
  existingSeats = [],
  onAddSeats,
}) => {
  const [selectedRow, setSelectedRow] = useState<string>('');
  const [count, setCount] = useState<number | ''>(1);
  const [startNumber, setStartNumber] = useState<number | ''>(1);
  const [prefix, setPrefix] = useState<string>('');
  const [hasLocker, setHasLocker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Computes the next suggested sequential number based on existing seats in library/room
  const getSuggestedStartNumber = () => {
    if (!existingSeats || existingSeats.length === 0) return 1;
    let max = 0;
    existingSeats.forEach((s) => {
      const match = s.seatNumber.match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > max) max = val;
      }
    });
    return max > 0 ? max + 1 : 1;
  };

  useEffect(() => {
    if (isOpen) {
      const row = targetRowName || (availableRows.length > 0 ? availableRows[0] : 'Row A');
      setSelectedRow(row);
      setCount(1);
      const suggested = getSuggestedStartNumber();
      setStartNumber(suggested);
      setPrefix('');
      setHasLocker(false);
      setErrorMsg(null);
    }
  }, [isOpen, targetRowName, availableRows, existingSeats]);

  if (!isOpen) return null;

  const numCount = count === '' ? 1 : Math.max(1, Number(count));
  const numStart = startNumber === '' ? 1 : Math.max(1, Number(startNumber));

  // Generate preview list
  const previewSeats: string[] = [];
  for (let i = 0; i < Math.min(numCount, 12); i++) {
    const num = numStart + i;
    const formatted = num < 10 && !prefix ? `${num}` : `${num}`;
    previewSeats.push(`${prefix}${formatted}`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRow.trim()) {
      setErrorMsg('Please select or specify a target row.');
      return;
    }
    if (numCount < 1) {
      setErrorMsg('Please specify at least 1 seat to add.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onAddSeats({
        rowName: selectedRow.trim(),
        startNumber: numStart,
        count: numCount,
        prefix: prefix.trim(),
        hasLocker,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add seats to row.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-indigo-600 dark:bg-indigo-700 p-4 sm:p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Add Seat(s) to Row</h3>
              <p className="text-xs text-indigo-100">
                {targetRoomName ? `${targetRoomName} • ` : ''}Configure and add desks into {selectedRow || 'Row'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Row Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
              Target Row *
            </label>
            {availableRows.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={selectedRow}
                  onChange={(e) => setSelectedRow(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-bold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                >
                  {availableRows.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or new row"
                  value={selectedRow}
                  onChange={(e) => setSelectedRow(e.target.value)}
                  className="w-1/2 px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            ) : (
              <input
                type="text"
                required
                value={selectedRow}
                onChange={(e) => setSelectedRow(e.target.value)}
                placeholder="e.g. Row A"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-bold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              />
            )}
          </div>

          {/* Number of seats to add */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                Number of Seats to Add *
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 5, 10].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCount(q)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-colors cursor-pointer ${
                      count === q
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-[#303030] hover:bg-slate-200'
                    }`}
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={100}
              required
              value={count}
              onChange={(e) => setCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-bold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Start Number & Prefix Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                Starting Number *
              </label>
              <input
                type="number"
                min={1}
                required
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-bold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                Prefix (Optional)
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. S- or A-"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Book Locker Checkbox */}
          <div
            onClick={() => setHasLocker((prev) => !prev)}
            className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between cursor-pointer select-none hover:bg-amber-100/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🔐</span>
              <div>
                <span className="font-bold text-slate-900 dark:text-amber-200 block text-xs">
                  Attach Book Locker
                </span>
                <span className="text-[10px] text-amber-800/80 dark:text-amber-400">
                  Tag newly created seats with locker amenities
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hasLocker}
              onChange={(e) => setHasLocker(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Live Preview Bar */}
          <div className="p-3 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-[#262626] space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block">
              Seats to be created in {selectedRow || 'Row'}:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {previewSeats.map((sNum) => (
                <span
                  key={sNum}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] text-indigo-700 dark:text-indigo-300 font-bold text-xs"
                >
                  {sNum} {hasLocker ? '🔐' : ''}
                </span>
              ))}
              {numCount > 12 && (
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 self-center">
                  +{numCount - 12} more
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-neutral-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-[#262626] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding Seats...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {numCount} {numCount === 1 ? 'Seat' : 'Seats'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

