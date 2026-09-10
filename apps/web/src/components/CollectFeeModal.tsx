'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, IndianRupee, Calendar, CreditCard, User, Armchair, ShieldCheck, Clock, AlertCircle, Printer, FileCheck, Copy, Search, ChevronDown, Check } from 'lucide-react';
import { StudentItem, getStudentPreviousSeat } from './StudentList';
import { WhatsAppIcon } from './WhatsAppIcon';
import { generateWhatsAppReceiptText, openWhatsApp, FeeReceiptData, formatShiftSummary } from '@/lib/receipt-utils';
import { formatMonthPeriod, getDetailedPeriodLabel } from '@/lib/billing-periods';

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentItem[];
  preselectedStudent?: StudentItem | null;
  preselectedSeatNumber?: string | null;
  availableSeats?: { id: string; seatNumber: string; rowName?: string }[];
  onAssignSeat?: (studentId: string, seatNumber: string | null) => Promise<void> | void;
  libraryName?: string;
  libraryPhone?: string;
  onRecordPayment: (paymentData: {
    studentId: string;
    amount: number;
    totalFee?: number;
    remainingFee?: number;
    validFrom?: string;
    validTo?: string;
    paidForMonth: string;
    paymentMode: string;
    paymentDate: string;
    notes?: string;
    extendDays: number;
    shift?: string;
    stayDuration?: string;
    isSettlingDue?: boolean;
    assignedSeatNumber?: string;
  }) => Promise<any> | any;
}

const getMonthOptions = () => {
  const options: string[] = [];
  const now = new Date();
  // Include previous month, current month, and next 3 months
  for (let i = -1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  }
  return options;
};

const getSuggestedFee = (shift: string, stayDuration: string, customMonthlyFee?: number) => {
  if (customMonthlyFee && customMonthlyFee > 0) return customMonthlyFee;
  if (shift === 'FULL_DAY') return 1200;
  if (stayDuration === 'FOUR_HOURS') return 600;
  if (stayDuration === 'HALF_DAY') return 900;
  return 1200;
};

export const getStudentAgreedRate = (std?: StudentItem | null): number => {
  if (!std) return 1200;
  const txs = std.transactions || [];
  for (const tx of txs) {
    if (tx.totalFee && Number(tx.totalFee) > 0) return Number(tx.totalFee);
    if (tx.amount && Number(tx.amount) > 0) return Number(tx.amount);
  }
  if (std.monthlyFee && Number(std.monthlyFee) > 0) return Number(std.monthlyFee);
  if (std.totalFee && Number(std.totalFee) > 0) return Number(std.totalFee);
  return 1200;
};

export const CollectFeeModal: React.FC<CollectFeeModalProps> = ({
  isOpen,
  onClose,
  students,
  preselectedStudent,
  preselectedSeatNumber,
  availableSeats = [],
  onAssignSeat,
  libraryName = 'seeLibrary Study Center',
  libraryPhone,
  onRecordPayment,
}) => {
  const monthOptions = getMonthOptions();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState<boolean>(false);
  const [assignedSeatNumber, setAssignedSeatNumber] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'REMAINING_DUE' | 'NEW_MONTH'>('NEW_MONTH');
  const [totalFee, setTotalFee] = useState<number | ''>(1200);
  const [amount, setAmount] = useState<number | ''>(1200); // Get Fee / Collected
  const [validFrom, setValidFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [paidForMonth, setPaidForMonth] = useState<string>(currentMonth);
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'EVENING' | 'FULL_DAY'>('FULL_DAY');
  const [stayDuration, setStayDuration] = useState<'FOUR_HOURS' | 'HALF_DAY' | 'FULL_DAY'>('FULL_DAY');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recordedReceipt, setRecordedReceipt] = useState<FeeReceiptData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const resolveStudentShiftAndDuration = (std?: StudentItem | null) => {
    if (!std) return { shift: 'FULL_DAY' as const, duration: 'FULL_DAY' as const };
    const latestTx = std.transactions?.[0];
    const rawShift = (latestTx?.shift || std.shift || 'FULL_DAY').toUpperCase();
    const rawDuration = (latestTx?.stayDuration || std.stayDuration || 'FULL_DAY').toUpperCase();
    if (rawShift === 'MORNING') {
      return {
        shift: 'MORNING' as const,
        duration: rawDuration === 'FOUR_HOURS' ? ('FOUR_HOURS' as const) : ('HALF_DAY' as const),
      };
    }
    if (rawShift === 'EVENING') {
      return {
        shift: 'EVENING' as const,
        duration: rawDuration === 'FOUR_HOURS' ? ('FOUR_HOURS' as const) : ('HALF_DAY' as const),
      };
    }
    if (rawShift === 'FOUR_HOURS') {
      return { shift: 'MORNING' as const, duration: 'FOUR_HOURS' as const };
    }
    if (rawShift === 'HALF_DAY') {
      return { shift: 'MORNING' as const, duration: 'HALF_DAY' as const };
    }
    return { shift: 'FULL_DAY' as const, duration: 'FULL_DAY' as const };
  };

  useEffect(() => {
    if (isOpen) {
      setRecordedReceipt(null);
      setCopied(false);
      setStudentSearchQuery('');
      setIsStudentDropdownOpen(false);
      const activeStudent = preselectedStudent || (students.length > 0 ? students[0] : null);
      const todayStr = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setValidFrom(todayStr);
      setValidTo(nextMonth.toISOString().split('T')[0]);
      setPaymentMode('UPI');
      setPaymentDate(todayStr);

      if (activeStudent) {
        setSelectedStudentId(activeStudent.id);
        const prevSeat = getStudentPreviousSeat(activeStudent);
        const seatToSet = preselectedSeatNumber || activeStudent.seatNumber || (prevSeat.seatNumber && availableSeats.some((s) => s.seatNumber === prevSeat.seatNumber) ? prevSeat.seatNumber : '');
        setAssignedSeatNumber(seatToSet);

        const { shift: initShift, duration: initDuration } = resolveStudentShiftAndDuration(activeStudent);
        setSelectedShift(initShift);
        setStayDuration(initDuration);

        const hasDue = Boolean(activeStudent.remainingFee && activeStudent.remainingFee > 0);
        if (hasDue) {
          setPaymentType('REMAINING_DUE');
          const due = activeStudent.remainingFee!;
          setTotalFee(due);
          setAmount(due);
          const dueTx = (activeStudent.transactions || []).find((t) => t.remainingFee && t.remainingFee > 0);
          const targetMonth = dueTx?.paidForMonth || currentMonth;
          setPaidForMonth(targetMonth);
          setNotes(`Remaining fee clearance for ${targetMonth}`);
        } else {
          setPaymentType('NEW_MONTH');
          const agreed = getStudentAgreedRate(activeStudent);
          const fee = getSuggestedFee(initShift, initDuration, agreed);
          setTotalFee(fee);
          setAmount(fee);
          setPaidForMonth(currentMonth);
          setNotes('');
        }
      } else {
        setPaymentType('NEW_MONTH');
        setSelectedShift('FULL_DAY');
        setStayDuration('FULL_DAY');
        setTotalFee(1200);
        setAmount(1200);
        setPaidForMonth(currentMonth);
        setAssignedSeatNumber(preselectedSeatNumber || '');
        setNotes('');
      }
    }
  }, [isOpen, preselectedStudent, preselectedSeatNumber, students, currentMonth]);

  // When student selection changes, auto-update default amount & plan
  const handleStudentChange = (stdId: string) => {
    setSelectedStudentId(stdId);
    const found = students.find((s) => s.id === stdId);
    if (found) {
      const prevSeat = getStudentPreviousSeat(found);
      const seatToSet = found.seatNumber || (prevSeat.seatNumber && availableSeats.some((s) => s.seatNumber === prevSeat.seatNumber) ? prevSeat.seatNumber : '');
      setAssignedSeatNumber(seatToSet);

      const { shift: initShift, duration: initDuration } = resolveStudentShiftAndDuration(found);
      setSelectedShift(initShift);
      setStayDuration(initDuration);

      const hasDue = Boolean(found.remainingFee && found.remainingFee > 0);
      if (hasDue) {
        setPaymentType('REMAINING_DUE');
        const due = found.remainingFee!;
        setTotalFee(due);
        setAmount(due);
        const dueTx = (found.transactions || []).find((t) => t.remainingFee && t.remainingFee > 0);
        const targetMonth = dueTx?.paidForMonth || currentMonth;
        setPaidForMonth(targetMonth);
        setNotes(`Remaining fee clearance for ${targetMonth}`);
      } else {
        setPaymentType('NEW_MONTH');
        const agreed = getStudentAgreedRate(found);
        const fee = getSuggestedFee(initShift, initDuration, agreed);
        setTotalFee(fee);
        setAmount(fee);
        setPaidForMonth(currentMonth);
        setNotes('');
      }
    }
  };

  const currentStudent = students.find((s) => s.id === selectedStudentId) || preselectedStudent;

  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    const q = studentSearchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const nameMatch = s.fullName.toLowerCase().includes(q);
      const phoneMatch = s.phone.toLowerCase().includes(q);
      const seatMatch = s.seatNumber ? `seat ${s.seatNumber}`.toLowerCase().includes(q) || s.seatNumber.toLowerCase().includes(q) : false;
      const prevSeatMatch = s.previousSeatNumber ? `seat ${s.previousSeatNumber}`.toLowerCase().includes(q) || s.previousSeatNumber.toLowerCase().includes(q) : false;
      const purposeMatch = s.studyPurpose ? s.studyPurpose.toLowerCase().includes(q) : false;
      return nameMatch || phoneMatch || seatMatch || prevSeatMatch || purposeMatch;
    });
  }, [students, studentSearchQuery]);

  const monthPeriodStatus = useMemo(() => {
    if (!currentStudent) return null;

    const studentTxs = currentStudent.transactions || [];
    const targetMonth = (paidForMonth || '').trim();

    // Try finding matching transaction for this month or date range
    const matchingTx = studentTxs.find((tx) => {
      // 1. Exact or partial string match on paidForMonth
      if (tx.paidForMonth && targetMonth) {
        const pMonth = tx.paidForMonth.toLowerCase().trim();
        const tMonth = targetMonth.toLowerCase().trim();
        if (pMonth === tMonth) return true;

        // Extract month names and 4-digit years
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
        const tMatchedMonths = months.filter((m) => tMonth.includes(m));
        const pMatchedMonths = months.filter((m) => pMonth.includes(m));

        const tYearMatch = tMonth.match(/\b(20\d\d)\b/);
        const pYearMatch = pMonth.match(/\b(20\d\d)\b/);

        if (tMatchedMonths.length > 0 && pMatchedMonths.length > 0) {
          const monthOverlaps = tMatchedMonths.some((tm) =>
            pMatchedMonths.some((pm) => tm.startsWith(pm) || pm.startsWith(tm))
          );
          const yearMatches = !tYearMatch || !pYearMatch || tYearMatch[1] === pYearMatch[1];
          if (monthOverlaps && yearMatches) return true;
        }
      }

      // 2. Date overlap match via validFrom/validTo
      if (tx.validFrom && validFrom) {
        const d1 = new Date(tx.validFrom);
        const d2 = new Date(validFrom);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
            return true;
          }
        }
      }

      return false;
    });

    const agreedRate = getStudentAgreedRate(currentStudent);

    if (matchingTx) {
      const txPaid = Number(matchingTx.amount || 0);
      const txTotal = Number(matchingTx.totalFee || txPaid);
      const txRemaining =
        matchingTx.remainingFee !== undefined
          ? Number(matchingTx.remainingFee)
          : Math.max(0, txTotal - txPaid);

      if (txRemaining === 0 && txPaid > 0) {
        return {
          status: 'ALREADY_PAID' as const,
          paidAmount: txPaid,
          totalFee: txTotal,
          remainingDue: 0,
          tx: matchingTx,
        };
      } else if (txRemaining > 0) {
        return {
          status: 'PARTIAL_DUE' as const,
          paidAmount: txPaid,
          totalFee: txTotal,
          remainingDue: txRemaining,
          tx: matchingTx,
        };
      }
    }

    // Check if student overall has remaining fee due
    const studentDue = currentStudent.remainingFee || 0;
    if (studentDue > 0) {
      return {
        status: 'PARTIAL_DUE' as const,
        paidAmount: Math.max(0, agreedRate - studentDue),
        totalFee: agreedRate,
        remainingDue: studentDue,
        tx: studentTxs[0] || null,
      };
    }

    return {
      status: 'NO_PAYMENT' as const,
      paidAmount: 0,
      totalFee: agreedRate,
      remainingDue: agreedRate,
      tx: null,
    };
  }, [currentStudent, paidForMonth, validFrom, validTo]);

  const previousSeatInfo = useMemo(() => {
    if (!currentStudent) return { seatNumber: null, inactiveDays: 0 };
    return getStudentPreviousSeat(currentStudent);
  }, [currentStudent]);

  if (!isOpen) return null;

  const isSettlingDue = paymentType === 'REMAINING_DUE';
  const totalNum = totalFee === '' ? 0 : Number(totalFee);
  const getFeeNum = amount === '' ? 0 : Number(amount);
  const remainingDue = isSettlingDue
    ? Math.max(0, (currentStudent?.remainingFee || 0) - getFeeNum)
    : Math.max(0, totalNum - getFeeNum);

  const isPeriodAlreadyPaid = monthPeriodStatus?.status === 'ALREADY_PAID';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent duplicate fee collection if already paid for this period
    if (isPeriodAlreadyPaid) {
      if (assignedSeatNumber && assignedSeatNumber !== currentStudent?.seatNumber && onAssignSeat) {
        setIsLoading(true);
        try {
          await onAssignSeat(selectedStudentId, assignedSeatNumber);
          alert(`Seat ${assignedSeatNumber} successfully assigned to ${currentStudent?.fullName || 'student'}. Fee for this period (${paidForMonth}) was already cleared.`);
          onClose();
        } catch (err) {
          console.error('Failed to assign seat:', err);
          alert('Failed to assign seat. Please try again.');
        } finally {
          setIsLoading(false);
        }
        return;
      }
      alert(`Fee for ${paidForMonth} is already fully paid (All dues cleared). You cannot record duplicate payment for the same month period. Click "Advance to Next Month / Cycle" if you want to record advance fee.`);
      return;
    }

    if (!selectedStudentId || amount === '' || Number(amount) <= 0) {
      alert('Please enter a valid received amount and select a student.');
      return;
    }

    const finalTotalFee = isSettlingDue
      ? (currentStudent?.monthlyFee && currentStudent.monthlyFee > 0
          ? currentStudent.monthlyFee
          : (currentStudent?.totalFee || (currentStudent?.remainingFee || 0) + getFeeNum))
      : (totalNum > 0 ? totalNum : getFeeNum);

    const calculatedDays = isSettlingDue
      ? 0
      : validFrom && validTo
      ? Math.max(1, Math.round((new Date(validTo).getTime() - new Date(validFrom).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;

    if (assignedSeatNumber && assignedSeatNumber !== currentStudent?.seatNumber && onAssignSeat) {
      try {
        await onAssignSeat(selectedStudentId, assignedSeatNumber);
      } catch (err) {
        console.error('Failed to assign seat during fee collection:', err);
      }
    }

    setIsLoading(true);
    try {
      const res = await onRecordPayment({
        studentId: selectedStudentId,
        amount: getFeeNum,
        totalFee: finalTotalFee,
        remainingFee: remainingDue,
        validFrom,
        validTo,
        paidForMonth,
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || (isSettlingDue ? `Remaining fee clearance for ${paidForMonth}` : undefined),
        extendDays: calculatedDays,
        shift: selectedShift,
        stayDuration: selectedShift === 'FULL_DAY' ? 'FULL_DAY' : stayDuration,
        isSettlingDue,
        assignedSeatNumber: assignedSeatNumber || currentStudent?.seatNumber || undefined,
      });

      const receiptNum = res?.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;
      setRecordedReceipt({
        libraryName: libraryName || 'seeLibrary Study Center',
        libraryPhone,
        studentName: currentStudent?.fullName || 'Student',
        studentPhone: currentStudent?.phone || '',
        seatNumber: currentStudent?.seatNumber || null,
        shift: selectedShift,
        stayDuration: selectedShift === 'FULL_DAY' ? 'FULL_DAY' : stayDuration,
        receiptNumber: receiptNum,
        paidForMonth,
        validFrom,
        validTo,
        totalFee: finalTotalFee,
        amount: getFeeNum,
        remainingFee: remainingDue,
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || (isSettlingDue ? `Remaining fee clearance for ${paidForMonth}` : undefined),
        isSettlingDue,
      });
    } catch (err) {
      console.error('Failed to record fee transaction:', err);
      alert('Failed to record fee payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!recordedReceipt) return;
    const text = generateWhatsAppReceiptText(recordedReceipt);
    openWhatsApp(recordedReceipt.studentPhone, text);
  };

  const handleCopyText = async () => {
    if (!recordedReceipt) return;
    const text = generateWhatsAppReceiptText(recordedReceipt);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 dark:bg-black/80 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-[#262626]">
        
        {/* SUCCESS RECEIPT VIEW */}
        {recordedReceipt ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5 pt-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Fee Payment Recorded! 🎉
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Receipt #{recordedReceipt.receiptNumber} generated for {recordedReceipt.studentName}
              </p>
            </div>

            {/* Receipt mini card */}
            <div className="p-4 bg-slate-50 dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200/80 dark:border-[#333] pb-2">
                <span className="text-slate-500 dark:text-neutral-400">Student & Seat:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {recordedReceipt.studentName} {recordedReceipt.seatNumber ? `(Seat ${recordedReceipt.seatNumber})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Shift & Duration:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  {formatShiftSummary(recordedReceipt.shift, recordedReceipt.stayDuration)}
                </span>
              </div>
              {recordedReceipt.isSettlingDue && (
                <div className="flex justify-between items-center py-0.5 px-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-md">
                  <span className="text-amber-800 dark:text-amber-300 font-semibold">Payment Type:</span>
                  <span className="font-bold text-amber-900 dark:text-amber-200">Due Clearance</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Month / Period:</span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {recordedReceipt.paidForMonth}
                </span>
              </div>
              {recordedReceipt.validFrom && recordedReceipt.validTo && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-neutral-400">Validity:</span>
                  <span className="text-slate-700 dark:text-neutral-300">
                    {recordedReceipt.validFrom} to {recordedReceipt.validTo}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200/80 dark:border-[#333] pt-2">
                <span className="text-slate-500 dark:text-neutral-400">
                  {recordedReceipt.isSettlingDue ? 'Pending Due Balance:' : 'Total Monthly Fee:'}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{recordedReceipt.totalFee?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Amount Received:</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  ₹{recordedReceipt.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-neutral-400">Remaining Balance:</span>
                <span className={`font-bold ${
                  recordedReceipt.remainingFee && recordedReceipt.remainingFee > 0
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  {recordedReceipt.remainingFee && recordedReceipt.remainingFee > 0
                    ? `₹${recordedReceipt.remainingFee.toLocaleString('en-IN')} (Due)`
                    : '₹0 (Fully Cleared ✅)'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>Send Receipt on WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-[#1f1f1f] hover:bg-slate-200 dark:hover:bg-[#282828] text-slate-700 dark:text-neutral-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied! ✅' : 'Copy Text'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-200 dark:bg-[#252525] hover:bg-slate-300 dark:hover:bg-[#303030] text-slate-800 dark:text-neutral-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
        <>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262626] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/50 shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {isSettlingDue ? 'Clear Student Due' : 'Record Student Fee'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {isSettlingDue
                  ? 'Settle or reduce existing remaining fee balance'
                  : 'Collect and log library monthly membership payment'}
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Searchable Student Selector */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Select Enrolled Student *
              </label>
              <button
                type="button"
                onClick={() => setIsStudentDropdownOpen((prev) => !prev)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>{isStudentDropdownOpen ? 'Close Search' : 'Search / Change Student'}</span>
              </button>
            </div>

            {/* Selected Student Summary Card */}
            {currentStudent && (
              <div
                onClick={() => setIsStudentDropdownOpen((prev) => !prev)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isStudentDropdownOpen
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-2xs'
                    : 'bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-[#262626] hover:border-slate-300 dark:hover:border-[#363636]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {currentStudent.photoUrl ? (
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-[#363636] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {currentStudent.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentStudent.fullName}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        currentStudent.status === 'ACTIVE'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                      }`}>
                        {currentStudent.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      <span>{currentStudent.phone}</span>
                      <span>•</span>
                      <span>{formatShiftSummary(currentStudent.shift, currentStudent.stayDuration)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {currentStudent.seatNumber ? (
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Armchair className="w-3 h-3" /> Seat {currentStudent.seatNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-[#262626] px-1.5 py-0.5 rounded-md">
                      No Seat
                    </span>
                  )}
                  {currentStudent.remainingFee && currentStudent.remainingFee > 0 ? (
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
                      Due: ₹{currentStudent.remainingFee}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-md">
                      Paid
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStudentDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                </div>
              </div>
            )}

            {/* Search Dropdown Popup */}
            {isStudentDropdownOpen && (
              <div className="p-2.5 bg-white dark:bg-[#1a1a1c] border border-slate-300 dark:border-[#333] rounded-xl shadow-xl space-y-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search by student name, phone, or seat number..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#2a2a2a] rounded-lg text-xs text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* List of matching students */}
                <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-[#262626]/40 pr-0.5">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 dark:text-neutral-500">
                      No students found matching &quot;{studentSearchQuery}&quot;
                    </div>
                  ) : (
                    filteredStudents.map((s) => {
                      const isSelected = s.id === selectedStudentId;
                      const agreedRate = getStudentAgreedRate(s);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            handleStudentChange(s.id);
                            setIsStudentDropdownOpen(false);
                            setStudentSearchQuery('');
                          }}
                          className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer pt-2 ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                              : 'hover:bg-slate-50 dark:hover:bg-[#222]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-[#2a2a2a] text-slate-700 dark:text-neutral-300'
                            }`}>
                              {s.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {s.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                                {s.phone} {s.studyPurpose ? `• ${s.studyPurpose}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {s.seatNumber && (
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                Seat {s.seatNumber}
                              </span>
                            )}
                            {s.remainingFee && s.remainingFee > 0 ? (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                                Due: ₹{s.remainingFee}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                ₹{agreedRate}/mo
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ml-1" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seat Allocation Selector */}
          {availableSeats && availableSeats.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Armchair className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Assign / Confirm Seat</span>
                </span>
                {currentStudent?.seatNumber ? (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-md">
                    Seat {currentStudent.seatNumber}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-md">
                    Seat Required
                  </span>
                )}
              </label>

              {/* Intelligent Previous Seat Quick Suggestion (< 30 days inactive) */}
              {!currentStudent?.seatNumber && previousSeatInfo.seatNumber && (
                (() => {
                  const isPrevSeatAvail = availableSeats.some((s) => s.seatNumber === previousSeatInfo.seatNumber);
                  return (
                    <div className="p-2 bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200">
                        <Armchair className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>
                          Previous Seat: <strong className="font-bold text-indigo-700 dark:text-indigo-300">Seat {previousSeatInfo.seatNumber}</strong>
                          {previousSeatInfo.inactiveDays > 0 ? (
                            <span className="text-[11px] text-slate-500 dark:text-neutral-400 ml-1">
                              ({previousSeatInfo.inactiveDays}d ago)
                            </span>
                          ) : ''}
                        </span>
                      </div>
                      {isPrevSeatAvail ? (
                        <button
                          type="button"
                          onClick={() => setAssignedSeatNumber(previousSeatInfo.seatNumber!)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-2xs ${
                            assignedSeatNumber === previousSeatInfo.seatNumber
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                          }`}
                        >
                          {assignedSeatNumber === previousSeatInfo.seatNumber ? 'Selected ✓' : 'Assign Old Seat'}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800/60">
                          Currently Occupied
                        </span>
                      )}
                    </div>
                  );
                })()
              )}

              <select
                value={assignedSeatNumber}
                onChange={(e) => setAssignedSeatNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">
                  {currentStudent?.seatNumber
                    ? `Keep Current (Seat ${currentStudent.seatNumber})`
                    : previousSeatInfo.seatNumber
                    ? `-- Select Seat to Assign (Old Seat: ${previousSeatInfo.seatNumber}) --`
                    : '-- Select Seat to Assign --'}
                </option>
                {availableSeats.map((seat) => {
                  const isOldSeat = previousSeatInfo.seatNumber && seat.seatNumber === previousSeatInfo.seatNumber;
                  return (
                    <option key={seat.id} value={seat.seatNumber}>
                      {isOldSeat ? '⭐ ' : ''}Seat {seat.seatNumber} {seat.rowName ? `(${seat.rowName})` : ''} {isOldSeat ? '(Previous Seat)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Month / Period Payment Status Alert */}
          {monthPeriodStatus && (
            <div className="space-y-1.5">
              {monthPeriodStatus.status === 'ALREADY_PAID' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Fee Already Paid for this Period ({paidForMonth})</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                      All Dues Cleared (₹0 Due) ✅
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-snug">
                    Student has already paid <strong className="font-bold">₹{monthPeriodStatus.paidAmount}</strong> for{' '}
                    <strong className="font-bold">{paidForMonth}</strong>
                    {monthPeriodStatus.tx?.paymentDate ? ` on ${new Date(monthPeriodStatus.tx.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    {monthPeriodStatus.tx?.receiptNumber ? ` (Receipt #${monthPeriodStatus.tx.receiptNumber})` : ''}.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Recording advance fee for next month?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currValidTo = validTo || new Date().toISOString().split('T')[0];
                        const nextFrom = currValidTo;
                        const d = new Date(nextFrom);
                        d.setDate(d.getDate() + 30);
                        const nextTo = d.toISOString().split('T')[0];
                        setValidFrom(nextFrom);
                        setValidTo(nextTo);
                        setPaidForMonth(formatMonthPeriod(nextFrom, nextTo));
                        const agreed = getStudentAgreedRate(currentStudent);
                        setTotalFee(agreed);
                        setAmount(agreed);
                      }}
                      className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>👉 Advance to Next Month / Cycle</span>
                    </button>
                  </div>
                </div>
              )}

              {monthPeriodStatus.status === 'PARTIAL_DUE' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Partial Fee Due for {paidForMonth}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                      Pending Due: ₹{monthPeriodStatus.remainingDue} ⚠️
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                    Student previously paid <strong className="font-bold">₹{monthPeriodStatus.paidAmount}</strong> out of{' '}
                    <strong className="font-bold">₹{monthPeriodStatus.totalFee}</strong>. Balance remaining due is{' '}
                    <strong className="font-bold">₹{monthPeriodStatus.remainingDue}</strong>.
                  </p>
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('REMAINING_DUE');
                        setTotalFee(monthPeriodStatus.remainingDue);
                        setAmount(monthPeriodStatus.remainingDue);
                        setNotes(`Remaining fee clearance for ${paidForMonth}`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>⚡ Clear Balance Due (₹{monthPeriodStatus.remainingDue})</span>
                    </button>
                  </div>
                </div>
              )}

              {monthPeriodStatus.status === 'NO_PAYMENT' && (
                <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="text-[11px] text-indigo-950 dark:text-indigo-200">
                      <span className="font-bold">Fee Pending for {paidForMonth}:</span> Agreed plan rate is{' '}
                      <strong className="font-bold text-indigo-700 dark:text-indigo-300">₹{monthPeriodStatus.totalFee}</strong> ({formatShiftSummary(selectedShift, stayDuration)}).
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full shrink-0">
                    Fee Pending
                  </span>
                </div>
              )}
            </div>
          )}

          {/* DUAL MODE SELECTOR (Only when student has existing remaining fee) */}
          {Boolean(currentStudent?.remainingFee && currentStudent.remainingFee > 0) && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('REMAINING_DUE');
                    const due = currentStudent?.remainingFee || 0;
                    setTotalFee(due);
                    setAmount(due);
                    const dueTx = (currentStudent?.transactions || []).find((t) => t.remainingFee && t.remainingFee > 0);
                    const targetMonth = dueTx?.paidForMonth || currentMonth;
                    setPaidForMonth(targetMonth);
                    setNotes(`Remaining fee clearance for ${targetMonth}`);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentType === 'REMAINING_DUE'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Pay Due (₹{currentStudent?.remainingFee})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('NEW_MONTH');
                    const { shift: newShift, duration: newDuration } = resolveStudentShiftAndDuration(currentStudent);
                    setSelectedShift(newShift);
                    setStayDuration(newDuration);
                    const agreed = getStudentAgreedRate(currentStudent);
                    const fee = getSuggestedFee(newShift, newDuration, agreed);
                    setTotalFee(fee);
                    setAmount(fee);
                    setPaidForMonth(currentMonth);
                    setNotes('');
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentType === 'NEW_MONTH'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>New Month / Renewal</span>
                </button>
              </div>

              {paymentType === 'REMAINING_DUE' && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
                    <span className="font-bold">Settling Pending Balance:</span> Student has ₹{currentStudent?.remainingFee} unpaid due from previous payment. Collecting this will clear the due without inflating the total monthly rate in history.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SHIFT & STAY DURATION SELECTOR (Only in NEW_MONTH mode) */}
          {paymentType === 'NEW_MONTH' ? (
            <div className="space-y-3">
              {/* Tier 1: Shift Selector (Morning, Evening, Full Day) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Select Shift *</span>
                  </label>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                    {selectedShift === 'MORNING'
                      ? 'Morning Shift'
                      : selectedShift === 'EVENING'
                      ? 'Evening Shift'
                      : 'Full Day'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'MORNING' as const,
                      title: 'Morning Shift',
                      subtitle: '6 AM – 2 PM',
                      icon: '🌅',
                    },
                    {
                      id: 'EVENING' as const,
                      title: 'Evening Shift',
                      subtitle: '2 PM – 10 PM',
                      icon: '🌇',
                    },
                    {
                      id: 'FULL_DAY' as const,
                      title: 'Full Day',
                      subtitle: '24/7 Unlimited',
                      icon: '☀️',
                    },
                  ].map((shiftOption) => (
                    <button
                      key={shiftOption.id}
                      type="button"
                      onClick={() => {
                        setSelectedShift(shiftOption.id);
                        let nextDuration = stayDuration;
                        if (shiftOption.id === 'FULL_DAY') {
                          nextDuration = 'FULL_DAY';
                          setStayDuration('FULL_DAY');
                        } else if (stayDuration === 'FULL_DAY') {
                          nextDuration = 'HALF_DAY';
                          setStayDuration('HALF_DAY');
                        }
                        const isStudentDefaultPlan =
                          currentStudent &&
                          resolveStudentShiftAndDuration(currentStudent).shift === shiftOption.id &&
                          resolveStudentShiftAndDuration(currentStudent).duration === nextDuration;
                        const agreed = getStudentAgreedRate(currentStudent);
                        const fee = getSuggestedFee(
                          shiftOption.id,
                          nextDuration,
                          isStudentDefaultPlan ? agreed : undefined
                        );
                        setTotalFee(fee);
                        setAmount(fee);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedShift === shiftOption.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600 dark:ring-indigo-500 shadow-2xs font-bold'
                          : 'bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-[#262626] text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#262626]'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-center gap-1">
                        <span>{shiftOption.icon}</span>
                        <span>{shiftOption.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5">{shiftOption.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier 2: Stay Duration (Conditional: only for Morning or Evening shifts) */}
              {selectedShift !== 'FULL_DAY' ? (
                <div className="p-2.5 bg-slate-50/80 dark:bg-[#161616] border border-slate-200 dark:border-[#262626] rounded-xl space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                      <span>Stay Duration for {selectedShift === 'MORNING' ? 'Morning' : 'Evening'} Shift *</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      {stayDuration === 'FOUR_HOURS' ? '4 Hours / Day' : 'Half Day (6–8 Hours)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: 'FOUR_HOURS' as const,
                        title: '4 Hours',
                        subtitle: '4 Hours / Day',
                      },
                      {
                        id: 'HALF_DAY' as const,
                        title: 'Half Day',
                        subtitle: '6–8 Hours / Day',
                      },
                    ].map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => {
                          setStayDuration(dur.id);
                          const isStudentDefaultPlan =
                            currentStudent &&
                            resolveStudentShiftAndDuration(currentStudent).shift === selectedShift &&
                            resolveStudentShiftAndDuration(currentStudent).duration === dur.id;
                          const agreed = getStudentAgreedRate(currentStudent);
                          const fee = getSuggestedFee(
                            selectedShift,
                            dur.id,
                            isStudentDefaultPlan ? agreed : undefined
                          );
                          setTotalFee(fee);
                          setAmount(fee);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          stayDuration === dur.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-[#1f1f1f] border-slate-200 dark:border-[#2d2d2d] text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#282828]'
                        }`}
                      >
                        <div className="text-xs font-bold">{dur.title}</div>
                        <div className={`text-[10px] ${stayDuration === dur.id ? 'text-indigo-100' : 'text-slate-400 dark:text-neutral-500'} mt-0.5`}>
                          {dur.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Full Day Membership
                  </span>
                  <span className="font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
                    24/7 Unlimited Access (No slot restriction)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-neutral-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Current Active Plan:
              </span>
              <span className="font-bold text-slate-800 dark:text-neutral-200">
                {formatShiftSummary(selectedShift, stayDuration)} (₹{currentStudent?.monthlyFee || 1200}/mo)
              </span>
            </div>
          )}

          {/* FEE INPUTS: Differentiated for REMAINING_DUE vs NEW_MONTH */}
          {paymentType === 'REMAINING_DUE' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Pending Due Amount
                </label>
                <div className="px-3 py-2 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-black text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>₹{currentStudent?.remainingFee}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    To Clear
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Amount Received Now *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    max={currentStudent?.remainingFee}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={String(currentStudent?.remainingFee || '')}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#1c1c1e] border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ) : isPeriodAlreadyPaid ? (
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Fee for {paidForMonth} is Fully Cleared</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  ₹0 Due (Paid)
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Student already has an active paid enrollment for this cycle. Duplicate fees cannot be added for the same month period.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Total Fee (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={totalFee}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setTotalFee(val);
                      if (amount === totalFee) {
                        setAmount(val);
                      }
                    }}
                    placeholder="1200"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-bold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Amount Received (Get Fee) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1200"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#1c1c1e] border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Remaining Due Status Banner */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              remainingDue > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <span className="font-semibold flex items-center gap-1.5">
              {remainingDue > 0 ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Remaining Due After This:</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Payment Status:</span>
                </>
              )}
            </span>
            <span className="font-extrabold">
              {remainingDue > 0 ? `₹${remainingDue} Remaining Due` : 'Due Cleared (₹0 Due) ✅'}
            </span>
          </div>

          {/* Date Range: Valid From & Valid To */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Membership Date Range (From - To) *</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-0.5">Valid From</span>
                <input
                  type="date"
                  required
                  value={validFrom}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setValidFrom(newFrom);
                    if (newFrom) {
                      const d = new Date(newFrom);
                      d.setDate(d.getDate() + 30);
                      const newTo = d.toISOString().split('T')[0];
                      setValidTo(newTo);
                      setPaidForMonth(formatMonthPeriod(newFrom, newTo));
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-0.5">Valid To (Next Due Date)</span>
                <input
                  type="date"
                  required
                  value={validTo}
                  onChange={(e) => {
                    const newTo = e.target.value;
                    setValidTo(newTo);
                    if (validFrom && newTo) {
                      setPaidForMonth(formatMonthPeriod(validFrom, newTo));
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Dynamic Billing Period Label */}
            {validFrom && validTo && (
              <div className="p-2 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 rounded-xl text-xs flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400 font-medium text-[11px]">Period Cycle:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                  {getDetailedPeriodLabel(validFrom, validTo)}
                </span>
              </div>
            )}
          </div>

          {/* Fee for Month Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
              Billing Month Reference *
            </label>
            <input
              type="text"
              required
              value={paidForMonth}
              onChange={(e) => setPaidForMonth(e.target.value)}
              placeholder="e.g. Jan – Feb 2026"
              className="w-full px-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Payment Mode Selector (Only UPI / QR and Cash) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
              Payment Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR' },
                { id: 'CASH', label: 'Cash' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMode(m.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                    paymentMode === m.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500 shadow-2xs'
                      : 'bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-[#262626] text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#262626]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Date & Note */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Notes / Txn ID <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. GPay / PhonePe ref"
                className="w-full px-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>


          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-neutral-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-[#262626] cursor-pointer"
            >
              Cancel
            </button>
            {isPeriodAlreadyPaid ? (
              assignedSeatNumber && assignedSeatNumber !== currentStudent?.seatNumber ? (
                <button
                  type="submit"
                  disabled={isLoading || !selectedStudentId}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Armchair className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Assigning Seat...' : `Assign Seat ${assignedSeatNumber} (Fee Cleared)`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={true}
                  className="flex-1 py-2.5 bg-slate-200 dark:bg-[#262626] text-slate-500 dark:text-neutral-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fee Already Paid for this Period</span>
                </button>
              )
            ) : (
              <button
                type="submit"
                disabled={isLoading || !selectedStudentId}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Saving...' : 'Confirm & Collect Fee'}</span>
              </button>
            )}
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
};
