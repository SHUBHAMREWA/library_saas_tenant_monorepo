'use client';

import React, { useState, useMemo } from 'react';
import { Phone, Search, Armchair, Shield, Check, Clock, Plus, Bell, Calendar, Filter, RefreshCw } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { generateWhatsAppFeeReminderText } from '@/lib/receipt-utils';
import { formatMonthPeriod } from '@/lib/billing-periods';

export interface StudentFeeRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  seatNumber?: string | null;
  amount: number;
  totalFee?: number;
  remainingFee?: number;
  validFrom?: string;
  validTo?: string;
  paidForMonth: string;
  paymentDate: string;
  paymentMode: string;
  status: string;
  receiptNumber?: string;
  notes?: string;
  shift?: string;
  stayDuration?: string;
}

export interface StudentItem {
  id: string;
  fullName: string;
  phone: string;
  studyPurpose?: string;
  shift?: string;
  stayDuration?: string;
  seatNumber?: string | null;
  previousSeatNumber?: string | null;
  inactiveDays?: number;
  hasLocker?: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'INACTIVE';
  membershipEndsInDays: number;
  photoUrl?: string | null;
  kycPhotoUrl?: string | null;
  kycDocId?: string;
  kycType?: string;
  monthlyFee?: number;
  totalFee?: number;
  remainingFee?: number;
  transactions?: StudentFeeRecord[];
}

export type StudentFilterTab =
  | 'ALL'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'FEE_DUE'
  | 'EXPIRING_5_DAYS'
  | 'MONTH_PAID'
  | 'MONTH_PARTIAL_DUE'
  | 'MONTH_UNPAID';

export interface StudentMonthPaymentInfo {
  monthName: string;
  yearStr: string;
  totalFee: number;
  paidAmount: number;
  remainingDue: number;
  isPaid: boolean;
  isPartialDue: boolean;
  isUnpaid: boolean;
  hasActiveSeat: boolean;
  isEnrolledInMonth: boolean;
  transactions: StudentFeeRecord[];
}

export function getStudentMonthPaymentInfo(
  student: StudentItem,
  selectedMonth: string,
  selectedYear: string
): StudentMonthPaymentInfo {
  const isNoSeat = !student.seatNumber || student.status === 'INACTIVE';
  const hasActiveSeat = !isNoSeat;

  // Check if selectedMonth and selectedYear match current real-world month & year
  const now = new Date();
  const currentMonthFull = now.toLocaleString('en-US', { month: 'long' });
  const currentYearStr = now.getFullYear().toString();
  const isCurrentMonthSelected =
    (selectedMonth === 'ALL' || selectedMonth.toLowerCase() === currentMonthFull.toLowerCase()) &&
    (selectedYear === 'ALL' || selectedYear === currentYearStr);

  // Filter transactions for the chosen month and year
  const monthTxs = (student.transactions || []).filter((tx) => {
    if (selectedMonth === 'ALL') {
      if (selectedYear === 'ALL') return true;
      const dMatch = tx.paymentDate && new Date(tx.paymentDate).getFullYear().toString() === selectedYear;
      const pMatch = tx.paidForMonth && tx.paidForMonth.includes(selectedYear);
      const vMatch =
        (tx.validFrom && tx.validFrom.includes(selectedYear)) ||
        (tx.validTo && tx.validTo.includes(selectedYear));
      return dMatch || pMatch || vMatch;
    }

    if (tx.validFrom) {
      const vFrom = new Date(tx.validFrom);
      if (!isNaN(vFrom.getTime())) {
        const vMonthName = vFrom.toLocaleString('en-US', { month: 'long' });
        const vYearStr = vFrom.getFullYear().toString();
        const monthMatch = vMonthName.toLowerCase() === selectedMonth.toLowerCase();
        const yearMatch = selectedYear === 'ALL' || vYearStr === selectedYear;
        if (monthMatch && yearMatch) return true;
      }
    }

    const pMatch =
      tx.paidForMonth &&
      tx.paidForMonth.toLowerCase().includes(selectedMonth.toLowerCase()) &&
      (selectedYear === 'ALL' || tx.paidForMonth.includes(selectedYear));
    const dMatch =
      tx.paymentDate &&
      new Date(tx.paymentDate).toLocaleString('en-US', { month: 'long' }).toLowerCase() ===
        selectedMonth.toLowerCase() &&
      (selectedYear === 'ALL' || new Date(tx.paymentDate).getFullYear().toString() === selectedYear);
    return pMatch || dMatch;
  });

  // Sort transactions by date descending so the most recent is first
  monthTxs.sort((a, b) => {
    const da = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
    const db = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
    return db - da;
  });

  const paidAmount = monthTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Determine if the student was actually enrolled/active in this specific selected month
  const isEnrolledInMonth =
    selectedMonth === 'ALL' ||
    monthTxs.length > 0 ||
    (isCurrentMonthSelected && hasActiveSeat);

  if (!isEnrolledInMonth) {
    return {
      monthName: selectedMonth,
      yearStr: selectedYear,
      totalFee: 0,
      paidAmount: 0,
      remainingDue: 0,
      isPaid: false,
      isPartialDue: false,
      isUnpaid: false,
      hasActiveSeat,
      isEnrolledInMonth: false,
      transactions: [],
    };
  }

  // Find max totalFee across these transactions
  let maxTxTotalFee = 0;
  monthTxs.forEach((tx) => {
    if (tx.totalFee && Number(tx.totalFee) > maxTxTotalFee) {
      maxTxTotalFee = Number(tx.totalFee);
    }
  });

  // Calculate highest historical month sum across all transactions of student
  const allMonthsSum = new Map<string, number>();
  (student.transactions || []).forEach((tx) => {
    const k = tx.paidForMonth?.trim().toLowerCase() || '';
    allMonthsSum.set(k, (allMonthsSum.get(k) || 0) + Number(tx.amount || 0));
    if (tx.totalFee && Number(tx.totalFee) > maxTxTotalFee) {
      maxTxTotalFee = Math.max(maxTxTotalFee, Number(tx.totalFee));
    }
  });
  let highestEverMonth = 0;
  allMonthsSum.forEach((v) => {
    if (v > highestEverMonth) highestEverMonth = v;
  });

  // Base monthly agreed plan rate
  const latestTx = (student.transactions || [])[0];
  const studentBaseMonthlyRate =
    (latestTx?.totalFee && Number(latestTx.totalFee) > 0)
      ? Number(latestTx.totalFee)
      : (latestTx?.amount && Number(latestTx.amount) > 0)
      ? Number(latestTx.amount)
      : (student.monthlyFee && Number(student.monthlyFee) > 0)
      ? Number(student.monthlyFee)
      : (student.totalFee && Number(student.totalFee) > 0)
      ? Number(student.totalFee)
      : 0; // No default — student must be enrolled first

  // Total fee for this month
  const totalFee = maxTxTotalFee > 0
    ? maxTxTotalFee
    : (paidAmount > 0 ? paidAmount : studentBaseMonthlyRate);

  // Remaining due calculation:
  let remainingDue = 0;
  if (monthTxs.length > 0) {
    const latestTx = monthTxs[0];
    if (latestTx.remainingFee !== undefined && Number(latestTx.remainingFee) >= 0) {
      remainingDue = Number(latestTx.remainingFee);
    } else {
      remainingDue = Math.max(0, totalFee - paidAmount);
    }
  } else if (hasActiveSeat) {
    // Current active month without payment recorded yet
    remainingDue = totalFee;
  } else {
    remainingDue = 0;
  }

  const isPaid = (paidAmount >= totalFee || (paidAmount > 0 && remainingDue === 0)) && remainingDue === 0 && paidAmount > 0;
  const isPartialDue = paidAmount > 0 && remainingDue > 0;
  const isUnpaid = paidAmount === 0 && remainingDue > 0;

  return {
    monthName: selectedMonth,
    yearStr: selectedYear,
    totalFee,
    paidAmount,
    remainingDue,
    isPaid,
    isPartialDue,
    isUnpaid,
    hasActiveSeat,
    isEnrolledInMonth: true,
    transactions: monthTxs,
  };
}

interface StudentListProps {
  students: StudentItem[];
  onAddStudent: () => void;
  onStudentClick?: (student: StudentItem, initialTab?: 'profile' | 'feeHistory' | 'kyc') => void;
  onAssignSeat?: (student: StudentItem) => void;
  onCollectFee?: (student: StudentItem) => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  initialFilterTab?: StudentFilterTab;
  libraryName?: string;
  libraryPhone?: string;
}

export const formatShift = (shift?: string): string => {
  if (!shift) return '';
  switch (shift.toUpperCase()) {
    case 'FOUR_HOURS':
      return '4 Hours';
    case 'HALF_DAY':
      return 'Half Day';
    case 'FULL_DAY':
      return 'Full Day';
    case 'MORNING':
      return 'Morning';
    case 'EVENING':
      return 'Evening';
    case 'NIGHT':
      return 'Night';
    default:
      return shift;
  }
};

export const formatShiftAndDuration = (shift?: string, stayDuration?: string): string => {
  if (!shift) return '';
  const normShift = shift.toUpperCase();
  const normDuration = stayDuration ? stayDuration.toUpperCase() : undefined;

  let shiftLabel = '';
  if (normShift === 'MORNING') shiftLabel = 'Morning';
  else if (normShift === 'EVENING') shiftLabel = 'Evening';
  else if (normShift === 'NIGHT') shiftLabel = 'Night';
  else if (normShift === 'FOUR_HOURS') return '4 Hours / Day';
  else if (normShift === 'HALF_DAY') return 'Half Day (6–8h)';
  else if (normShift === 'FULL_DAY') return 'Full Day';
  else shiftLabel = shift;

  let durationLabel = '';
  if (normDuration === 'FOUR_HOURS') {
    durationLabel = '4 Hours';
  } else if (normDuration === 'HALF_DAY') {
    durationLabel = 'Half Day (6–8h)';
  } else if (normDuration === 'FULL_DAY') {
    durationLabel = 'Full Day';
  }

  if (shiftLabel && durationLabel && durationLabel !== 'Full Day') {
    return `${shiftLabel} • ${durationLabel}`;
  }
  return shiftLabel;
};

export const getLatestEnrolledShiftAndDuration = (
  student: StudentItem
): { shift?: string; stayDuration?: string; label: string } => {
  const latestTx = student.transactions?.[0];
  const hasTx = Boolean(latestTx);
  const hasSeat = Boolean(student.seatNumber);

  // If student has no transactions and no seat assigned, they have no active enrollment shift
  if (!hasTx && !hasSeat && !student.shift) {
    return { shift: undefined, stayDuration: undefined, label: '' };
  }

  // 1. Shift & duration from latest enrollment transaction
  let shift = latestTx?.shift;
  let stayDuration = latestTx?.stayDuration;

  // 2. Fallback to transaction notes if shift or duration not explicitly on tx
  if (latestTx?.notes) {
    const notesUpper = latestTx.notes.toUpperCase();
    if (!shift) {
      if (notesUpper.includes('MORNING')) shift = 'MORNING';
      else if (notesUpper.includes('EVENING')) shift = 'EVENING';
      else if (notesUpper.includes('FULL_DAY') || notesUpper.includes('FULL DAY')) shift = 'FULL_DAY';
    }
    if (!stayDuration) {
      if (notesUpper.includes('FOUR_HOURS') || notesUpper.includes('4 HOUR') || notesUpper.includes('4-HOUR')) {
        stayDuration = 'FOUR_HOURS';
      } else if (notesUpper.includes('HALF_DAY') || notesUpper.includes('HALF DAY') || notesUpper.includes('6-8')) {
        stayDuration = 'HALF_DAY';
      } else if (notesUpper.includes('FULL_DAY') || notesUpper.includes('FULL DAY')) {
        stayDuration = 'FULL_DAY';
      }
    }
  }

  // 3. Fallback to student properties or seat
  if (!shift && student.shift) {
    shift = student.shift;
  }
  if (!stayDuration && student.stayDuration) {
    stayDuration = student.stayDuration;
  }

  // If still no shift but student has a seat, fallback to FULL_DAY
  if (!shift && hasSeat) {
    shift = 'FULL_DAY';
  }

  if (!shift) {
    return { shift: undefined, stayDuration: undefined, label: '' };
  }

  const label = formatShiftAndDuration(shift, stayDuration);
  return { shift, stayDuration, label };
};

export const getEffectiveStayDuration = (student: StudentItem): string => {
  if (student.stayDuration) return student.stayDuration;
  const latestTx = student.transactions?.[0];
  if (latestTx?.stayDuration) return latestTx.stayDuration;
  const notes = (latestTx?.notes || '').toUpperCase();
  if (notes.includes('FOUR_HOURS') || notes.includes('4 HOUR') || notes.includes('4-HOUR')) return 'FOUR_HOURS';
  if (notes.includes('HALF_DAY') || notes.includes('HALF DAY') || notes.includes('6-8')) return 'HALF_DAY';
  if (student.shift?.toUpperCase() === 'FULL_DAY') return 'FULL_DAY';
  const fee = student.monthlyFee || student.totalFee || (latestTx?.amount ? Number(latestTx.amount) : 0);
  if (fee > 0 && fee <= 700) return 'FOUR_HOURS';
  if (fee > 700 && fee <= 950) return 'HALF_DAY';
  return 'FOUR_HOURS';
};

export const getStudentPreviousSeat = (student: StudentItem): { seatNumber: string | null; inactiveDays: number } => {
  if (student.seatNumber) return { seatNumber: null, inactiveDays: 0 };
  if (student.previousSeatNumber !== undefined && student.previousSeatNumber !== null) {
    return {
      seatNumber: student.previousSeatNumber,
      inactiveDays: student.inactiveDays || 0,
    };
  }

  // Check transactions for most recent seat
  if (!student.transactions || student.transactions.length === 0) {
    return { seatNumber: null, inactiveDays: 0 };
  }

  const txWithSeat = student.transactions.find((t) => t.seatNumber);
  if (!txWithSeat || !txWithSeat.seatNumber) {
    return { seatNumber: null, inactiveDays: 0 };
  }

  const lastDate = txWithSeat.validTo ? new Date(txWithSeat.validTo) : new Date(txWithSeat.paymentDate);
  const now = new Date();
  const diffTime = now.getTime() - lastDate.getTime();
  const inactiveDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (inactiveDays <= 30) {
    return { seatNumber: txWithSeat.seatNumber, inactiveDays };
  }

  return { seatNumber: null, inactiveDays };
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onAddStudent,
  onStudentClick,
  onAssignSeat,
  onCollectFee,
  onRefresh,
  isRefreshing = false,
  initialFilterTab = 'ALL',
  libraryName,
  libraryPhone,
}) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<StudentFilterTab>(initialFilterTab);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (onRefresh) {
      setLocalRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setLocalRefreshing(false), 500);
      }
    }
  };

  React.useEffect(() => {
    if (initialFilterTab) {
      setFilterTab(initialFilterTab);
    }
  }, [initialFilterTab]);

  // Determines if a student has any fee due overall
  // (Both active seat holders with expired/due fees, AND inactive students with unpaid remaining dues)
  const isStudentFeeDue = (s: StudentItem) => {
    const hasUnpaidBalance = Boolean(s.remainingFee && s.remainingFee > 0);
    if (hasUnpaidBalance) return true;
    const hasActiveSeat = Boolean(s.seatNumber) && s.status !== 'INACTIVE';
    if (hasActiveSeat && (s.membershipEndsInDays <= 0 || s.status === 'EXPIRED' || !s.monthlyFee || s.monthlyFee === 0)) {
      return true;
    }
    return false;
  };

  // Inactive students: admitted but no seat allocated yet (or seat released)
  const inactiveCount = students.filter(
    (s) => !s.seatNumber || s.status === 'INACTIVE'
  ).length;

  // Active students: students with a seat allocated (membership active)
  const activeCount = students.filter(
    (s) => Boolean(s.seatNumber) && s.status !== 'INACTIVE'
  ).length;

  // Fee due: ALL students with fees due (both active seat holders AND inactive students with dues)
  const feeDueCount = students.filter(isStudentFeeDue).length;

  // Expiring in next 5 days: students with an allocated seat expiring soon
  const expiring5DaysCount = students.filter(
    (s) =>
      Boolean(s.seatNumber) &&
      s.membershipEndsInDays <= 5 &&
      s.membershipEndsInDays > 0 &&
      s.status !== 'EXPIRED'
  ).length;

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.includes(search) ||
        (s.seatNumber && s.seatNumber.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;

      const isNoSeat = !s.seatNumber || s.status === 'INACTIVE';

      if (filterTab === 'INACTIVE') {
        return isNoSeat;
      }
      if (filterTab === 'ACTIVE') {
        return !isNoSeat;
      }
      if (filterTab === 'FEE_DUE') {
        return isStudentFeeDue(s);
      }
      if (filterTab === 'EXPIRING_5_DAYS') {
        return (
          !isNoSeat &&
          s.membershipEndsInDays <= 5 &&
          s.membershipEndsInDays > 0 &&
          s.status !== 'EXPIRED'
        );
      }

      return true;
    });
  }, [students, search, filterTab]);

  return (
    <div className="space-y-3 w-full max-w-full overflow-x-hidden">
      {/* Search, Refresh & Add Action */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#737373] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        {/* Refresh Student Data Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing || localRefreshing}
            className="bg-white dark:bg-[#1c1c1e] hover:bg-slate-50 dark:hover:bg-[#262626] active:bg-slate-100 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-[#262626] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition-colors disabled:opacity-60"
            title="Refresh latest student records from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${(isRefreshing || localRefreshing) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{(isRefreshing || localRefreshing) ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAddStudent}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Due in 5 Days Alert Banner */}
      {expiring5DaysCount > 0 && (
        <div
          onClick={() => setFilterTab(filterTab === 'EXPIRING_5_DAYS' ? 'ALL' : 'EXPIRING_5_DAYS')}
          className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-950/50 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {expiring5DaysCount} Student{expiring5DaysCount > 1 ? 's' : ''} Membership Ending in &le; 5 Days
              </h5>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Month ending soon. Collect fee to renew validity and prevent seat auto-release.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 group-hover:bg-amber-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors">
            {filterTab === 'EXPIRING_5_DAYS' ? 'Showing Due' : 'View Due →'}
          </span>
        </div>
      )}

      {/* Filter Chips / Tabs & Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 pb-0.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'ALL' as const, label: `All Students (${students.length})` },
            { id: 'ACTIVE' as const, label: `Active (${activeCount})` },
            {
              id: 'INACTIVE' as const,
              label: `Inactive Students (${inactiveCount})`,
              inactive: inactiveCount > 0,
            },
            {
              id: 'FEE_DUE' as const,
              label: `Fee Due (${feeDueCount})`,
              danger: feeDueCount > 0,
            },
            {
              id: 'EXPIRING_5_DAYS' as const,
              label: `Due in 5 Days (${expiring5DaysCount})`,
              alert: expiring5DaysCount > 0,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs ${
                filterTab === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                  : (tab as any).danger
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                  : (tab as any).alert
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : (tab as any).inactive
                  ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-neutral-300 border border-slate-300/80 dark:border-[#333333] hover:bg-slate-200/70 dark:hover:bg-[#222222]'
                  : 'bg-white dark:bg-[#121212] text-slate-600 dark:text-[#a8a8a8] border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#1a1a1a] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-medium text-slate-500 dark:text-[#a8a8a8] shrink-0 ml-auto">
          Showing <strong>{filtered.length}</strong> of {students.length} students
        </span>
      </div>

      {/* Student List */}
      <div className="space-y-2">
        {filtered.map((student) => {
          const isNoSeat = !student.seatNumber || student.status === 'INACTIVE';

          // Accurate agreed monthly plan rate (respects student's custom monthly enrollment rate e.g. ₹500, ₹600)
          const latestTx = (student.transactions || [])[0];
          const studentTrueMonthlyRate =
            (latestTx?.totalFee && Number(latestTx.totalFee) > 0)
              ? Number(latestTx.totalFee)
              : (latestTx?.amount && Number(latestTx.amount) > 0)
              ? Number(latestTx.amount)
              : (student.monthlyFee && Number(student.monthlyFee) > 0)
              ? Number(student.monthlyFee)
              : (student.totalFee && Number(student.totalFee) > 0)
              ? Number(student.totalFee)
              : 0; // No default — student must be enrolled first

          const isStudentFeeDue =
            Boolean(student.remainingFee && student.remainingFee > 0) ||
            (!isNoSeat &&
              (student.membershipEndsInDays <= 0 ||
                student.status === 'EXPIRED' ||
                !student.monthlyFee));

          return (
            <div
              key={student.id}
              onClick={() => onStudentClick?.(student)}
              className="bg-white dark:bg-[#121212] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50/50 dark:hover:bg-[#181818] transition-all cursor-pointer space-y-2.5"
            >
              {/* Top Row: Identity & Status on Left, Seat & Validity on Right */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  {student.photoUrl ? (
                    <img
                      src={student.photoUrl}
                      alt={student.fullName}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-[#262626]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1e1e1e] text-slate-700 dark:text-[#f5f5f5] font-bold flex items-center justify-center text-sm shrink-0">
                      {student.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                        {student.fullName}
                      </h4>
                      {isNoSeat && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#222222] text-slate-700 dark:text-neutral-300 border border-slate-300/80 dark:border-[#333333]">
                          INACTIVE
                        </span>
                      )}
                      {student.remainingFee && student.remainingFee > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          DUE: ₹{student.remainingFee}
                        </span>
                      ) : !isNoSeat && (student.membershipEndsInDays <= 0 || student.status === 'EXPIRED') ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          FEE DUE
                        </span>
                      ) : !isNoSeat && student.membershipEndsInDays <= 5 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          DUE IN {student.membershipEndsInDays}D
                        </span>
                      ) : !isNoSeat ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ACTIVE
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#a8a8a8] mt-0.5">
                      <span>{student.phone}</span>
                      {student.studyPurpose && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[130px]">{student.studyPurpose}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Right: Seat Pill & Validity */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {student.seatNumber ? (
                    <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-100 dark:border-indigo-900/60">
                      <Armchair className="w-3 h-3" /> {student.seatNumber}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCollectFee) {
                          onCollectFee(student);
                        } else if (onAssignSeat) {
                          onAssignSeat(student);
                        } else {
                          onStudentClick?.(student, 'profile');
                        }
                      }}
                      className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                      title="Record Fee Payment & Re-Enroll Student"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Re-Enroll</span>
                    </button>
                  )}
                  {isNoSeat ? (
                    (() => {
                      const prevSeat = getStudentPreviousSeat(student);
                      return prevSeat.seatNumber ? (
                        <span
                          className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.5 rounded-md flex items-center gap-1"
                          title={`Previous Seat: ${prevSeat.seatNumber} (${prevSeat.inactiveDays} days ago)`}
                        >
                          <Armchair className="w-2.5 h-2.5 text-indigo-500" />
                          <span>Last: {prevSeat.seatNumber}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Awaiting Seat
                        </span>
                      );
                    })()
                  ) : (
                    <div className={`text-[11px] flex items-center gap-1 font-medium ${
                      student.membershipEndsInDays <= 0
                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                        : student.membershipEndsInDays <= 5
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-slate-400 dark:text-[#737373]'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{student.membershipEndsInDays <= 0 ? 'Expired' : `${student.membershipEndsInDays}d left`}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Shift & Fee Status on Left, Actions on Right */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#222222] flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {(() => {
                    const shiftInfo = getLatestEnrolledShiftAndDuration(student);
                    if (!shiftInfo.label) return null;
                    return (
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center">
                        {shiftInfo.label}
                      </span>
                    );
                  })()}

                  {isNoSeat ? (
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] px-1.5 py-0.5 rounded text-[10px] inline-flex items-center">
                      Admission Recorded
                    </span>
                  ) : student.remainingFee && student.remainingFee > 0 ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudentClick?.(student, 'feeHistory');
                      }}
                      className="font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                      title="Remaining fee due - click to collect fee"
                    >
                      ₹{studentTrueMonthlyRate}/mo • Due: ₹{student.remainingFee}
                    </span>
                  ) : studentTrueMonthlyRate > 0 ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudentClick?.(student, 'feeHistory');
                      }}
                      className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                      title="Click to view fee history"
                    >
                      ₹{studentTrueMonthlyRate}/mo
                    </span>
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudentClick?.(student, 'feeHistory');
                      }}
                      className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                      title="Fee due - click to view history & collect fee"
                    >
                      Fee Due
                    </span>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={`tel:${student.phone}`}
                    title="Call student"
                    className="h-7 px-2 rounded-lg border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-600 dark:text-[#a8a8a8] hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-[11px] font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Phone className="w-3 h-3" />
                    <span className="hidden xs:inline">Call</span>
                  </a>

                  {(() => {
                    const hasOverallDue = isStudentFeeDue;
                    const dueAmount = student.remainingFee && student.remainingFee > 0 ? student.remainingFee : studentTrueMonthlyRate;
                    const monthPeriod = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

                    const reminderText = hasOverallDue
                      ? generateWhatsAppFeeReminderText({
                          libraryName: libraryName || 'seeLibrary Study Center',
                          libraryPhone,
                          studentName: student.fullName,
                          studentPhone: student.phone,
                          seatNumber: student.seatNumber,
                          shift: formatShift(student.shift),
                          dueAmount,
                          paidForMonth: monthPeriod,
                        })
                      : '';

                    const waHref = hasOverallDue
                      ? `https://wa.me/91${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(reminderText)}`
                      : `https://wa.me/91${student.phone.replace(/\D/g, '')}`;

                    return (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          hasOverallDue
                            ? `Send Fee Reminder on WhatsApp (Due: ₹${dueAmount}) to ${student.fullName}`
                            : `WhatsApp ${student.fullName}`
                        }
                        className={`h-7 px-2 rounded-lg border flex items-center gap-1 text-[11px] font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer relative ${
                          hasOverallDue
                            ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300'
                            : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp</span>
                        {hasOverallDue && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5 ring-2 ring-white dark:ring-[#121212]" />
                        )}
                      </a>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}

        {students.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/70 dark:bg-[#121212] rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#262626] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Students Enrolled Yet</h4>
            <p className="text-xs text-slate-500 dark:text-[#a8a8a8] mt-1 max-w-xs mb-4">
              Register students into this study branch, assign shifts, record membership fees, and allocate seats.
            </p>
            <button
              type="button"
              onClick={onAddStudent}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll First Student</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] text-slate-500 dark:text-[#a8a8a8] text-sm">
            {filterTab === 'INACTIVE'
              ? 'No inactive students. All enrolled students have been assigned seats!'
              : filterTab === 'ACTIVE'
              ? 'No active students with allocated seats found.'
              : filterTab === 'FEE_DUE'
              ? 'No students with fee dues or expired memberships.'
              : filterTab === 'EXPIRING_5_DAYS'
              ? 'No students with memberships expiring in the next 5 days.'
              : 'No students found matching your search.'}
          </div>
        ) : null}
      </div>
    </div>
  );
};
