'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  CreditCard,
  Filter,
  Users,
  Loader2,
} from 'lucide-react';
import { StudentItem } from './StudentList';

export interface SeatOccupant {
  studentId: string;
  studentName: string;
  shift: string;
  phone?: string;
}

export interface SeatInfo {
  id: string;
  seatNumber: string;
  rowName?: string;
  studentName?: string | null;
  status?: string;
  hasLocker?: boolean;
  occupants?: SeatOccupant[];
}

interface AssignSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  seat: SeatInfo | null;
  students: StudentItem[];
  initialShift?: string;
  onAssign: (studentId: string, seatNumber: string, shift?: string, isReserved?: boolean) => Promise<void> | void;
  onEnrollNewStudent: (seatNumber: string) => void;
  onEnrollAndCollectFee?: (student: StudentItem, seatNumber: string, shift: string, duration?: string) => void;
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
  initialShift,
  onAssign,
  onEnrollNewStudent,
  onEnrollAndCollectFee,
}) => {
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('FULL_DAY');
  const [selectedDuration, setSelectedDuration] = useState<string>('HALF_DAY'); // For morning/evening: FOUR_HOURS or HALF_DAY
  const [isReserved, setIsReserved] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'SHIFT_ONLY' | 'ALL'>('SHIFT_ONLY');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pendingStudent, setPendingStudent] = useState<StudentItem | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string>('');
  const [enrollmentRequiredStudent, setEnrollmentRequiredStudent] = useState<StudentItem | null>(null);

  useEffect(() => {
    if (isOpen && seat) {
      setSearch('');
      setSelectedShift(initialShift || 'FULL_DAY');
      setSelectedDuration('HALF_DAY');
      setIsReserved(seat.status === 'RESERVED');
      setFilterMode('SHIFT_ONLY');
      setPendingStudent(null);
      setConflictMessage('');
      setEnrollmentRequiredStudent(null);
      setAssigningId(null);
    }
  }, [isOpen, seat, initialShift]);

  if (!isOpen || !seat) return null;

  // Compute the actual shift value to pass to onAssign:
  // - Full Day → FULL_DAY
  // - Morning + duration → MORNING (and duration is FOUR_HOURS or HALF_DAY)
  // - Evening + duration → EVENING (and duration is FOUR_HOURS or HALF_DAY)
  const effectiveShift =
    selectedShift === 'MORNING' || selectedShift === 'EVENING'
      ? selectedShift
      : selectedShift;

  const occupants: SeatOccupant[] =
    seat.occupants && seat.occupants.length > 0
      ? seat.occupants
      : seat.studentName
      ? [
          {
            studentId: '',
            studentName: seat.studentName,
            shift: (seat as any).shift || 'FULL_DAY',
          },
        ]
      : [];

  const fullDayOccupant = occupants.find(
    (o) => (o.shift || '').toUpperCase() === 'FULL_DAY'
  );
  const morningOccupant = occupants.find((o) => {
    const s = (o.shift || '').toUpperCase();
    return s === 'MORNING' || s === 'FOUR_HOURS' || s === 'HALF_DAY';
  });
  const eveningOccupant = occupants.find(
    (o) => (o.shift || '').toUpperCase() === 'EVENING'
  );

  const isSeatCurrentlyReserved = seat.status === 'RESERVED';
  const isSeatCurrentlyOccupied = occupants.length > 0;

  /**
   * Determine the student's enrolled shift for the current month period.
   * Checks recent fee transactions first, then student record.
   */
  const getStudentEnrolledShift = (student: StudentItem): 'MORNING' | 'EVENING' | 'FULL_DAY' | 'NONE' => {
    // Newly admitted students: no transactions AND no seat → never enrolled
    const txs = student.transactions || [];
    if (txs.length === 0 && !student.seatNumber) return 'NONE';

    for (const tx of txs) {
      if (tx.shift) {
        const s = tx.shift.toUpperCase();
        if (s === 'MORNING' || s === 'FOUR_HOURS' || s === 'HALF_DAY') return 'MORNING';
        if (s === 'EVENING') return 'EVENING';
        if (s === 'FULL_DAY') return 'FULL_DAY';
      }
      if (tx.notes) {
        const n = tx.notes.toUpperCase();
        if (n.includes('MORNING') || n.includes('4 HOUR') || n.includes('HALF DAY') || n.includes('FOUR_HOURS') || n.includes('HALF_DAY')) return 'MORNING';
        if (n.includes('EVENING')) return 'EVENING';
        if (n.includes('FULL_DAY') || n.includes('FULL DAY')) return 'FULL_DAY';
      }
    }
    if (student.seatNumber && student.shift) {
      const raw = student.shift.toUpperCase();
      if (raw === 'MORNING' || raw === 'FOUR_HOURS' || raw === 'HALF_DAY') return 'MORNING';
      if (raw === 'EVENING') return 'EVENING';
      if (raw === 'FULL_DAY') return 'FULL_DAY';
    }
    if (student.shift) {
      const raw = student.shift.toUpperCase();
      if (raw === 'MORNING' || raw === 'FOUR_HOURS' || raw === 'HALF_DAY') return 'MORNING';
      if (raw === 'EVENING') return 'EVENING';
      if (raw === 'FULL_DAY') return 'FULL_DAY';
    }
    return 'NONE';
  };

  /**
   * Live counts of enrolled students for each of the 3 shift columns
   */
  const morningEnrolledCount = useMemo(() => {
    return students.filter((s) => getStudentEnrolledShift(s) === 'MORNING').length;
  }, [students]);

  const eveningEnrolledCount = useMemo(() => {
    return students.filter((s) => getStudentEnrolledShift(s) === 'EVENING').length;
  }, [students]);

  const fullDayEnrolledCount = useMemo(() => {
    return students.filter((s) => getStudentEnrolledShift(s) === 'FULL_DAY').length;
  }, [students]);

  /**
   * Check if a student has ANY active fee transaction whose validFrom–validTo window
   * covers today. This handles the case where admin unassigned the seat but the student
   * still has a paid enrollment for the current period — we must NOT ask them to re-enroll.
   */
  const hasActiveEnrollmentPeriod = (student: StudentItem): boolean => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const currentYearStr = now.getFullYear().toString();

    const txs = student.transactions || [];
    // Never consider admission-only students (no transactions) as enrolled
    if (txs.length === 0) return false;

    return txs.some((tx) => {
      const isPaid = tx.status === 'PAID' || (tx.remainingFee !== undefined && Number(tx.remainingFee) === 0 && Number(tx.amount || 0) > 0);
      if (!isPaid) return false;

      // 1. Check validTo: if validTo is today or in the future
      if (tx.validTo) {
        const to = new Date(tx.validTo);
        to.setHours(23, 59, 59, 999);
        if (!isNaN(to.getTime()) && to >= startOfToday) return true;
      }

      // 2. Check date span: validFrom <= now
      if (tx.validFrom) {
        const from = new Date(tx.validFrom);
        from.setHours(0, 0, 0, 0);
        if (!isNaN(from.getTime()) && from <= now) {
          if (tx.validTo) {
            const to = new Date(tx.validTo);
            to.setHours(23, 59, 59, 999);
            if (!isNaN(to.getTime()) && to >= startOfToday) return true;
          } else {
            const exp = new Date(from.getTime() + 30 * 86400000);
            if (exp >= startOfToday) return true;
          }
        }
      }

      // 3. Check paidForMonth string containing current month & year
      if (tx.paidForMonth) {
        const p = tx.paidForMonth.toLowerCase();
        if (p.includes(currentMonthName) && p.includes(currentYearStr)) {
          return true;
        }
      }

      return false;
    });
  };

  /**
   * A student is considered "enrolled" if:
   *  1. They have at least one paid tx AND their membership has remaining days, OR
   *  2. They have a valid fee transaction covering today (even if seat was unassigned)
   *
   * IMPORTANT: Students with NO transactions are NEVER considered enrolled,
   * even if their membership shows days remaining (PAUSED with expectedEndDate).
   */
  const isEnrolledForCurrentPeriod = (student: StudentItem): boolean => {
    // Must have at least one paid transaction to be considered enrolled
    const hasTx = Boolean(student.transactions?.length);
    if (!hasTx) return false;

    // Seat is still assigned & membership is active with days remaining
    if (
      student.status !== 'INACTIVE' &&
      student.status !== 'EXPIRED' &&
      student.membershipEndsInDays > 0
    ) {
      return true;
    }
    // Seat was unassigned but student still has a paid enrollment window covering today
    return hasActiveEnrollmentPeriod(student);
  };

  /**
   * Filter and sort students based on active shift column, filter mode, and search term.
   * Priority: Unseated students (waiting for seat) first!
   */
  const filteredStudents = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return students
      .filter((s) => {
        // 1. Shift filter (if in SHIFT_ONLY mode)
        if (filterMode === 'SHIFT_ONLY') {
          const studentShift = getStudentEnrolledShift(s);
          if (selectedShift === 'MORNING' && studentShift !== 'MORNING') return false;
          if (selectedShift === 'EVENING' && studentShift !== 'EVENING') return false;
          if (selectedShift === 'FULL_DAY' && studentShift !== 'FULL_DAY') return false;
        }

        // 2. Search filter (by name, phone, or current seat number)
        if (searchLower) {
          const nameMatch = s.fullName.toLowerCase().includes(searchLower);
          const phoneMatch = s.phone.includes(searchLower);
          const seatMatch = s.seatNumber ? s.seatNumber.toLowerCase().includes(searchLower) : false;
          return nameMatch || phoneMatch || seatMatch;
        }

        return true;
      })
      .sort((a, b) => {
        // Priority 1: Students without a seat first! (waiting for allotment)
        const aHasNoSeat = !a.seatNumber;
        const bHasNoSeat = !b.seatNumber;
        if (aHasNoSeat && !bHasNoSeat) return -1;
        if (!aHasNoSeat && bHasNoSeat) return 1;

        // Priority 2: Student already assigned to this seat
        const aHasThisSeat = a.seatNumber === seat.seatNumber;
        const bHasThisSeat = b.seatNumber === seat.seatNumber;
        if (aHasThisSeat && !bHasThisSeat) return -1;
        if (!aHasThisSeat && bHasThisSeat) return 1;

        // Priority 3: Alphabetical
        return a.fullName.localeCompare(b.fullName);
      });
  }, [students, selectedShift, filterMode, search, seat.seatNumber]);

  const allShiftMatchesCount = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return students.length;
    return students.filter((s) => {
      const nameMatch = s.fullName.toLowerCase().includes(searchLower);
      const phoneMatch = s.phone.includes(searchLower);
      const seatMatch = s.seatNumber ? s.seatNumber.toLowerCase().includes(searchLower) : false;
      return nameMatch || phoneMatch || seatMatch;
    }).length;
  }, [students, search]);

  const executeAssignment = async (student: StudentItem) => {
    setAssigningId(student.id);
    const shiftToPass = selectedShift; // 'MORNING' | 'EVENING' | 'FULL_DAY'
    try {
      await onAssign(student.id, seat.seatNumber, shiftToPass, isReserved);
      onClose();
    } catch (e) {
      console.error('Failed to assign seat:', e);
    } finally {
      setAssigningId(null);
      setPendingStudent(null);
      setEnrollmentRequiredStudent(null);
    }
  };

  const handleStudentSelect = (student: StudentItem) => {
    const targetShift = (selectedShift || 'FULL_DAY').toUpperCase();
    const isTargetMorning = targetShift === 'MORNING' || targetShift === 'FOUR_HOURS' || targetShift === 'HALF_DAY';
    const isTargetEvening = targetShift === 'EVENING';

    // Rule: Student MUST have an active enrollment for the current period.
    // NOTE: This also passes if the student's seat was unassigned but their paid
    // enrollment window (validFrom–validTo) still covers today → NO re-enrollment needed.
    if (!isEnrolledForCurrentPeriod(student)) {
      setEnrollmentRequiredStudent(student);
      return;
    }

    let conflictReason = '';
    let hasConflict = false;

    if (fullDayOccupant && fullDayOccupant.studentId !== student.id) {
      hasConflict = true;
      conflictReason = `Seat ${seat.seatNumber} is currently occupied for Full Day (24/7) by ${fullDayOccupant.studentName}. Assigning ${student.fullName} will remove ${fullDayOccupant.studentName}'s full day allocation.`;
    } else if (targetShift === 'FULL_DAY' && occupants.length > 0 && !occupants.some(o => o.studentId === student.id)) {
      hasConflict = true;
      const names = occupants.map(o => o.studentName).join(', ');
      conflictReason = `Assigning Full Day (24/7) will remove current occupant(s): ${names}.`;
    } else if (isTargetMorning && morningOccupant && morningOccupant.studentId !== student.id) {
      hasConflict = true;
      conflictReason = `Morning shift is already occupied by ${morningOccupant.studentName}. Reassigning will replace them.`;
    } else if (isTargetEvening && eveningOccupant && eveningOccupant.studentId !== student.id) {
      hasConflict = true;
      conflictReason = `Evening shift is already occupied by ${eveningOccupant.studentName}. Reassigning will replace them.`;
    } else if (isSeatCurrentlyReserved && !occupants.some(o => o.studentId === student.id)) {
      hasConflict = true;
      conflictReason = `Seat ${seat.seatNumber} is currently marked as Reserved.`;
    }

    if (hasConflict) {
      setConflictMessage(conflictReason);
      setPendingStudent(student);
      return;
    }

    executeAssignment(student);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-lg sm:max-w-xl rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] flex flex-col max-h-[90vh] overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262626] px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
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
                    🔐 Locker
                  </span>
                )}
                {isSeatCurrentlyReserved && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                    <Bookmark className="w-2.5 h-2.5" /> Reserved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                {seat.rowName ? `${seat.rowName} • ` : ''}Select shift slot to assign student
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#1c1c1e] text-slate-400 dark:text-neutral-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 min-h-0">
          {/* Compact Occupancy Summary Bar */}
          <div className="p-2.5 bg-slate-50 dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-[#27272a] flex items-center justify-between text-xs gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Armchair className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Seat {seat.seatNumber} Status:</span>
            </span>
            <div className="flex items-center gap-2 font-semibold text-xs truncate">
              {fullDayOccupant ? (
                <span className="text-purple-700 dark:text-purple-300 font-bold truncate">
                  ☀️ Full Day: {fullDayOccupant.studentName}
                </span>
              ) : (
                <>
                  <span className={morningOccupant ? 'text-amber-700 dark:text-amber-400 font-bold truncate' : 'text-slate-500 dark:text-neutral-400'}>
                    🌅 Morning: {morningOccupant ? morningOccupant.studentName : 'Free'}
                  </span>
                  <span className="text-slate-300 dark:text-neutral-600">•</span>
                  <span className={eveningOccupant ? 'text-indigo-700 dark:text-indigo-400 font-bold truncate' : 'text-slate-500 dark:text-neutral-400'}>
                    🌇 Evening: {eveningOccupant ? eveningOccupant.studentName : 'Free'}
                  </span>
                </>
              )}
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
              fullDayOccupant
                ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : morningOccupant && eveningOccupant
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : morningOccupant || eveningOccupant
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            }`}>
              {fullDayOccupant
                ? '☀️ Full Day'
                : morningOccupant && eveningOccupant
                ? '👥 2/2 Full'
                : morningOccupant
                ? '🌅 1/2 Morning'
                : eveningOccupant
                ? '🌇 1/2 Evening'
                : '🟢 0/2 Available'}
            </span>
          </div>

        {/* ENROLLMENT & FEE COLLECTION REQUIRED SCREEN */}
        {enrollmentRequiredStudent ? (
          <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-start gap-3">
              <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Enrollment & Monthly Fee Required
                </h4>
                <p className="text-xs text-indigo-900 dark:text-indigo-300 leading-relaxed">
                  <strong>{enrollmentRequiredStudent.fullName}</strong> has no active enrollment or paid membership for the current month.
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1">
                  To assign <strong>Seat {seat.seatNumber}</strong>, please enroll the student and record the monthly fee for this period first.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] rounded-xl border border-slate-200 dark:border-[#262626] text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                <span>Student Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {enrollmentRequiredStudent.fullName} ({enrollmentRequiredStudent.phone})
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                <span>Selected Seat to Assign:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-400">
                  Seat {seat.seatNumber}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                <span>Requested Shift / Duration:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-400">
                  {SHIFT_OPTIONS.find((s) => s.id === selectedShift)?.label || selectedShift}
                  {selectedShift !== 'FULL_DAY' ? ` • ${selectedDuration === 'FOUR_HOURS' ? '4 Hours' : 'Half Day'}` : ''}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#262626]">
              <button
                type="button"
                onClick={() => setEnrollmentRequiredStudent(null)}
                className="flex-1 py-2.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-neutral-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-[#262626] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onEnrollAndCollectFee) {
                    onEnrollAndCollectFee(
                      enrollmentRequiredStudent,
                      seat.seatNumber,
                      selectedShift,
                      selectedShift === 'FULL_DAY' ? 'FULL_DAY' : selectedDuration
                    );
                  } else {
                    onEnrollNewStudent(seat.seatNumber);
                    onClose();
                  }
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>💳 Enroll & Record Fee for Seat {seat.seatNumber}</span>
              </button>
            </div>
          </div>
        ) : pendingStudent ? (
          <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-150">
            <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
              fullDayOccupant
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/50'
            }`}>
              <ShieldAlert className={`w-6 h-6 shrink-0 mt-0.5 ${
                fullDayOccupant ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <div className="space-y-1">
                <h4 className={`text-xs sm:text-sm font-bold ${
                  fullDayOccupant ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'
                }`}>
                  {fullDayOccupant
                    ? '⚠️ Full Day Occupant Conflict Warning'
                    : isSeatCurrentlyReserved
                    ? 'Seat Already Reserved'
                    : 'Shift Slot Already Occupied'}
                </h4>
                <p className={`text-xs leading-relaxed ${
                  fullDayOccupant ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'
                }`}>
                  {conflictMessage || `Seat ${seat.seatNumber} is currently assigned.`}
                </p>
                <p className={`text-[11px] mt-1 ${
                  fullDayOccupant ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-amber-700 dark:text-amber-400'
                }`}>
                  Please confirm if you want to proceed and override this allocation for{' '}
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
                <span>Target Shift:</span>
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
                className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  fullDayOccupant
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                    : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                }`}
              >
                {assigningId === pendingStudent.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reassigning...</span>
                  </>
                ) : (
                  <span>Confirm Reassign Seat</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 3 Shift Columns / Cards */}
            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Choose Shift Slot to Assign *</span>
                </label>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                  Click column to filter enrolled students
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Column 1: Morning */}
                <button
                  type="button"
                  onClick={() => setSelectedShift('MORNING')}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    selectedShift === 'MORNING'
                      ? 'border-amber-500 dark:border-amber-400 bg-amber-50/80 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-[#262626] bg-white dark:bg-[#18181b] hover:border-slate-300 dark:hover:border-[#333]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>🌅</span>
                        <span>Morning</span>
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        {morningEnrolledCount}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">6 AM – 2 PM</div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-[#262626] text-[10px] font-semibold">
                    {fullDayOccupant ? (
                      <span className="text-slate-400 dark:text-neutral-500 italic">🔒 Blocked</span>
                    ) : morningOccupant ? (
                      <span className="text-amber-700 dark:text-amber-400 font-bold truncate block">👤 {morningOccupant.studentName}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Slot Free</span>
                    )}
                  </div>
                </button>

                {/* Column 2: Evening */}
                <button
                  type="button"
                  onClick={() => setSelectedShift('EVENING')}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    selectedShift === 'EVENING'
                      ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-[#262626] bg-white dark:bg-[#18181b] hover:border-slate-300 dark:hover:border-[#333]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>🌇</span>
                        <span>Evening</span>
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        {eveningEnrolledCount}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">2 PM – 10 PM</div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-[#262626] text-[10px] font-semibold">
                    {fullDayOccupant ? (
                      <span className="text-slate-400 dark:text-neutral-500 italic">🔒 Blocked</span>
                    ) : eveningOccupant ? (
                      <span className="text-indigo-700 dark:text-indigo-400 font-bold truncate block">👤 {eveningOccupant.studentName}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Slot Free</span>
                    )}
                  </div>
                </button>

                {/* Column 3: Full Day */}
                <button
                  type="button"
                  onClick={() => setSelectedShift('FULL_DAY')}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    selectedShift === 'FULL_DAY'
                      ? 'border-purple-500 dark:border-purple-400 bg-purple-50/80 dark:bg-purple-950/40 shadow-xs ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-[#262626] bg-white dark:bg-[#18181b] hover:border-slate-300 dark:hover:border-[#333]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>☀️</span>
                        <span>Full Day</span>
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                        {fullDayEnrolledCount}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">24/7 Unlimited</div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-[#262626] text-[10px] font-semibold">
                    {fullDayOccupant ? (
                      <span className="text-purple-700 dark:text-purple-300 font-bold truncate block">👤 {fullDayOccupant.studentName}</span>
                    ) : morningOccupant || eveningOccupant ? (
                      <span className="text-slate-400 dark:text-neutral-500 italic">🔒 Shared</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Slot Free</span>
                    )}
                  </div>
                </button>
              </div>

              {/* Stay Duration Sub-selector for Morning / Evening */}
              {(selectedShift === 'MORNING' || selectedShift === 'EVENING') && (
                <div className="p-2.5 bg-slate-50 dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-[#27272a] space-y-1.5 animate-in fade-in duration-150">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300">
                    Stay Duration for {selectedShift === 'MORNING' ? '🌅 Morning' : '🌇 Evening'} Shift:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'FOUR_HOURS', label: '4 Hours Slot', sub: 'Suggested ₹600/mo' },
                      { id: 'HALF_DAY', label: 'Half Day Slot', sub: '6–8h (Suggested ₹900/mo)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedDuration(opt.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedDuration === opt.id
                            ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-[#222226] text-indigo-900 dark:text-indigo-200 font-bold shadow-2xs'
                            : 'border-slate-200 dark:border-[#262626] bg-slate-100/60 dark:bg-[#1c1c1e] text-slate-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-[#262626]'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-neutral-500">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shift Context & Occupancy Feedback Banner */}
              {fullDayOccupant ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">⚠️ Seat Assigned for Full Day (24/7)</span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300">
                      Currently assigned to <strong>{fullDayOccupant.studentName}</strong>. Selecting any shift will require overriding their full day reservation.
                    </span>
                  </div>
                </div>
              ) : morningOccupant && eveningOccupant ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">⚠️ Seat at Full Capacity (2/2 Occupied)</span>
                    <span className="text-[11px] text-rose-800 dark:text-rose-300">
                      🌅 Morning: <strong>{morningOccupant.studentName}</strong> • 🌇 Evening: <strong>{eveningOccupant.studentName}</strong>. Assigning will replace the student in the chosen shift.
                    </span>
                  </div>
                </div>
              ) : morningOccupant ? (
                selectedShift === 'EVENING' ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">✅ Evening Slot Open for 2nd Student!</span>
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Morning is taken by <strong>{morningOccupant.studentName}</strong>. You can safely allot Evening to a 2nd student without conflict.
                      </span>
                    </div>
                  </div>
                ) : selectedShift === 'MORNING' ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">⚠️ Morning Shift Currently Occupied</span>
                      <span className="text-[11px] text-amber-800 dark:text-amber-300">
                        Morning is assigned to <strong>{morningOccupant.studentName}</strong>. Assigning Morning will replace them. Switch to <strong>Evening</strong> to share this seat.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">⚠️ Full Day Overrides Morning Student</span>
                      <span className="text-[11px] text-amber-800 dark:text-amber-300">
                        Assigning Full Day will remove <strong>{morningOccupant.studentName}</strong> from this seat.
                      </span>
                    </div>
                  </div>
                )
              ) : eveningOccupant ? (
                selectedShift === 'MORNING' ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">✅ Morning Slot Open for 2nd Student!</span>
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Evening is taken by <strong>{eveningOccupant.studentName}</strong>. You can safely allot Morning to a 2nd student without conflict.
                      </span>
                    </div>
                  </div>
                ) : selectedShift === 'EVENING' ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">⚠️ Evening Shift Currently Occupied</span>
                      <span className="text-[11px] text-amber-800 dark:text-amber-300">
                        Evening is assigned to <strong>{eveningOccupant.studentName}</strong>. Assigning Evening will replace them. Switch to <strong>Morning</strong> to share this seat.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">⚠️ Full Day Overrides Evening Student</span>
                      <span className="text-[11px] text-amber-800 dark:text-amber-300">
                        Assigning Full Day will remove <strong>{eveningOccupant.studentName}</strong> from this seat.
                      </span>
                    </div>
                  </div>
                )
              ) : null}
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
              <span>Choose Enrolled Student</span>
              <div className="h-px bg-slate-200 dark:bg-[#262626] flex-1" />
            </div>

            {/* Search Bar & Period Shift Filter Pill */}
            <div className="shrink-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <span>
                    {filterMode === 'SHIFT_ONLY'
                      ? selectedShift === 'MORNING'
                        ? '🌅 Morning Enrolled Students'
                        : selectedShift === 'EVENING'
                        ? '🌇 Evening Enrolled Students'
                        : '☀️ Full Day Enrolled Students'
                      : '👥 All Enrolled Students'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-[#262626] font-bold text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-[#333]">
                    {filteredStudents.length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterMode((prev) => (prev === 'SHIFT_ONLY' ? 'ALL' : 'SHIFT_ONLY'))}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    filterMode === 'SHIFT_ONLY'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-[#1e1e24] border-slate-200 dark:border-[#333] text-slate-600 dark:text-neutral-400 hover:bg-slate-50'
                  }`}
                  title={filterMode === 'SHIFT_ONLY' ? 'Click to show students from all shifts' : 'Click to filter only selected shift students'}
                >
                  {filterMode === 'SHIFT_ONLY' ? '🔍 Showing Shift Only' : '👁️ Showing All Shifts'}
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${selectedShift.toLowerCase()} students by name, phone or seat number...`}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-2">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const hasThisSeat = student.seatNumber === seat.seatNumber;
                  const isBusy = assigningId === student.id;
                  const isStudentEnrolled = isEnrolledForCurrentPeriod(student);
                  const studentShift = getStudentEnrolledShift(student);

                  return (
                    <div
                      key={student.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-colors gap-2 ${
                        hasThisSeat
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1c1c1e] hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-[#262626] text-indigo-700 dark:text-neutral-200 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-100 dark:border-[#333]">
                          {student.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5 flex-wrap">
                            <span>{student.fullName}</span>
                            {hasThisSeat ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                ✓ This Seat ({seat.seatNumber})
                              </span>
                            ) : student.seatNumber ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                🪑 Seat: {student.seatNumber}
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                ⚠️ No Seat
                              </span>
                            )}
                            {!isStudentEnrolled && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Unenrolled
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>{student.phone}</span>
                            {studentShift !== 'NONE' && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-slate-700 dark:text-neutral-300">
                                  {studentShift === 'FULL_DAY'
                                    ? '☀️ Full Day'
                                    : studentShift === 'MORNING'
                                    ? `🌅 Morning${student.stayDuration === 'FOUR_HOURS' ? ' (4h)' : ' (Half Day)'}`
                                    : `🌇 Evening${student.stayDuration === 'FOUR_HOURS' ? ' (4h)' : ' (Half Day)'}`}
                                </span>
                              </>
                            )}
                            {isStudentEnrolled && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  {student.membershipEndsInDays > 0 ? `${student.membershipEndsInDays}d active` : 'Paid'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={hasThisSeat || assigningId !== null}
                        onClick={() => handleStudentSelect(student)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                          hasThisSeat
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 cursor-default'
                            : !isStudentEnrolled
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs ring-1 ring-indigo-400/50'
                            : student.seatNumber
                            ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs'
                            : isReserved
                            ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs'
                            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs'
                        }`}
                      >
                        {hasThisSeat ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                          </>
                        ) : assigningId === student.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </>
                        ) : !isStudentEnrolled ? (
                          <>
                            <CreditCard className="w-3.5 h-3.5" /> Enroll & Assign
                          </>
                        ) : student.seatNumber ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" /> Reassign from {student.seatNumber}
                          </>
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
                <div className="text-center py-6 px-4 text-slate-400 dark:text-neutral-500 text-xs bg-slate-50 dark:bg-[#1c1c1e] rounded-xl border border-dashed border-slate-200 dark:border-[#262626] space-y-2.5">
                  <p className="font-medium text-slate-600 dark:text-neutral-400">
                    {students.length === 0
                      ? 'No students enrolled in this branch yet.'
                      : search.trim()
                      ? `No students found matching "${search}" in ${selectedShift.toLowerCase().replace('_', ' ')} shift.`
                      : `No students found enrolled for ${selectedShift.toLowerCase().replace('_', ' ')} shift.`}
                  </p>
                  {filterMode === 'SHIFT_ONLY' && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('ALL')}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer text-xs inline-flex items-center gap-1.5"
                    >
                      Show students from all shifts ({allShiftMatchesCount})
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};
