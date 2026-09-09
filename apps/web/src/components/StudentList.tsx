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
}

export interface StudentItem {
  id: string;
  fullName: string;
  phone: string;
  studyPurpose?: string;
  shift: string;
  seatNumber?: string | null;
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
  const studentBaseMonthlyRate = Math.max(
    student.monthlyFee || 0,
    student.totalFee || 0,
    highestEverMonth,
    maxTxTotalFee,
    hasActiveSeat ? 1000 : 0
  );

  // Total fee for this month
  const totalFee = Math.max(
    maxTxTotalFee,
    paidAmount,
    studentBaseMonthlyRate
  );

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
  if (!shift) return 'Full Day';
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

  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedLockerFilter, setSelectedLockerFilter] = useState<'ALL' | 'LOCKER_ONLY'>('ALL');

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

  // Map all students to their payment status for the currently selected month & year
  const studentMonthMap = useMemo(() => {
    const map = new Map<string, StudentMonthPaymentInfo>();
    students.forEach((s) => {
      map.set(s.id, getStudentMonthPaymentInfo(s, selectedMonth, selectedYear));
    });
    return map;
  }, [students, selectedMonth, selectedYear]);

  // Aggregate statistics for the currently selected month
  const monthStats = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let due = 0;
    let paidCount = 0;
    let dueCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let enrolledInMonthCount = 0;

    students.forEach((s) => {
      const info = studentMonthMap.get(s.id);
      if (!info || !info.isEnrolledInMonth) return;

      enrolledInMonthCount++;
      billed += info.totalFee;
      collected += info.paidAmount;
      due += info.remainingDue;
      if (info.isPaid) paidCount++;
      if (info.remainingDue > 0) dueCount++;
      if (info.isPartialDue) partialCount++;
      if (info.isUnpaid) unpaidCount++;
    });

    return {
      billed,
      collected,
      due,
      paidCount,
      dueCount,
      partialCount,
      unpaidCount,
      enrolledInMonthCount,
    };
  }, [students, studentMonthMap]);

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

  // Available distinct years across students' transaction records (spanning 2024 to 2050)
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (let yr = 2024; yr <= 2050; yr++) {
      years.add(yr.toString());
    }
    students.forEach((s) => {
      (s.transactions || []).forEach((tx) => {
        if (tx.paymentDate) {
          const yr = new Date(tx.paymentDate).getFullYear().toString();
          if (yr && !isNaN(Number(yr))) years.add(yr);
        }
        if (tx.paidForMonth) {
          const match = tx.paidForMonth.match(/\b(20\d\d)\b/);
          if (match) years.add(match[1]);
        }
        if (tx.validTo) {
          const match = tx.validTo.match(/\b(20\d\d)\b/);
          if (match) years.add(match[1]);
        }
      });
    });
    return Array.from(years).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      (s.seatNumber && s.seatNumber.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    const isNoSeat = !s.seatNumber || s.status === 'INACTIVE';
    const monthInfo = studentMonthMap.get(s.id);

    if (selectedLockerFilter === 'LOCKER_ONLY' && !s.hasLocker) {
      return false;
    }

    if (selectedMonth !== 'ALL') {
      if (filterTab === 'ALL') {
        if (!monthInfo?.isEnrolledInMonth) return false;
      } else if (filterTab === 'MONTH_PAID') {
        if (!monthInfo?.isPaid) return false;
      } else if (filterTab === 'FEE_DUE') {
        if (!monthInfo || monthInfo.remainingDue <= 0) return false;
      } else if (filterTab === 'MONTH_PARTIAL_DUE') {
        if (!monthInfo?.isPartialDue) return false;
      } else if (filterTab === 'MONTH_UNPAID') {
        if (!monthInfo?.isUnpaid) return false;
      } else if (filterTab === 'INACTIVE') {
        if (!isNoSeat || !monthInfo?.isEnrolledInMonth) return false;
      } else if (filterTab === 'ACTIVE') {
        if (isNoSeat || !monthInfo?.isEnrolledInMonth) return false;
      }
      return true;
    }

    if (filterTab === 'INACTIVE') {
      if (!isNoSeat) return false;
    } else if (filterTab === 'ACTIVE') {
      if (isNoSeat) return false;
    } else if (filterTab === 'FEE_DUE') {
      if (!isStudentFeeDue(s)) return false;
    } else if (filterTab === 'EXPIRING_5_DAYS') {
      if (isNoSeat || s.membershipEndsInDays > 5 || s.membershipEndsInDays <= 0 || s.status === 'EXPIRED') {
        return false;
      }
    }

    if (filterTab !== 'ALL' && selectedYear !== 'ALL') {
      const matchYear = (s.transactions || []).some((tx) => {
        const dMatch = tx.paymentDate && new Date(tx.paymentDate).getFullYear().toString() === selectedYear;
        const pMatch = tx.paidForMonth && tx.paidForMonth.includes(selectedYear);
        const vMatch = (tx.validFrom && tx.validFrom.includes(selectedYear)) || (tx.validTo && tx.validTo.includes(selectedYear));
        return dMatch || pMatch || vMatch;
      });
      if (!matchYear) return false;
    }

    return true;
  });

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

      {/* Date & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 pb-0.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-neutral-200 font-semibold text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl px-2.5 py-1.5 shadow-2xs">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const newMonth = e.target.value;
                setSelectedMonth(newMonth);
                setFilterTab('ALL');
              }}
              className="bg-transparent text-slate-800 dark:text-neutral-200 font-semibold text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {MONTH_NAMES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setSelectedLockerFilter((prev) => (prev === 'ALL' ? 'LOCKER_ONLY' : 'ALL'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              selectedLockerFilter === 'LOCKER_ONLY'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-[#121212] text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#1c1c1e]'
            }`}
          >
            <span>🔐</span>
            <span>Locker Seats ({students.filter((s) => s.hasLocker).length})</span>
          </button>
        </div>

        <span className="text-[11px] font-medium text-slate-500 dark:text-[#a8a8a8]">
          Showing <strong>{filtered.length}</strong> of {students.length} students
        </span>
      </div>

      {/* Month Fee Overview & Declared Due Summary Card (Visible when a Month is chosen) */}
      {selectedMonth !== 'ALL' && (
        <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-indigo-50/80 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/50 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedMonth} {selectedYear !== 'ALL' ? selectedYear : ''} Fee Overview</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    {monthStats.enrolledInMonthCount} Enrolled Members
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#a8a8a8]">
                  Track fee collections, partial payments, and declared dues for {selectedMonth}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('ALL');
                setFilterTab('ALL');
              }}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
            >
              Reset to All Months
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white/90 dark:bg-[#121212]/90 border border-slate-200/80 dark:border-[#262626] rounded-xl p-2.5 sm:p-3">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-[#737373] block">
                Total Billed
              </span>
              <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white">
                ₹{monthStats.billed.toLocaleString()}
              </span>
            </div>

            <div className="bg-white/90 dark:bg-[#121212]/90 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl p-2.5 sm:p-3">
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">
                Collected
              </span>
              <span className="text-sm sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{monthStats.collected.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-[#737373] block mt-0.5">
                {monthStats.billed > 0 ? Math.round((monthStats.collected / monthStats.billed) * 100) : 0}% settled
              </span>
            </div>

            <div className="bg-white/90 dark:bg-[#121212]/90 border border-rose-200/80 dark:border-rose-800/50 rounded-xl p-2.5 sm:p-3">
              <span className="text-[10px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 block">
                Declared Due
              </span>
              <span className="text-sm sm:text-lg font-extrabold text-rose-600 dark:text-rose-400">
                ₹{monthStats.due.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 block mt-0.5">
                {monthStats.dueCount} student{monthStats.dueCount !== 1 ? 's' : ''} pending
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Due in 5 Days Alert Banner (when viewing all months) */}
      {selectedMonth === 'ALL' && expiring5DaysCount > 0 && (
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

      {/* Filter Chips / Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {selectedMonth !== 'ALL'
          ? [
              { id: 'ALL', label: `All in ${selectedMonth} (${monthStats.enrolledInMonthCount})` },
              {
                id: 'MONTH_PAID',
                label: `Paid (${monthStats.paidCount})`,
                success: monthStats.paidCount > 0,
              },
              {
                id: 'FEE_DUE',
                label: `Pending Due (${monthStats.dueCount})`,
                danger: monthStats.dueCount > 0,
              },
              {
                id: 'MONTH_PARTIAL_DUE',
                label: `Partial Due (${monthStats.partialCount})`,
                alert: monthStats.partialCount > 0,
              },
              {
                id: 'MONTH_UNPAID',
                label: `Unpaid (${monthStats.unpaidCount})`,
                danger: monthStats.unpaidCount > 0,
              },
              {
                id: 'INACTIVE',
                label: `Inactive (${inactiveCount})`,
                inactive: inactiveCount > 0,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs ${
                  filterTab === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                    : (tab as any).danger
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                    : (tab as any).alert
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                    : (tab as any).success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : (tab as any).inactive
                    ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-neutral-300 border border-slate-300/80 dark:border-[#333333] hover:bg-slate-200/70 dark:hover:bg-[#222222]'
                    : 'bg-white dark:bg-[#121212] text-slate-600 dark:text-[#a8a8a8] border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#1a1a1a] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))
          : [
              { id: 'ALL', label: `All Students (${students.length})` },
              { id: 'ACTIVE', label: `Active (${activeCount})` },
              {
                id: 'INACTIVE',
                label: `Inactive Students (${inactiveCount})`,
                inactive: inactiveCount > 0,
              },
              {
                id: 'FEE_DUE',
                label: `Fee Due (${feeDueCount})`,
                danger: feeDueCount > 0,
              },
              {
                id: 'EXPIRING_5_DAYS',
                label: `Due in 5 Days (${expiring5DaysCount})`,
                alert: expiring5DaysCount > 0,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
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

      {/* Student List */}
      <div className="space-y-2">
        {filtered.map((student) => {
          const isNoSeat = !student.seatNumber || student.status === 'INACTIVE';
          const monthInfo = studentMonthMap.get(student.id);

          // Accurate agreed monthly plan rate (prevents showing single partial clearance amounts)
          const studentTrueMonthlyRate = Math.max(
            student.monthlyFee || 0,
            student.totalFee || 0,
            ...((student.transactions || []).map((t) => Number(t.totalFee || 0))),
            !isNoSeat ? 1000 : 0
          );

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
                      {student.hasLocker && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                          🔐 Locker
                        </span>
                      )}
                      {selectedMonth !== 'ALL' ? (
                        isNoSeat ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#222222] text-slate-700 dark:text-neutral-300 border border-slate-300/80 dark:border-[#333333]">
                            INACTIVE (NO SEAT)
                          </span>
                        ) : monthInfo?.isPaid ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3" /> PAID
                          </span>
                        ) : monthInfo?.isPartialDue ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            PARTIAL DUE: ₹{monthInfo.remainingDue}
                          </span>
                        ) : monthInfo?.isUnpaid ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            DUE: ₹{monthInfo.remainingDue}
                          </span>
                        ) : null
                      ) : (
                        <>
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
                        </>
                      )}
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
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      Awaiting Seat
                    </span>
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
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center">
                    {formatShift(student.shift)}
                  </span>

                  {isNoSeat ? (
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] px-1.5 py-0.5 rounded text-[10px] inline-flex items-center">
                      Admission Recorded
                    </span>
                  ) : selectedMonth !== 'ALL' && monthInfo ? (
                    monthInfo.isPaid ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick?.(student, 'feeHistory');
                        }}
                        className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                        title="Fee fully paid for this month"
                      >
                        ₹{monthInfo.totalFee}/mo • Paid
                      </span>
                    ) : monthInfo.isPartialDue ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick?.(student, 'feeHistory');
                        }}
                        className="font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                        title={`Paid ₹${monthInfo.paidAmount} of ₹${monthInfo.totalFee}. Remaining ₹${monthInfo.remainingDue} due.`}
                      >
                        Paid: ₹{monthInfo.paidAmount} / ₹{monthInfo.totalFee} • Due: ₹{monthInfo.remainingDue}
                      </span>
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick?.(student, 'feeHistory');
                        }}
                        className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                        title={`Fee due for ${selectedMonth}: ₹${monthInfo.remainingDue}`}
                      >
                        ₹{monthInfo.totalFee}/mo • Due: ₹{monthInfo.remainingDue}
                      </span>
                    )
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
                    const isMonthView = selectedMonth !== 'ALL';
                    const hasMonthDue = isMonthView && Boolean(monthInfo && monthInfo.remainingDue > 0);
                    const hasOverallDue = !isMonthView && isStudentFeeDue;
                    const showDueHighlight = isMonthView ? hasMonthDue : hasOverallDue;

                    const dueAmount = isMonthView
                      ? (monthInfo?.remainingDue || student.remainingFee || studentTrueMonthlyRate)
                      : (student.remainingFee && student.remainingFee > 0 ? student.remainingFee : studentTrueMonthlyRate);

                    const monthPeriod = isMonthView
                      ? `${selectedMonth} ${selectedYear !== 'ALL' ? selectedYear : new Date().getFullYear()}`
                      : new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

                    const reminderText = showDueHighlight
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

                    const waHref = showDueHighlight
                      ? `https://wa.me/91${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(reminderText)}`
                      : `https://wa.me/91${student.phone.replace(/\D/g, '')}`;

                    return (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          showDueHighlight
                            ? `Send Fee Reminder on WhatsApp (Due: ₹${dueAmount}) to ${student.fullName}`
                            : `WhatsApp ${student.fullName}`
                        }
                        className={`h-7 px-2 rounded-lg border flex items-center gap-1 text-[11px] font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer relative ${
                          showDueHighlight
                            ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300'
                            : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp</span>
                        {showDueHighlight && (
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
            {selectedMonth !== 'ALL'
              ? filterTab === 'MONTH_PAID'
                ? `No students have paid fees for ${selectedMonth} yet.`
                : filterTab === 'FEE_DUE'
                ? `No students with pending dues for ${selectedMonth}! All settled.`
                : filterTab === 'MONTH_PARTIAL_DUE'
                ? `No students with partial payments for ${selectedMonth}.`
                : filterTab === 'MONTH_UNPAID'
                ? `No unpaid students found for ${selectedMonth}.`
                : `No students found for ${selectedMonth}.`
              : filterTab === 'INACTIVE'
              ? 'No inactive students. All enrolled students have been assigned seats!'
              : filterTab === 'ACTIVE'
              ? 'No active students with allocated seats found.'
              : filterTab === 'FEE_DUE'
              ? 'No students with fee dues or expired memberships.'
              : 'No students found matching your search.'}
          </div>
        ) : null}
      </div>
    </div>
  );
};
