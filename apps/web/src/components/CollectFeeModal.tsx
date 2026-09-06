'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, IndianRupee, Calendar, CreditCard, User, Armchair, ShieldCheck, Clock } from 'lucide-react';
import { StudentItem } from './StudentList';

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentItem[];
  preselectedStudent?: StudentItem | null;
  onRecordPayment: (paymentData: {
    studentId: string;
    amount: number;
    paidForMonth: string;
    paymentMode: string;
    paymentDate: string;
    notes?: string;
    extendDays: number;
    shift?: string;
  }) => Promise<void> | void;
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
  onRecordPayment,
}) => {
  const monthOptions = getMonthOptions();
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>(1200);
  const [paidForMonth, setPaidForMonth] = useState<string>(currentMonth);
  const [planDuration, setPlanDuration] = useState<string>('FULL_DAY');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [extendMembership, setExtendMembership] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const activeStudent = preselectedStudent || (students.length > 0 ? students[0] : null);
      if (activeStudent) {
        setSelectedStudentId(activeStudent.id);
        const shiftVal = activeStudent.shift || 'FULL_DAY';
        setPlanDuration(shiftVal);
        setAmount(getSuggestedFee(shiftVal, activeStudent.monthlyFee));
      }
      setPaidForMonth(currentMonth);
      setPaymentMode('UPI');
      setPaymentDate(new Date().toISOString().split('T')[0]);
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
      setAmount(getSuggestedFee(shiftVal, found.monthlyFee));
    }
  };

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId) || preselectedStudent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || amount === '' || Number(amount) <= 0) {
      alert('Please enter a valid amount and select a student.');
      return;
    }

    setIsLoading(true);
    try {
      await onRecordPayment({
        studentId: selectedStudentId,
        amount: Number(amount),
        paidForMonth,
        paymentMode,
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || undefined,
        extendDays: extendMembership ? 30 : 0,
        shift: planDuration,
      });
      onClose();
    } catch (err) {
      console.error('Failed to record fee transaction:', err);
      alert('Failed to record fee payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">Record Student Fee</h3>
              <p className="text-xs text-slate-500">Collect and log library monthly membership payment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Student Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Enrolled Student *
            </label>
            {preselectedStudent ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {currentStudent?.photoUrl ? (
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      {currentStudent?.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{currentStudent?.fullName}</h4>
                    <p className="text-[11px] text-slate-500">{currentStudent?.phone}</p>
                  </div>
                </div>
                {currentStudent?.seatNumber && (
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Armchair className="w-3 h-3" /> Seat {currentStudent.seatNumber}
                  </span>
                )}
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.phone}) {s.seatNumber ? `• Seat ${s.seatNumber}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stay Duration / Seat Plan Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Stay Duration / Plan (For this month) *</span>
              </label>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
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
                    setAmount(getSuggestedFee(plan.id));
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    planDuration === plan.id
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-600 shadow-2xs font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{plan.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{plan.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount and Month in 2 columns */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fee Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1200"
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fee for Month *
              </label>
              <select
                value={paidForMonth}
                onChange={(e) => setPaidForMonth(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Mode Selector (Only UPI / QR and Cash) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes / Txn ID <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. GPay / PhonePe ref"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Membership extension checkbox */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Extend Validity (+30 Days)
                </span>
                <span className="text-[10px] text-emerald-700">
                  Adds 30 days to the student's active membership renewal date.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={extendMembership}
              onChange={(e) => setExtendMembership(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
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
      </div>
    </div>
  );
};
