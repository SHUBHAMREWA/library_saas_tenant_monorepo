'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  UserCheck,
  UserPlus,
  Armchair,
  CheckCircle2,
  Bookmark,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { StudentItem } from './StudentList';

export interface SeatInfo {
  id: string;
  seatNumber: string;
  rowName?: string;
  studentName?: string | null;
  status?: string;
  hasLocker?: boolean;
}

interface AssignSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  seat: SeatInfo | null;
  students: StudentItem[];
  onAssign: (studentId: string, seatNumber: string, shift?: string, isReserved?: boolean) => Promise<void> | void;
  onEnrollNewStudent: (seatNumber: string) => void;
}

const SHIFT_OPTIONS = [
  { id: 'FULL_DAY', label: 'Full Day', sub: '24/7 Unlimited' },
  { id: 'HALF_DAY', label: 'Half Day', sub: '6-8h / day slot' },
  { id: 'FOUR_HOURS', label: '4 Hours', sub: '4h / day slot' },
  { id: 'MORNING', label: 'Morning', sub: '6 AM - 2 PM' },
  { id: 'EVENING', label: 'Evening', sub: '2 PM - 10 PM' },
  { id: 'NIGHT', label: 'Night', sub: '10 PM - 6 AM' },
];

export const AssignSeatModal: React.FC<AssignSeatModalProps> = ({
  isOpen,
  onClose,
  seat,
  students,
  onAssign,
  onEnrollNewStudent,
}) => {
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('FULL_DAY');
  const [isReserved, setIsReserved] = useState<boolean>(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pendingStudent, setPendingStudent] = useState<StudentItem | null>(null);

  useEffect(() => {
    if (isOpen && seat) {
      setSearch('');
      setSelectedShift('FULL_DAY');
      setIsReserved(seat.status === 'RESERVED');
      setPendingStudent(null);
      setAssigningId(null);
    }
  }, [isOpen, seat]);

  if (!isOpen || !seat) return null;

  const isSeatCurrentlyReserved = seat.status === 'RESERVED';
  const isSeatCurrentlyOccupied = Boolean(seat.studentName && seat.studentName.trim());

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const executeAssignment = async (student: StudentItem) => {
    setAssigningId(student.id);
    try {
      await onAssign(student.id, seat.seatNumber, selectedShift, isReserved);
      onClose();
    } catch (e) {
      console.error('Failed to assign seat:', e);
    } finally {
      setAssigningId(null);
      setPendingStudent(null);
    }
  };

  const handleStudentSelect = (student: StudentItem) => {
    // If seat is already reserved or occupied by someone else, ask confirmation
    if ((isSeatCurrentlyReserved || isSeatCurrentlyOccupied) && seat.studentName !== student.fullName) {
      setPendingStudent(student);
      return;
    }

    executeAssignment(student);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-[#262626] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262626] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isSeatCurrentlyReserved
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Assign Seat {seat.seatNumber}
                </h3>
                {seat.hasLocker && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    🔐 Locker Included
                  </span>
                )}
                {isSeatCurrentlyReserved && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                    <Bookmark className="w-2.5 h-2.5" /> Reserved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {seat.rowName ? `${seat.rowName} • ` : ''}
                {seat.studentName ? `Current student: ${seat.studentName}` : 'Available for allotment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#1c1c1e] text-slate-400 dark:text-neutral-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* REASSIGNMENT CONFIRMATION SCREEN */}
        {pendingStudent ? (
          <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                  Seat Already {isSeatCurrentlyReserved ? 'Reserved' : 'Occupied'}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Seat <strong>{seat.seatNumber}</strong> is currently {isSeatCurrentlyReserved ? 'reserved for' : 'assigned to'}{' '}
                  <strong>{seat.studentName || 'another student'}</strong>.
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  Reassigning will remove the previous student's seat allocation and allot it to{' '}
                  <strong>{pendingStudent.fullName}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] rounded-xl border border-slate-200 dark:border-[#262626] text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                <span>New Student:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {pendingStudent.fullName} ({pendingStudent.phone})
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                <span>Stay Duration / Shift:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-400">
                  {SHIFT_OPTIONS.find((s) => s.id === selectedShift)?.label || selectedShift}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                <span>Seat Reservation:</span>
                <span className={`font-bold ${isReserved ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500'}`}>
                  {isReserved ? 'Reserved Seat' : 'Standard Allotment'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#262626]">
              <button
                type="button"
                onClick={() => setPendingStudent(null)}
                className="flex-1 py-2.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-neutral-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-[#262626] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigningId === pendingStudent.id}
                onClick={() => executeAssignment(pendingStudent)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {assigningId === pendingStudent.id ? 'Reassigning...' : 'Confirm Reassign Seat'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Shift / Duration Selector */}
            <div className="shrink-0 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Select Stay Duration / Shift *</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {SHIFT_OPTIONS.slice(0, 3).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedShift(opt.id)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedShift === opt.id
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold shadow-2xs'
                        : 'border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1c1c1e] text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#262626]'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-neutral-500">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reserve Seat Toggle */}
            <div className="shrink-0 p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Bookmark className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 block">
                    Reserve this seat (Seat Reserve Karein)
                  </span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-400/90 block">
                    Auto-unreserves if student's duration ends.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                id="reserve-seat-toggle"
                checked={isReserved}
                onChange={(e) => setIsReserved(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-purple-300 dark:border-purple-700 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {/* Enroll New Student CTA */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  onEnrollNewStudent(seat.seatNumber);
                  onClose();
                }}
                className="w-full p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Enroll & Register New Student for Seat {seat.seatNumber}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider my-0.5 shrink-0">
              <div className="h-px bg-slate-200 dark:bg-[#262626] flex-1" />
              <span>Or Choose Existing Student</span>
              <div className="h-px bg-slate-200 dark:bg-[#262626] flex-1" />
            </div>

            {/* Search Bar */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name or phone..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[140px] pr-0.5">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const hasThisSeat = student.seatNumber === seat.seatNumber;
                  const isBusy = assigningId === student.id;

                  return (
                    <div
                      key={student.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        hasThisSeat
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1c1c1e] hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-neutral-200 font-bold flex items-center justify-center text-xs shrink-0">
                          {student.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {student.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                            <span>{student.phone}</span>
                            <span>•</span>
                            {student.seatNumber ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                                Seat: {student.seatNumber}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                No Seat
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={hasThisSeat || isBusy}
                        onClick={() => handleStudentSelect(student)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                          hasThisSeat
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 cursor-default'
                            : isReserved
                            ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs'
                            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs'
                        }`}
                      >
                        {hasThisSeat ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                          </>
                        ) : isBusy ? (
                          'Saving...'
                        ) : isReserved ? (
                          <>
                            <Bookmark className="w-3.5 h-3.5" /> Reserve Seat
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" /> Assign Seat
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-neutral-500 text-xs bg-slate-50 dark:bg-[#1c1c1e] rounded-xl border border-dashed border-slate-200 dark:border-[#262626]">
                  {students.length === 0
                    ? 'No students enrolled in this branch yet.'
                    : 'No students match your search.'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
