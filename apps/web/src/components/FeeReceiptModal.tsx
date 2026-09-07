'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Copy,
  Calendar,
  IndianRupee,
  Building2,
  User,
  Armchair,
  FileCheck,
  Share2,
} from 'lucide-react';
import { StudentFeeRecord } from './StudentList';
import { WhatsAppIcon } from './WhatsAppIcon';
import { generateWhatsAppReceiptText, openWhatsApp } from '@/lib/receipt-utils';

interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: StudentFeeRecord | null;
  libraryName: string;
  libraryAddress?: string;
  libraryPhone?: string;
}

export const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  libraryName,
  libraryAddress,
  libraryPhone,
}) => {
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transaction) return null;

  const formattedDate = new Date(transaction.paymentDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const totalFee = transaction.totalFee ?? transaction.amount;
  const remainingFee = transaction.remainingFee ?? 0;
  const isFullyPaid = remainingFee <= 0;
  const isSettlingDue = Boolean(
    transaction.notes?.toLowerCase().includes('clearance') ||
    transaction.notes?.toLowerCase().includes('settling') ||
    transaction.notes?.toLowerCase().includes('due payment')
  );

  const receiptData = {
    libraryName,
    libraryAddress,
    libraryPhone,
    studentName: transaction.studentName || 'Student',
    studentPhone: transaction.studentPhone || '',
    seatNumber: transaction.seatNumber,
    receiptNumber: transaction.receiptNumber,
    paidForMonth: transaction.paidForMonth,
    validFrom: transaction.validFrom,
    validTo: transaction.validTo,
    totalFee,
    amount: transaction.amount,
    remainingFee,
    paymentMode: transaction.paymentMode,
    paymentDate: transaction.paymentDate,
    notes: transaction.notes,
    isSettlingDue,
  };

  const handleSendWhatsApp = () => {
    if (!transaction.studentPhone) {
      alert('Student phone number is not available.');
      return;
    }
    const text = generateWhatsAppReceiptText(receiptData);
    openWhatsApp(transaction.studentPhone, text);
  };

  const handleCopyText = async () => {
    const text = generateWhatsAppReceiptText(receiptData);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 dark:bg-black/85 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-lg rounded-2xl shadow-2xl space-y-4 my-auto relative border border-slate-200 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#262626] bg-slate-50/50 dark:bg-[#161616]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Official Fee Receipt</h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Receipt #{transaction.receiptNumber || transaction.id.slice(-6)}
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

        {/* Printable Receipt Card */}
        <div className="px-5 py-2">
          <div
            ref={receiptRef}
            id="printable-fee-receipt"
            className="p-5 bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#2c2c2c] shadow-xs space-y-4 relative overflow-hidden"
          >
            {/* Top Library Banner */}
            <div className="flex items-start justify-between border-b border-dashed border-slate-200 dark:border-[#333] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                    {libraryName}
                  </h2>
                </div>
                {libraryAddress && (
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 max-w-xs">{libraryAddress}</p>
                )}
                {libraryPhone && (
                  <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5">Ph: {libraryPhone}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-neutral-500 block">
                  Fee Receipt
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 block mt-0.5">
                  #{transaction.receiptNumber || transaction.id.slice(-6)}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mt-0.5">
                  {formattedDate}
                </span>
              </div>
            </div>

            {/* Student & Seat Details */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#1f1f1f] p-3 rounded-xl">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase block">
                  Student Name
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-xs block mt-0.5">
                  {transaction.studentName || 'Student'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block mt-0.5">
                  {transaction.studentPhone}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase block">
                  Assigned Seat
                </span>
                {transaction.seatNumber ? (
                  <span className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md text-xs mt-0.5">
                    <Armchair className="w-3 h-3" /> Seat {transaction.seatNumber}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs mt-0.5 block">General / Unassigned</span>
                )}
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-1">
                  Mode: {transaction.paymentMode}
                </span>
              </div>
            </div>

            {/* Period / Validity Range if present */}
            <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
              <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Paid For: {transaction.paidForMonth}</span>
              </span>
              {transaction.validFrom && transaction.validTo && (
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {transaction.validFrom} to {transaction.validTo}
                </span>
              )}
            </div>

            {/* Financial Breakdown Table */}
            <div className="border border-slate-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-3 bg-slate-100 dark:bg-[#202020] p-2 font-bold text-[11px] text-slate-600 dark:text-neutral-300">
                <span>Description</span>
                <span className="text-center">{isSettlingDue ? 'Due Amount' : 'Rate / Total'}</span>
                <span className="text-right">Paid</span>
              </div>

              <div className="p-2.5 space-y-1.5 bg-white dark:bg-[#161616]">
                <div className="grid grid-cols-3 items-center">
                  <div className="text-slate-800 dark:text-neutral-200 font-medium truncate">
                    {isSettlingDue ? 'Due Balance Settlement' : 'Library Membership'}
                  </div>
                  <div className="text-center font-bold text-slate-900 dark:text-white">
                    ₹{totalFee.toLocaleString('en-IN')}
                  </div>
                  <div className="text-right font-extrabold text-emerald-700 dark:text-emerald-400">
                    ₹{Number(transaction.amount).toLocaleString('en-IN')}
                  </div>
                </div>

                {remainingFee > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-[#252525] flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      Remaining Balance Due:
                    </span>
                    <span className="font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                      ₹{remainingFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Stamp & Note */}
            <div className="flex items-center justify-between pt-1">
              <div>
                {transaction.notes && (
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 italic">
                    Note: &quot;{transaction.notes}&quot;
                  </p>
                )}
                <p className="text-[9px] text-slate-400 dark:text-neutral-500 mt-1">
                  Computer-generated digital receipt • seeLibrary Study OS
                </p>
              </div>

              <div className="shrink-0">
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider border ${
                    isFullyPaid
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  }`}
                >
                  {isFullyPaid ? 'FULLY PAID ✅' : 'PARTIAL / DUE ⚠️'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-5 pt-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>Send on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Download / Print</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 py-2 bg-slate-100 dark:bg-[#1e1e1e] hover:bg-slate-200 dark:hover:bg-[#282828] text-slate-700 dark:text-neutral-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied WhatsApp Text! ✅' : 'Copy WhatsApp Text'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-slate-200 dark:bg-[#252525] hover:bg-slate-300 dark:hover:bg-[#303030] text-slate-800 dark:text-neutral-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
