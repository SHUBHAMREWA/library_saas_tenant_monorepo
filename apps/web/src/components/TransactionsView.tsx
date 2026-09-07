'use client';

import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  Search,
  Plus,
  ArrowUpRight,
  ReceiptText,
  Calendar,
  CreditCard,
  User,
  Armchair,
  Filter,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { StudentFeeRecord } from './StudentList';

interface TransactionsViewProps {
  transactions: StudentFeeRecord[];
  onOpenCollectFee: () => void;
  onStudentClick?: (studentId: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onOpenCollectFee,
  onStudentClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');

  // Derive unique months available in transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      if (t.paidForMonth) months.add(t.paidForMonth);
    });
    return Array.from(months);
  }, [transactions]);

  // Statistics calculation
  const totalRevenue = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const currentMonthStr = useMemo(() => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const thisMonthRevenue = useMemo(() => {
    return transactions
      .filter((t) => t.paidForMonth === currentMonthStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions, currentMonthStr]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        (t.studentName && t.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.studentPhone && t.studentPhone.includes(searchQuery)) ||
        (t.receiptNumber && t.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMonth = selectedMonth === 'ALL' || t.paidForMonth === selectedMonth;
      const matchesMode = selectedMode === 'ALL' || t.paymentMode.toUpperCase() === selectedMode.toUpperCase();

      return matchesSearch && matchesMonth && matchesMode;
    });
  }, [transactions, searchQuery, selectedMonth, selectedMode]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
              <ReceiptText className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Fee History & Transactions
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log, track, and monitor all student fee history and payments across this library branch
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCollectFee}
          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Fee Payment</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Collected</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3" /> All-time total
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">This Month</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-indigo-600 mt-1">
            ₹{thisMonthRevenue.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 truncate block">
            {currentMonthStr}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Payments</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ReceiptText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            {transactions.length}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Recorded receipts
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg. Payment</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            ₹{transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Per transaction
          </span>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, phone, receipt number..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Modes</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="NETBANKING">NetBank</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredTransactions.map((tx) => {
          const dateObj = new Date(tx.paymentDate);
          const formattedDate = dateObj.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const formattedTime = dateObj.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={tx.id}
              onClick={() => tx.studentId && onStudentClick?.(tx.studentId)}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-2xs transition-colors cursor-pointer flex items-center justify-between gap-3"
            >
              {/* Left: Student Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {tx.studentName ? tx.studentName.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {tx.studentName || 'Unknown Student'}
                    </h4>
                    {tx.receiptNumber && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{tx.receiptNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{tx.studentPhone}</span>
                    {tx.seatNumber && (
                      <>
                        <span>•</span>
                        <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-0.5">
                          <Armchair className="w-3 h-3" /> Seat {tx.seatNumber}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className="font-medium text-slate-600">{tx.paidForMonth}</span>
                  </div>
                  {tx.notes && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                      Note: {tx.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Amount, Mode & Date */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-base font-extrabold text-emerald-600 flex items-center">
                  +₹{Number(tx.amount).toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tx.paymentMode === 'UPI'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : tx.paymentMode === 'CASH'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {tx.paymentMode}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="p-10 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Transactions Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mb-4">
              {searchQuery || selectedMonth !== 'ALL' || selectedMode !== 'ALL'
                ? 'No fee payment records match your active search filter.'
                : 'Log student membership fee payments to start tracking library collections and monthly revenue history.'}
            </p>
            <button
              type="button"
              onClick={onOpenCollectFee}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Fee Payment</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
