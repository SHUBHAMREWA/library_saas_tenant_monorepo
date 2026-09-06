'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Layers, AlertCircle } from 'lucide-react';

interface BatchSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoomName?: string;
  availableRows?: string[];
  existingSeats?: Array<{ seatNumber: string; rowName?: string }>;
  onGenerate: (data: { prefix: string; startNumber: number; count: number; rowName?: string }) => void;
}

export const BatchSeatModal: React.FC<BatchSeatModalProps> = ({
  isOpen,
  onClose,
  targetRoomName,
  availableRows,
  existingSeats = [],
  onGenerate,
}) => {
  const [selectedRow, setSelectedRow] = useState<string>('Row A');
  const [prefix, setPrefix] = useState('A-');
  const [startNumber, setStartNumber] = useState<number | ''>(1);
  const [count, setCount] = useState<number | ''>(10);

  // Computes the next available sequential number for a specific row/prefix
  const getNextStartNumber = (rowName: string, pfx: string) => {
    if (!existingSeats || existingSeats.length === 0) return 1;
    const cleanRow = rowName.trim().toLowerCase();
    const cleanPfx = pfx.trim().toLowerCase();

    const matching = existingSeats.filter((s) => {
      const rowMatch = s.rowName && s.rowName.trim().toLowerCase() === cleanRow;
      const prefixMatch = s.seatNumber.toLowerCase().startsWith(cleanPfx);
      return rowMatch || prefixMatch;
    });

    if (matching.length === 0) return 1;

    let max = 0;
    matching.forEach((s) => {
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
      const defaultRow = availableRows && availableRows.length > 0 ? availableRows[0] : 'Row A';
      setSelectedRow(defaultRow);
      const initialPrefix = '';
      setPrefix(initialPrefix);
      const nextNum = getNextStartNumber(defaultRow, initialPrefix);
      setStartNumber(nextNum);
      setCount(10);
    }
  }, [isOpen, availableRows]);

  const handleRowChange = (newRow: string) => {
    setSelectedRow(newRow);
    const nextPrefix = prefix;
    const nextNum = getNextStartNumber(newRow, nextPrefix);
    setStartNumber(nextNum);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setPrefix(newPrefix);
    const nextNum = getNextStartNumber(selectedRow, newPrefix);
    setStartNumber(nextNum);
  };

  const numStart = startNumber === '' ? 1 : Number(startNumber);
  const numCount = count === '' ? 1 : Number(count);
  const previewFirst = `${prefix}${numStart < 10 ? `0${numStart}` : numStart}`;
  const endNum = numStart + numCount - 1;
  const previewLast = `${prefix}${endNum < 10 ? `0${endNum}` : endNum}`;

  // Check if any seat numbers in the range already exist
  const overlappingSeats = useMemo(() => {
    if (!isOpen || !existingSeats || existingSeats.length === 0) return [];
    const conflicts: string[] = [];

    for (let i = 0; i < numCount; i++) {
      const num = numStart + i;
      const padded = num < 10 ? `0${num}` : `${num}`;
      const seatNum = `${prefix}${padded}`.toLowerCase().trim();
      if (existingSeats.some((s) => s.seatNumber.toLowerCase().trim() === seatNum)) {
        conflicts.push(`${prefix}${padded}`);
      }
    }
    return conflicts;
  }, [isOpen, existingSeats, numStart, numCount, prefix]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      prefix,
      startNumber: numStart,
      count: numCount,
      rowName: selectedRow,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white text-slate-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl space-y-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Batch Generate Seats</h3>
              <p className="text-xs text-slate-500">Rapid sequence generator for rows</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {targetRoomName && (
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-900 flex items-center justify-between">
            <span>Adding to Room: <strong>{targetRoomName}</strong></span>
          </div>
        )}

        {/* Overlap / Collision Warning with Auto-Fix */}
        {overlappingSeats.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Seats Already Exist!</span>
              </div>
              <button
                type="button"
                onClick={() => setStartNumber(getNextStartNumber(selectedRow, prefix))}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer transition-colors"
              >
                Auto Fix: Start at #{getNextStartNumber(selectedRow, prefix)}
              </button>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {overlappingSeats.slice(0, 5).join(', ')}
              {overlappingSeats.length > 5 ? ` and ${overlappingSeats.length - 5} more` : ''} already exist in this row. Click Auto Fix to avoid collisions.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Row
            </label>
            {availableRows && availableRows.length > 0 ? (
              <select
                value={selectedRow}
                onChange={(e) => handleRowChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {availableRows.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedRow}
                onChange={(e) => handleRowChange(e.target.value)}
                placeholder="e.g. Row A"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seat Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              placeholder="e.g. A-, B-, Seat-"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Number
              </label>
              <input
                type="number"
                min={1}
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Seats to Generate
              </label>
              <input
                type="number"
                min={1}
                max={150}
                value={count}
                onChange={(e) => setCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Sequence Preview Box */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600">
            <span className="font-semibold text-slate-900 block mb-0.5">Sequence Preview:</span>
            {previewFirst} → {previewLast} ({numCount} seats total)
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm mt-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Create {numCount} Seats
          </button>
        </form>
      </div>
    </div>
  );
};
