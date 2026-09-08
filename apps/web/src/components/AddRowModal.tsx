'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Check, Armchair, Hash } from 'lucide-react';

interface AddRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  existingRows: string[];
  existingSeats?: Array<{ seatNumber: string; rowName?: string; roomId?: string | null }>;
  onAddRows: (data: {
    rowNames: string[];
    rowConfigs?: Array<{ name: string; hasLocker: boolean }>;
    seatsPerRow: number;
    startNumber?: number;
  }) => Promise<void> | void;
}

export function AddRowModal({
  isOpen,
  onClose,
  roomName,
  existingRows,
  existingSeats = [],
  onAddRows,
}: AddRowModalProps) {
  const [rowInputs, setRowInputs] = useState<Array<{ name: string; hasLocker: boolean }>>([]);
  const [seatsPerRow, setSeatsPerRow] = useState<number | ''>(10);
  const [startNumber, setStartNumber] = useState<number | ''>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Computes the next suggested sequential number based on existing seats
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
      if (!existingRows || existingRows.length === 0) {
        setRowInputs([
          { name: 'Row A', hasLocker: false },
          { name: 'Row B', hasLocker: false },
        ]);
      } else {
        const nextLetter = String.fromCharCode(65 + existingRows.length);
        setRowInputs([{ name: `Row ${nextLetter}`, hasLocker: false }]);
      }
      const suggested = getSuggestedStartNumber();
      setStartNumber(suggested);
      setSeatsPerRow(10);
    }
  }, [isOpen, existingRows, existingSeats]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const totalCount = existingRows.length + rowInputs.length;
    const nextLetter = String.fromCharCode(65 + totalCount);
    setRowInputs((prev) => [...prev, { name: `Row ${nextLetter}`, hasLocker: false }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rowInputs.length <= 1) return;
    setRowInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const numStart = startNumber === '' ? 1 : Math.max(1, Number(startNumber));
  const numSeats = seatsPerRow === '' ? 0 : Math.max(0, Number(seatsPerRow));
  const validRows = rowInputs.filter((r) => r.name.trim().length > 0);
  const totalSeatsToCreate = rowInputs.length * numSeats;
  const lockerRowsCount = validRows.filter((r) => r.hasLocker).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRows = validRows.length > 0 ? validRows : [{ name: 'Row A', hasLocker: false }];

    setIsLoading(true);
    try {
      await onAddRows({
        rowNames: finalRows.map((r) => r.name),
        rowConfigs: finalRows,
        seatsPerRow: numSeats,
        startNumber: numStart,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 dark:bg-[#1c1c1e] p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-6 h-6 text-indigo-400" />
            <h3 className="text-xl font-bold">Add Rows & Seats</h3>
          </div>
          <p className="text-xs text-slate-300 dark:text-neutral-400">
            Adding rows to <strong>{roomName}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Row names list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                Rows to Add
              </label>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Row
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {rowInputs.map((rowItem, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={rowItem.name}
                    onChange={(e) => {
                      const updated = [...rowInputs];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setRowInputs(updated);
                    }}
                    placeholder={`e.g. Row ${String.fromCharCode(65 + existingRows.length + idx)}`}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...rowInputs];
                      updated[idx] = { ...updated[idx], hasLocker: !updated[idx].hasLocker };
                      setRowInputs(updated);
                    }}
                    title={rowItem.hasLocker ? 'Locker row: all seats will include lockers' : 'Click to enable Locker for this row'}
                    className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      rowItem.hasLocker
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-[#262626] text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-[#333]'
                    }`}
                  >
                    <span>🔐</span>
                    <span>{rowItem.hasLocker ? 'Locker Row' : '+ Locker'}</span>
                  </button>
                  {rowInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-2 text-slate-400 dark:text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete row"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Seats per Row & Starting Number in a 2-Column Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                Seats per Row
              </label>
              <input
                type="number"
                min={0}
                max={150}
                value={seatsPerRow}
                onChange={(e) => setSeatsPerRow(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="10"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                  Starting Seat #
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                  <Hash className="w-2.5 h-2.5" /> Seq
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={9999}
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="1"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
              />
            </div>
          </div>

          {/* Sequential Preview Box across rows */}
          {numSeats > 0 && validRows.length > 0 && (
            <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] p-3 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-150">
              <span className="font-semibold text-slate-900 dark:text-white block text-[11px]">
                Seat Sequence Preview (Continuous Numbering):
              </span>
              <div className="space-y-1">
                {validRows.map((r, i) => {
                  const rowStart = numStart + (i * numSeats);
                  const rowEnd = rowStart + numSeats - 1;
                  const startPadded = rowStart < 10 ? `0${rowStart}` : `${rowStart}`;
                  const endPadded = rowEnd < 10 ? `0${rowEnd}` : `${rowEnd}`;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs bg-white dark:bg-[#121212] px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-[#262626]">
                      <span className="font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <span>{r.name}:</span>
                        {r.hasLocker && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                            🔐 Locker Row
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {startPadded} → {endPadded}
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal ml-1">({numSeats} seats)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 rounded-xl text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Armchair className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>{rowInputs.length} new row(s)</strong>
                {lockerRowsCount > 0 && <span className="text-amber-700 dark:text-amber-400 font-semibold"> ({lockerRowsCount} 🔐 Locker)</span>}
                {' '}• <strong>{totalSeatsToCreate} seats total</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-[#1c1c1e] px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">
              Starts #{numStart}
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Adding Rows...' : `Save & Add to ${roomName}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
