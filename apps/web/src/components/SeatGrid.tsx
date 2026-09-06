'use client';

import React, { useState } from 'react';
import type { SeatStatus } from '@library/types';
import { Armchair, Check, Wrench, Ban, UserCheck, X, Building2, Plus, Trash2 } from 'lucide-react';
import { formatShift } from './StudentList';

export interface VisualSeatItem {
  id: string;
  seatNumber: string;
  rowName: string;
  status: SeatStatus;
  studentName?: string | null;
  shift?: string | null;
  roomId?: string | null;
}

interface SeatGridProps {
  seats: VisualSeatItem[];
  onStatusChange?: (seatId: string, newStatus: SeatStatus) => void;
  onAssignStudent?: (seatId: string) => void;
  onAddRoom?: () => void;
  onAddRow?: () => void;
  onBatchGenerate?: () => void;
  onDeleteSeat?: (seatId: string) => void;
  onDeleteRow?: (rowName: string) => void;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  seats,
  onStatusChange,
  onAssignStudent,
  onAddRoom,
  onAddRow,
  onBatchGenerate,
  onDeleteSeat,
  onDeleteRow,
}) => {
  const [selectedSeat, setSelectedSeat] = useState<VisualSeatItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Sort seats in natural numeric sequence (e.g. 01, 02, 03, ..., 10, 11)
  const sortedSeats = [...seats].sort((a, b) =>
    a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
  );

  const filteredSeats = sortedSeats.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  const uniqueRows = Array.from(new Set(sortedSeats.map((s) => s.rowName || 'Row A'))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const getStatusBadge = (status: SeatStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100',
          indicator: 'bg-emerald-500',
          label: 'Available',
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100',
          indicator: 'bg-indigo-500',
          label: 'Occupied',
        };
      case 'MAINTENANCE':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100',
          indicator: 'bg-rose-500',
          label: 'Maintenance',
        };
      case 'RESERVED':
        return {
          bg: 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100',
          indicator: 'bg-purple-500',
          label: 'Reserved',
        };
    }
  };

  return (
    <div className="space-y-3">
      {/* Quick Status Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
              filterStatus === status
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {status === 'ALL' ? `All (${seats.length})` : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Responsive Seat Grid (Grouped by Row) */}
      {uniqueRows.length > 0 ? (
        <div className="space-y-4">
          {uniqueRows.map((rName) => {
            const rowSeats = filteredSeats
              .filter((s) => (s.rowName || 'Row A') === rName)
              .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' }));
            if (rowSeats.length === 0) return null;
            return (
              <div key={rName} className="space-y-2 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      {rName}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
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
                      className="text-slate-400 hover:text-rose-600 p-1 px-2 rounded-lg hover:bg-rose-50 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 text-center shadow-xs ${badge.bg}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.indicator}`} />
                          <span className="text-[11px] font-bold tracking-tight">{seat.seatNumber.replace(/^[A-Za-z0-9]+-/, '')}</span>
                        </div>
                        <span className="text-[11px] font-medium truncate max-w-[65px] mt-0.5">
                          {seat.studentName || badge.label}
                        </span>
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
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
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
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 text-center shadow-xs ${badge.bg}`}
              >
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.indicator}`} />
                  <span className="text-[11px] font-bold tracking-tight">{seat.seatNumber.replace(/^[A-Za-z0-9]+-/, '')}</span>
                </div>
                <span className="text-[11px] font-medium truncate max-w-[65px] mt-0.5">
                  {seat.studentName || badge.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {seats.length === 0 ? (
        <div className="p-10 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
            <Armchair className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Seats Configured Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Generate study halls, numbered rows, and seats to start assigning students.
          </p>
          {(onAddRow || onAddRoom || onBatchGenerate) && (
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
                  className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs hover:bg-slate-50 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Add Room & Rows</span>
                </button>
              ) : null}
              {onBatchGenerate && (
                <button
                  type="button"
                  onClick={onBatchGenerate}
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Batch Generate Seats</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : filteredSeats.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
          No seats matching the current filter.
        </div>
      ) : null}

      {/* Touch-Friendly Seat Detail Modal */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Seat {selectedSeat.seatNumber.replace(/^[A-Za-z0-9]+-/, '')}</h3>
                  <p className="text-xs text-slate-500">{selectedSeat.rowName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Occupant Info */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Occupant</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {selectedSeat.studentName ? (
                  <div className="flex items-center justify-between">
                    <span>{selectedSeat.studentName}</span>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      {formatShift(selectedSeat.shift || 'FULL_DAY')}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 font-normal">No student currently assigned</span>
                )}
              </div>
            </div>

            {/* Status Switcher Actions */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Change Status</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange?.(selectedSeat.id, 'AVAILABLE');
                    setSelectedSeat((prev) => (prev ? { ...prev, status: 'AVAILABLE', studentName: null } : null));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    selectedSeat.status === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
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
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    selectedSeat.status === 'MAINTENANCE'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Wrench className="w-4 h-4" /> Maintenance
                </button>
              </div>
            </div>

            {/* Assign Student CTA */}
            {selectedSeat.status === 'AVAILABLE' ? (
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
            ) : selectedSeat.status === 'OCCUPIED' ? (
              <button
                type="button"
                onClick={() => {
                  onAssignStudent?.(selectedSeat.id);
                  setSelectedSeat(null);
                }}
                className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
              >
                <UserCheck className="w-4 h-4" /> Change / Reassign Student
              </button>
            ) : null}

            {/* Delete Seat CTA */}
            {onDeleteSeat && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const cleanNum = selectedSeat.seatNumber.replace(/^[A-Za-z0-9]+-/, '');
                    if (window.confirm(`Are you sure you want to delete seat "${cleanNum}"?`)) {
                      onDeleteSeat(selectedSeat.id);
                      setSelectedSeat(null);
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 active:bg-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
