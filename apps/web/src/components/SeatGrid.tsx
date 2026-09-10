'use client';

import React, { useState } from 'react';
import type { SeatStatus } from '@library/types';
import { Armchair, Check, Wrench, Ban, UserCheck, X, Building2, Plus, Trash2 } from 'lucide-react';
import { formatShift } from './StudentList';

export interface SeatOccupant {
  studentId: string;
  studentName: string;
  shift: string;
  phone?: string;
}

export interface VisualSeatItem {
  id: string;
  seatNumber: string;
  rowName: string;
  status: SeatStatus;
  hasLocker?: boolean;
  studentName?: string | null;
  shift?: string | null;
  roomId?: string | null;
  occupants?: SeatOccupant[];
}

interface SeatGridProps {
  seats: VisualSeatItem[];
  onStatusChange?: (seatId: string, newStatus: SeatStatus) => void;
  onAssignStudent?: (seatId: string, preselectedShift?: string) => void;
  onAddRoom?: () => void;
  onAddRow?: () => void;
  onDeleteSeat?: (seatId: string) => void;
  onDeleteRow?: (rowName: string) => void;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  seats,
  onStatusChange,
  onAssignStudent,
  onAddRoom,
  onAddRow,
  onDeleteSeat,
  onDeleteRow,
}) => {
  const [selectedSeat, setSelectedSeat] = useState<VisualSeatItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [lockerFilter, setLockerFilter] = useState<'ALL' | 'LOCKER_ONLY'>('ALL');

  // Sort seats in natural numeric sequence (e.g. 01, 02, 03, ..., 10, 11)
  const sortedSeats = [...seats].sort((a, b) =>
    a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
  );

  const filteredSeats = sortedSeats.filter((s) => {
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    if (lockerFilter === 'LOCKER_ONLY' && !s.hasLocker) return false;
    return true;
  });

  const uniqueRows = Array.from(new Set(sortedSeats.map((s) => s.rowName || 'Row A'))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const getStatusBadge = (status: SeatStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
          indicator: 'bg-emerald-500',
          label: 'Available',
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
          indicator: 'bg-indigo-500',
          label: 'Occupied',
        };
      case 'MAINTENANCE':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50',
          indicator: 'bg-rose-500',
          label: 'Maintenance',
        };
      case 'RESERVED':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50',
          indicator: 'bg-purple-500',
          label: 'Reserved',
        };
    }
  };

  const renderSeatContent = (seat: VisualSeatItem, badge: { label: string; bg: string; indicator: string }) => {
    const occupants = seat.occupants || [];
    const fullDayOccupant = occupants.find((o) => (o.shift || '').toUpperCase() === 'FULL_DAY') || (seat.studentName && (!seat.shift || seat.shift === 'FULL_DAY') ? { studentName: seat.studentName } : null);
    const morningOccupant = occupants.find((o) => {
      const s = (o.shift || '').toUpperCase();
      return s === 'MORNING' || s === 'FOUR_HOURS' || s === 'HALF_DAY';
    }) || (seat.studentName && (seat.shift === 'MORNING' || seat.shift === 'FOUR_HOURS' || seat.shift === 'HALF_DAY') ? { studentName: seat.studentName } : null);
    const eveningOccupant = occupants.find((o) => (o.shift || '').toUpperCase() === 'EVENING') || (seat.studentName && seat.shift === 'EVENING' ? { studentName: seat.studentName } : null);
    const isShared = Boolean(morningOccupant && eveningOccupant);

    return (
      <>
        <div className="flex items-center justify-between w-full gap-0.5">
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${badge.indicator}`} />
            <span className="text-[11px] font-bold tracking-tight">{seat.seatNumber.replace(/^[A-Za-z0-9]+-/, '')}</span>
            {seat.hasLocker && (
              <span title="Book Locker Included" className="text-[9px]">🔐</span>
            )}
          </div>
          {isShared ? (
            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-indigo-200/80 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
              2/2
            </span>
          ) : fullDayOccupant ? (
            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              24h
            </span>
          ) : morningOccupant ? (
            <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              1/2 M
            </span>
          ) : eveningOccupant ? (
            <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
              1/2 E
            </span>
          ) : null}
        </div>
        <span className="text-[10px] font-medium truncate max-w-[70px] mt-0.5 block w-full text-center">
          {isShared
            ? `${morningOccupant?.studentName.split(' ')[0]} • ${eveningOccupant?.studentName.split(' ')[0]}`
            : (seat.studentName || badge.label)}
        </span>
      </>
    );
  };

  return (
    <div className="space-y-3">
      {/* Quick Status & Locker Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 cursor-pointer ${
              filterStatus === status
                ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                : 'bg-white dark:bg-[#121212] text-slate-600 dark:text-[#a8a8a8] border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#1a1a1a] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {status === 'ALL' ? `All (${seats.length})` : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-neutral-800 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setLockerFilter((prev) => (prev === 'ALL' ? 'LOCKER_ONLY' : 'ALL'))}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
            lockerFilter === 'LOCKER_ONLY'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white dark:bg-[#121212] text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30'
          }`}
          title="Filter seats with attached book lockers"
        >
          <span>🔐</span>
          <span>Locker Seats ({seats.filter((s) => s.hasLocker).length})</span>
        </button>
      </div>

      {/* Responsive Seat Grid (Grouped by Row) */}
      {uniqueRows.length > 0 ? (
        <div className="space-y-4">
          {uniqueRows.map((rName) => {
            const rowSeats = filteredSeats
              .filter((s) => (s.rowName || 'Row A') === rName)
              .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' }));
            if (rowSeats.length === 0) return null;

            const isRowLocker = rowSeats.some((s) => s.hasLocker);

            return (
              <div key={rName} className="space-y-2 p-3 bg-slate-50/70 dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626]">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-[#262626]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      {rName}
                    </span>
                    {isRowLocker && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                        🔐 Locker Row
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-[#a8a8a8]">
                      {rowSeats.length} {rowSeats.length === 1 ? 'seat' : 'seats'}
                    </span>
                  </div>
                  {onDeleteRow && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete row "${rName}" and all its ${rowSeats.length} seats?`)) {
                          onDeleteRow(rName);
                        }
                      }}
                      className="text-slate-400 dark:text-[#737373] hover:text-rose-600 dark:hover:text-rose-400 p-1 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title={`Delete ${rName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete Row</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {rowSeats.map((seat) => {
                    const badge = getStatusBadge(seat.status);
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => setSelectedSeat(seat)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 text-center shadow-xs cursor-pointer ${badge.bg}`}
                      >
                        {renderSeatContent(seat, badge)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {onAddRow && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onAddRow}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#262626] hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-[#121212]/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-[#a8a8a8] hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Add Another Row to this Room</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {filteredSeats.map((seat) => {
            const badge = getStatusBadge(seat.status);
            return (
              <button
                key={seat.id}
                type="button"
                onClick={() => setSelectedSeat(seat)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 text-center shadow-xs cursor-pointer ${badge.bg}`}
              >
                {renderSeatContent(seat, badge)}
              </button>
            );
          })}
        </div>
      )}

      {seats.length === 0 ? (
        <div className="p-10 text-center bg-slate-50/70 dark:bg-[#121212] rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#262626] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Armchair className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Seats Configured Yet</h4>
          <p className="text-xs text-slate-500 dark:text-[#a8a8a8] mt-1 max-w-xs">
            Generate study halls, numbered rows, and seats to start assigning students.
          </p>
          {(onAddRow || onAddRoom) && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {onAddRow ? (
                <button
                  type="button"
                  onClick={onAddRow}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rows & Seats</span>
                </button>
              ) : onAddRoom ? (
                <button
                  type="button"
                  onClick={onAddRoom}
                  className="px-3.5 py-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-[#262626] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Add Room & Rows</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : filteredSeats.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] text-slate-500 dark:text-[#a8a8a8] text-sm">
          No seats matching the current filter.
        </div>
      ) : null}

      {/* Touch-Friendly Seat Detail Modal */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
          <div className="bg-white dark:bg-[#121212] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-[#262626]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262626] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 dark:bg-[#1a1a1a] rounded-lg text-slate-700 dark:text-[#f5f5f5]">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Seat {selectedSeat.seatNumber.replace(/^[A-Za-z0-9]+-/, '')}</h3>
                    {selectedSeat.hasLocker && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                        🔐 Locker
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#a8a8a8]">{selectedSeat.rowName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#262626] text-slate-400 dark:text-[#737373] hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Multi-Student Shift Occupants Breakdown (Full Day, Morning, Evening) */}
            {(() => {
              const occupants = selectedSeat.occupants || [];
              const fullDayOccupant = occupants.find((o) => (o.shift || '').toUpperCase() === 'FULL_DAY') || (selectedSeat.studentName && (!selectedSeat.shift || selectedSeat.shift === 'FULL_DAY') ? { studentId: '', studentName: selectedSeat.studentName, shift: 'FULL_DAY' } : null);
              const morningOccupant = occupants.find((o) => {
                const s = (o.shift || '').toUpperCase();
                return s === 'MORNING' || s === 'FOUR_HOURS' || s === 'HALF_DAY';
              }) || (selectedSeat.studentName && (selectedSeat.shift === 'MORNING' || selectedSeat.shift === 'FOUR_HOURS' || selectedSeat.shift === 'HALF_DAY') ? { studentId: '', studentName: selectedSeat.studentName, shift: selectedSeat.shift } : null);
              const eveningOccupant = occupants.find((o) => (o.shift || '').toUpperCase() === 'EVENING') || (selectedSeat.studentName && selectedSeat.shift === 'EVENING' ? { studentId: '', studentName: selectedSeat.studentName, shift: 'EVENING' } : null);

              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-[#a8a8a8] uppercase tracking-wider block">
                      Shift Slots & Occupancy (Max 2)
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      fullDayOccupant
                        ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : morningOccupant && eveningOccupant
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : morningOccupant || eveningOccupant
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-[#222] text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-[#333]'
                    }`}>
                      {fullDayOccupant
                        ? '☀️ Full Day (1/1 Locked)'
                        : morningOccupant && eveningOccupant
                        ? '👥 2/2 Capacity Full'
                        : morningOccupant
                        ? '👤 1/2 (Morning Set • Evening Free)'
                        : eveningOccupant
                        ? '👤 1/2 (Evening Set • Morning Free)'
                        : '🟢 0/2 Available'}
                    </span>
                  </div>

                  {/* 3 Shift Slots: Full Day, Morning, Evening */}
                  <div className="space-y-2">
                    {/* 1. Full Day Slot */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      fullDayOccupant
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                        : morningOccupant || eveningOccupant
                        ? 'bg-slate-50/60 dark:bg-[#161616] border-slate-200/70 dark:border-[#262626] opacity-60'
                        : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-[#262626]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <span>☀️ Full Day Slot</span>
                          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">(24/7 Unlimited)</span>
                        </span>
                        {fullDayOccupant ? (
                          <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                            Occupied (24/7)
                          </span>
                        ) : morningOccupant || eveningOccupant ? (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-[#222] px-2 py-0.5 rounded-md">
                            Unavailable (Shared)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onAssignStudent?.(selectedSeat.id, 'FULL_DAY');
                              setSelectedSeat(null);
                            }}
                            className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          >
                            + Assign Full Day
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 flex items-center justify-between">
                        {fullDayOccupant ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                              <span className="truncate">{fullDayOccupant.studentName}</span>
                            </div>
                            {fullDayOccupant.phone && (
                              <span className="text-[11px] font-normal text-slate-500 dark:text-neutral-400 shrink-0">{fullDayOccupant.phone}</span>
                            )}
                          </>
                        ) : morningOccupant || eveningOccupant ? (
                          <span className="text-slate-400 dark:text-neutral-500 font-normal italic text-[11px]">
                            Seat shared by Morning/Evening students
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-neutral-500 font-normal italic text-[11px]">
                            No student assigned (Free 24/7)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Morning Shift Slot */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      morningOccupant
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-2xs'
                        : fullDayOccupant
                        ? 'bg-slate-50/60 dark:bg-[#161616] border-slate-200/70 dark:border-[#262626] opacity-60'
                        : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-[#262626]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <span>🌅 Morning Shift</span>
                          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">(6 AM – 2 PM)</span>
                        </span>
                        {morningOccupant ? (
                          <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                            Occupied
                          </span>
                        ) : fullDayOccupant ? (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-[#222] px-2 py-0.5 rounded-md">
                            Blocked by Full Day
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onAssignStudent?.(selectedSeat.id, 'MORNING');
                              setSelectedSeat(null);
                            }}
                            className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          >
                            + Assign Morning
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 flex items-center justify-between">
                        {morningOccupant ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              <span className="truncate">{morningOccupant.studentName}</span>
                            </div>
                            {morningOccupant.phone && (
                              <span className="text-[11px] font-normal text-slate-500 dark:text-neutral-400 shrink-0">{morningOccupant.phone}</span>
                            )}
                          </>
                        ) : fullDayOccupant ? (
                          <span className="text-slate-400 dark:text-neutral-500 font-normal italic text-[11px]">
                            Slot blocked by {fullDayOccupant.studentName} (Full Day)
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-neutral-500 font-normal italic text-[11px]">
                            No morning student assigned (Free)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Evening Shift Slot */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      eveningOccupant
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                        : fullDayOccupant
                        ? 'bg-slate-50/60 dark:bg-[#161616] border-slate-200/70 dark:border-[#262626] opacity-60'
                        : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-[#262626]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <span>🌇 Evening Shift</span>
                          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">(2 PM – 10 PM)</span>
                        </span>
                        {eveningOccupant ? (
                          <span className="text-[10px] font-extrabold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                            Occupied
                          </span>
                        ) : fullDayOccupant ? (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-[#222] px-2 py-0.5 rounded-md">
                            Blocked by Full Day
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onAssignStudent?.(selectedSeat.id, 'EVENING');
                              setSelectedSeat(null);
                            }}
                            className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          >
                            + Assign Evening
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 flex items-center justify-between">
                        {eveningOccupant ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                              <span className="truncate">{eveningOccupant.studentName}</span>
                            </div>
                            {eveningOccupant.phone && (
                              <span className="text-[11px] font-normal text-slate-500 dark:text-neutral-400 shrink-0">{eveningOccupant.phone}</span>
                            )}
                          </>
                        ) : fullDayOccupant ? (
                          <span className="text-slate-400 dark:text-neutral-500 font-normal italic text-[11px]">
                            Slot blocked by {fullDayOccupant.studentName} (Full Day)
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-neutral-500 font-normal italic text-[11px]">
                            No evening student assigned (Free)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Status Switcher Actions */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-[#a8a8a8]">Change Status</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange?.(selectedSeat.id, 'AVAILABLE');
                    setSelectedSeat((prev) => (prev ? { ...prev, status: 'AVAILABLE', studentName: null, occupants: [] } : null));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    selectedSeat.status === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-[#363636] text-slate-700 dark:text-[#f5f5f5] hover:bg-slate-50 dark:hover:bg-[#262626]'
                  }`}
                >
                  <Check className="w-4 h-4" /> Available (Free)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onStatusChange?.(selectedSeat.id, 'MAINTENANCE');
                    setSelectedSeat((prev) => (prev ? { ...prev, status: 'MAINTENANCE' } : null));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    selectedSeat.status === 'MAINTENANCE'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-[#363636] text-slate-700 dark:text-[#f5f5f5] hover:bg-slate-50 dark:hover:bg-[#262626]'
                  }`}
                >
                  <Wrench className="w-4 h-4" /> Maintenance
                </button>
              </div>
            </div>

            {/* Dynamic Assign Student CTA */}
            {(() => {
              const occupants = selectedSeat.occupants || [];
              const fullDay = occupants.find((o) => (o.shift || '').toUpperCase() === 'FULL_DAY') || (selectedSeat.studentName && (!selectedSeat.shift || selectedSeat.shift === 'FULL_DAY'));
              const morning = occupants.find((o) => {
                const s = (o.shift || '').toUpperCase();
                return s === 'MORNING' || s === 'FOUR_HOURS' || s === 'HALF_DAY';
              }) || (selectedSeat.studentName && (selectedSeat.shift === 'MORNING' || selectedSeat.shift === 'FOUR_HOURS' || selectedSeat.shift === 'HALF_DAY'));
              const evening = occupants.find((o) => (o.shift || '').toUpperCase() === 'EVENING') || (selectedSeat.studentName && selectedSeat.shift === 'EVENING');

              if (fullDay) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignStudent?.(selectedSeat.id);
                      setSelectedSeat(null);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4" /> Reassign / Replace Full Day Student
                  </button>
                );
              }
              if (morning && evening) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignStudent?.(selectedSeat.id);
                      setSelectedSeat(null);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4" /> Reassign / Replace Shift Occupant (2/2 Full)
                  </button>
                );
              }
              if (morning) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignStudent?.(selectedSeat.id, 'EVENING');
                      setSelectedSeat(null);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4" /> + Assign Student to Open Evening Slot (2nd Student)
                  </button>
                );
              }
              if (evening) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignStudent?.(selectedSeat.id, 'MORNING');
                      setSelectedSeat(null);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4" /> + Assign Student to Open Morning Slot (2nd Student)
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => {
                    onAssignStudent?.(selectedSeat.id);
                    setSelectedSeat(null);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                >
                  <UserCheck className="w-4 h-4" /> Assign Student to Seat
                </button>
              );
            })()}

            {/* Delete Seat CTA */}
            {onDeleteSeat && (
              <div className="pt-2 border-t border-slate-100 dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => {
                    const cleanNum = selectedSeat.seatNumber.replace(/^[A-Za-z0-9]+-/, '');
                    if (window.confirm(`Are you sure you want to delete seat "${cleanNum}"?`)) {
                      onDeleteSeat(selectedSeat.id);
                      setSelectedSeat(null);
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:bg-rose-200 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Seat {selectedSeat.seatNumber.replace(/^[A-Za-z0-9]+-/, '')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
