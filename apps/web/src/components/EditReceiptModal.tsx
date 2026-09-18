'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Calendar,
  IndianRupee,
  CreditCard,
  User,
  Armchair,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Loader2,
  Clock,
  FileText,
} from 'lucide-react';
import { StudentFeeRecord } from './StudentList';
import { formatDateDMY } from '@/lib/receipt-utils';
import { formatMonthPeriod, getMonthsDifference } from '@/lib/billing-periods';

interface EditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: StudentFeeRecord | null;
  onUpdate: (updatedData: {
    id: string;
    studentId: string;
    amount: number;
    totalFee: number;
    remainingFee: number;
    paidForMonth: string;
    validFrom?: string;
    validTo?: string;
    paymentDate: string;
    paymentMode: string;
    notes?: string;
  }) => Promise<void> | void;
  onDelete: (transactionId: string, studentId: string) => Promise<void> | void;
  libraryName?: string;
}

export const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onUpdate,
  onDelete,
  libraryName = 'seeLibrary Study Center',
}) => {
  const [amount, setAmount] = useState<number | ''>(0);
  const [totalFee, setTotalFee] = useState<number | ''>(0);
  const [remainingFee, setRemainingFee] = useState<number | ''>(0);
  const [paidForMonth, setPaidForMonth] = useState<string>('');
  const [validFrom, setValidFrom] = useState<string>('');
  const [validTo, setValidTo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && transaction) {
      setAmount(Number(transaction.amount) || 0);
      const initialTotal = transaction.totalFee !== undefined ? Number(transaction.totalFee) : Number(transaction.amount) || 0;
      setTotalFee(initialTotal);
      setRemainingFee(transaction.remainingFee !== undefined ? Number(transaction.remainingFee) : 0);
      setPaidForMonth(transaction.paidForMonth || '');
      setValidFrom(transaction.validFrom ? transaction.validFrom.split('T')[0] : '');
      setValidTo(transaction.validTo ? transaction.validTo.split('T')[0] : '');
      setPaymentDate(transaction.paymentDate ? transaction.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
      setPaymentMode(transaction.paymentMode || 'UPI');
      setNotes(transaction.notes || '');
      setShowDeleteConfirm(false);
      setIsSaving(false);
      setIsDeleting(false);
    }
  }, [isOpen, transaction]);

  const calculatedDays = useMemo(() => {
    if (!validFrom || !validTo) return null;
    const d1 = new Date(validFrom).getTime();
    const d2 = new Date(validTo).getTime();
    if (isNaN(d1) || isNaN(d2)) return null;
    return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
  }, [validFrom, validTo]);

  const calculatedMonths = useMemo(() => {
    if (!validFrom || !validTo) return 1;
    return getMonthsDifference(validFrom, validTo);
  }, [validFrom, validTo]);

  if (!isOpen || !transaction) return null;

  const handleTotalFeeChange = (val: number | '') => {
    setTotalFee(val);
    const numTotal = val === '' ? 0 : Number(val);
    const numAmount = amount === '' ? 0 : Number(amount);
    setRemainingFee(Math.max(0, numTotal - numAmount));
  };

  const handleAmountChange = (val: number | '') => {
    setAmount(val);
    const numTotal = totalFee === '' ? 0 : Number(totalFee);
    const numAmount = val === '' ? 0 : Number(val);
    setRemainingFee(Math.max(0, numTotal - numAmount));
  };

  const handleAutoSetMonth = () => {
    if (validFrom && validTo) {
      setPaidForMonth(formatMonthPeriod(validFrom, validTo));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || Number(amount) < 0) {
      alert('Please enter a valid received amount.');
      return;
    }
    if (!paidForMonth.trim()) {
      alert('Please enter a valid month/period name.');
      return;
    }

    const finalTotal = totalFee === '' ? Number(amount) : Number(totalFee);
    const finalRemaining = remainingFee === '' ? Math.max(0, finalTotal - Number(amount)) : Number(remainingFee);

    setIsSaving(true);
    try {
      await onUpdate({
        id: transaction.id,
        studentId: transaction.studentId,
        amount: Number(amount),
        totalFee: finalTotal,
        remainingFee: finalRemaining,
        paidForMonth: paidForMonth.trim(),
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMode,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to update receipt transaction:', err);
      alert(err.message || 'Failed to update receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(transaction.id, transaction.studentId);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete receipt transaction:', err);
      alert(err.message || 'Failed to delete receipt. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 dark:bg-black/85 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-lg rounded-2xl shadow-2xl space-y-4 my-auto relative border border-slate-200 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#262626] bg-slate-50/70 dark:bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Edit Fee Receipt</span>
                {transaction.receiptNumber && (
                  <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.5 rounded font-bold">
                    #{transaction.receiptNumber}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Modify enrollment period, amounts, or payment dates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Info Banner */}
        <div className="mx-5 p-3 bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-xs shrink-0">
              {transaction.studentName ? transaction.studentName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                {transaction.studentName || 'Student'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                {transaction.studentPhone}
              </span>
            </div>
          </div>

          {transaction.seatNumber ? (
            <span className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md text-xs">
              <Armchair className="w-3.5 h-3.5" /> Seat {transaction.seatNumber}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-neutral-500">General / Unassigned</span>
          )}
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm ? (
          <div className="mx-5 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-red-900 dark:text-red-200">
                  Delete Receipt #{transaction.receiptNumber || transaction.id.slice(-6)}?
                </h4>
                <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">
                  This will remove the transaction record from the student&apos;s fee ledger. The student&apos;s validity and dues will safely recalculate based on remaining prior payments.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSubmit} className="px-5 space-y-3.5">
            {/* Month / Period Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Paid For Month / Period *
                </label>
                {validFrom && validTo && (
                  <button
                    type="button"
                    onClick={handleAutoSetMonth}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    title="Auto-calculate label from Validity dates"
                  >
                    ⚡ Auto-Set from Dates
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={paidForMonth}
                onChange={(e) => setPaidForMonth(e.target.value)}
                placeholder="e.g. Sep – Nov 2026 or October 2026"
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Validity Range (Valid From & Valid To) */}
            <div className="p-3 bg-slate-50/80 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Validity Range</span>
                </label>
                {calculatedDays !== null && (
                  <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md">
                    ≈ {calculatedDays} Days ({calculatedMonths} {calculatedMonths === 1 ? 'Month' : 'Months'})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400 block mb-0.5">
                    Valid From:
                  </span>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333] rounded-lg text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {validFrom && (
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5 block">
                      {formatDateDMY(validFrom)}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400 block mb-0.5">
                    Valid To:
                  </span>
                  <input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333] rounded-lg text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {validTo && (
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5 block">
                      {formatDateDMY(validTo)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Amounts (Total Fee, Amount Received, Remaining Due) */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Total Plan Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalFee}
                  onChange={(e) => handleTotalFeeChange(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-white dark:bg-[#1a1a1a] border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Remaining Due (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={remainingFee}
                  onChange={(e) => setRemainingFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full px-2.5 py-2 bg-white dark:bg-[#1a1a1a] border rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 ${
                    Number(remainingFee) > 0
                      ? 'border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 focus:ring-amber-500'
                      : 'border-slate-200 dark:border-[#2a2a2a] text-slate-700 dark:text-neutral-300 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Payment Mode & Payment Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="UPI">UPI / Online / QR</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card / POS</option>
                  <option value="NETBANKING">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {paymentDate && (
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5 block">
                    {formatDateDMY(paymentDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Notes / Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cleared 3 months upfront, special discount, etc."
                className="w-full px-3 py-1.5 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl text-xs font-normal text-slate-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Delete this receipt"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
