'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, IndianRupee, Calendar, CreditCard, User, Armchair, ShieldCheck, Clock, AlertCircle, Printer, FileCheck, Copy } from 'lucide-react';
import { StudentItem } from './StudentList';
import { WhatsAppIcon } from './WhatsAppIcon';
import { generateWhatsAppReceiptText, openWhatsApp, FeeReceiptData } from '@/lib/receipt-utils';

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentItem[];
  preselectedStudent?: StudentItem | null;
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

const getSuggestedFee = (shift: string, customMonthlyFee?: number) => {
  if (customMonthlyFee && customMonthlyFee > 0) return customMonthlyFee;
  switch (shift) {
    case 'FOUR_HOURS':
      return 600;
    case 'HALF_DAY':
      return 900;
    case 'FULL_DAY':
    default:
      return 1200;
  }
};

export const CollectFeeModal: React.FC<CollectFeeModalProps> = ({
  isOpen,
  onClose,
  students,
  preselectedStudent,
  libraryName = 'seeLibrary Study Center',
  libraryPhone,
  onRecordPayment,
}) => {
  const monthOptions = getMonthOptions();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [totalFee, setTotalFee] = useState<number | ''>(1200);
  const [amount, setAmount] = useState<number | ''>(1200); // Get Fee / Collected
  const [validFrom, setValidFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [paidForMonth, setPaidForMonth] = useState<string>(currentMonth);
  const [planDuration, setPlanDuration] = useState<string>('FULL_DAY');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [extendMembership, setExtendMembership] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recordedReceipt, setRecordedReceipt] = useState<FeeReceiptData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setRecordedReceipt(null);
      setCopied(false);
      const activeStudent = preselectedStudent || (students.length > 0 ? students[0] : null);
      if (activeStudent) {
        setSelectedStudentId(activeStudent.id);
        const shiftVal = activeStudent.shift || 'FULL_DAY';
        setPlanDuration(shiftVal);
        const fee = getSuggestedFee(shiftVal, activeStudent.monthlyFee);
        setTotalFee(fee);
        setAmount(fee);
      }
      const todayStr = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setValidFrom(todayStr);
      setValidTo(nextMonth.toISOString().split('T')[0]);
      setPaidForMonth(currentMonth);
      setPaymentMode('UPI');
      setPaymentDate(todayStr);
      setNotes('');
      setExtendMembership(true);
    }
  }, [isOpen, preselectedStudent, students]);

  // When student selection changes, auto-update default amount & plan
  const handleStudentChange = (stdId: string) => {
    setSelectedStudentId(stdId);
    const found = students.find((s) => s.id === stdId);
    if (found) {
      const shiftVal = found.shift || 'FULL_DAY';
      setPlanDuration(shiftVal);
      const fee = getSuggestedFee(shiftVal, found.monthlyFee);
      setTotalFee(fee);
      setAmount(fee);
    }
  };

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId) || preselectedStudent;

  const totalNum = totalFee === '' ? 0 : Number(totalFee);
  const getFeeNum = amount === '' ? 0 : Number(amount);
  const remainingDue = Math.max(0, totalNum - getFeeNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || amount === '' || Number(amount) <= 0) {
      alert('Please enter a valid received amount and select a student.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await onRecordPayment({
        studentId: selectedStudentId,
        amount: Number(amount),
        totalFee: totalNum > 0 ? totalNum : Number(amount),
        remainingFee: remainingDue,
        validFrom,
        validTo,
        paidForMonth,
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || undefined,
        extendDays: extendMembership ? 30 : 0,
        shift: planDuration,
      });

      const receiptNum = res?.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;
      setRecordedReceipt({
        libraryName: libraryName || 'seeLibrary Study Center',
        libraryPhone,
        studentName: currentStudent?.fullName || 'Student',
        studentPhone: currentStudent?.phone || '',
        seatNumber: currentStudent?.seatNumber || null,
        shift: planDuration,
        receiptNumber: receiptNum,
        paidForMonth,
        validFrom,
        validTo,
        totalFee: totalNum > 0 ? totalNum : Number(amount),
        amount: Number(amount),
        remainingFee: remainingDue,
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || undefined,
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
                <span className="text-slate-500 dark:text-neutral-400">Total Rate:</span>
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
                    : '₹0 (Fully Paid ✅)'}
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
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">Record Student Fee</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Collect and log library monthly membership payment</p>
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
          {/* Student Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
              Select Enrolled Student *
            </label>
            {preselectedStudent ? (
              <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {currentStudent?.photoUrl ? (
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-[#363636]"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      {currentStudent?.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{currentStudent?.fullName}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">{currentStudent?.phone}</p>
                  </div>
                </div>
                {currentStudent?.seatNumber && (
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Armchair className="w-3 h-3" /> Seat {currentStudent.seatNumber}
                  </span>
                )}
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-[#1c1c1e] dark:text-neutral-100">
                    {s.fullName} ({s.phone}) {s.seatNumber ? `• Seat ${s.seatNumber}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stay Duration / Seat Plan Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Stay Duration / Plan (For this month) *</span>
              </label>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                {planDuration === 'FOUR_HOURS'
                  ? '4 Hours'
                  : planDuration === 'HALF_DAY'
                  ? 'Half Day'
                  : 'Full Day'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'FOUR_HOURS',
                  title: '4 Hours',
                  subtitle: '4 Hours / Day',
                },
                {
                  id: 'HALF_DAY',
                  title: 'Half Day',
                  subtitle: '6-8 Hours / Day',
                },
                {
                  id: 'FULL_DAY',
                  title: 'Full Day',
                  subtitle: '24/7 Unlimited',
                },
              ].map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setPlanDuration(plan.id);
                    const fee = getSuggestedFee(plan.id);
                    setTotalFee(fee);
                    setAmount(fee);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    planDuration === plan.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600 dark:ring-indigo-500 shadow-2xs font-bold'
                      : 'bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-[#262626] text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#262626]'
                  }`}
                >
                  <div className="text-xs font-bold">{plan.title}</div>
                  <div className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5">{plan.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Total Fee & Amount Received (Get Fee) in 2 columns */}
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
                  <span>Remaining Fee Balance:</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Payment Status:</span>
                </>
              )}
            </span>
            <span className="font-extrabold">
              {remainingDue > 0 ? `₹${remainingDue} Remaining Due` : 'Fully Paid (₹0 Due)'}
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
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-0.5">Valid To (Next Due Date)</span>
                <input
                  type="date"
                  required
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-medium text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Fee for Month Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
              Billing Month Reference *
            </label>
            <select
              value={paidForMonth}
              onChange={(e) => setPaidForMonth(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m} className="dark:bg-[#1c1c1e] dark:text-neutral-100">
                  {m}
                </option>
              ))}
            </select>
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

          {/* Membership extension checkbox */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block">
                  Extend Validity (+30 Days)
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400/90">
                  Adds 30 days to the student's active membership renewal date.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={extendMembership}
              onChange={(e) => setExtendMembership(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-[#363636] focus:ring-emerald-500 cursor-pointer"
            />
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
            <button
              type="submit"
              disabled={isLoading || !selectedStudentId}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Saving...' : 'Confirm & Collect Fee'}</span>
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
};
