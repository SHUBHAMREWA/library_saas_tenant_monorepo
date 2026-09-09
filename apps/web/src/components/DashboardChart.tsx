'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Armchair,
  PieChart,
  Clock,
  Sparkles,
  IndianRupee,
  CreditCard,
  Banknote,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { StudentItem, StudentFeeRecord, MONTH_NAMES } from './StudentList';
import { VisualSeatItem } from './SeatGrid';

export interface DashboardChartRoom {
  id: string;
  name: string;
  rows: string[];
}

interface DashboardChartProps {
  students: StudentItem[];
  seats: VisualSeatItem[];
  totalSeats: number;
  occupiedSeats: number;
  transactions?: StudentFeeRecord[];
  rooms?: DashboardChartRoom[];
  onNavigateTab?: (tab: 'home' | 'seats' | 'students' | 'transactions' | 'more') => void;
  onOpenCollectFee?: () => void;
}

export const DashboardChart: React.FC<DashboardChartProps> = ({
  students,
  seats,
  totalSeats,
  occupiedSeats,
  transactions = [],
  rooms = [],
  onNavigateTab,
  onOpenCollectFee,
}) => {
  const [activeMetric, setActiveMetric] = useState<'occupancy' | 'revenue' | 'shifts'>('occupancy');

  const availableCount = Math.max(0, totalSeats - occupiedSeats);
  const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  const availablePercent = totalSeats > 0 ? 100 - occupancyPercent : 0;

  // Calculate shift distribution
  const morningCount = students.filter((s) => s.shift === 'MORNING').length;
  const eveningCount = students.filter((s) => s.shift === 'EVENING').length;
  const fullDayCount = students.filter((s) => s.shift === 'FULL_DAY' || !s.shift).length;
  const totalShiftStudents = students.length;

  const morningPercent = totalShiftStudents > 0 ? Math.round((morningCount / totalShiftStudents) * 100) : 0;
  const eveningPercent = totalShiftStudents > 0 ? Math.round((eveningCount / totalShiftStudents) * 100) : 0;
  const fullDayPercent = totalShiftStudents > 0 ? Math.max(0, 100 - morningPercent - eveningPercent) : 0;

  // Geometry for Donut / Pie chart (Radius = 56, Center = 80, 80, Circumference = 2 * PI * 56 ~= 351.85)
  const RADIUS = 56;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  // Occupancy slice calculations
  const hasMultipleOccupancySlices = totalSeats > 0 && occupiedSeats > 0 && availableCount > 0;
  const occGap = hasMultipleOccupancySlices ? 3 : 0;
  const occupiedArc = totalSeats > 0 ? Math.max(0, (occupiedSeats / totalSeats) * CIRCUMFERENCE - occGap) : 0;
  const availableArc = totalSeats > 0 ? Math.max(0, (availableCount / totalSeats) * CIRCUMFERENCE - occGap) : 0;

  // Shifts slice calculations
  const nonZeroShifts = [morningCount, eveningCount, fullDayCount].filter((c) => c > 0).length;
  const shiftGap = nonZeroShifts > 1 ? 3 : 0;
  const morningArc = totalShiftStudents > 0 && morningCount > 0 ? Math.max(0, (morningCount / totalShiftStudents) * CIRCUMFERENCE - shiftGap) : 0;
  const eveningArc = totalShiftStudents > 0 && eveningCount > 0 ? Math.max(0, (eveningCount / totalShiftStudents) * CIRCUMFERENCE - shiftGap) : 0;
  const fullDayArc = totalShiftStudents > 0 && fullDayCount > 0 ? Math.max(0, (fullDayCount / totalShiftStudents) * CIRCUMFERENCE - shiftGap) : 0;

  const morningOffset = 0;
  const eveningOffset = -(morningCount > 0 ? (morningCount / totalShiftStudents) * CIRCUMFERENCE : 0);
  const fullDayOffset = -(
    ((morningCount > 0 ? morningCount : 0) + (eveningCount > 0 ? eveningCount : 0)) /
    (totalShiftStudents || 1) *
    CIRCUMFERENCE
  );

  // Revenue analytics
  const revenueStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let thisMonthTotal = 0;
    let totalCollectedAllTime = 0;
    let upiTotal = 0;
    let cashTotal = 0;

    // Monthly breakdown for last 6 months
    const monthlyMap: Record<string, { label: string; amount: number; isCurrent: boolean }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const shortName = d.toLocaleDateString('en-US', { month: 'short' });
      monthlyMap[key] = {
        label: `${shortName}`,
        amount: 0,
        isCurrent: i === 0,
      };
    }

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      totalCollectedAllTime += amt;

      const mode = (tx.paymentMode || '').toUpperCase();
      if (mode === 'UPI' || mode === 'ONLINE') {
        upiTotal += amt;
      } else {
        cashTotal += amt;
      }

      if (tx.paymentDate) {
        const txDate = new Date(tx.paymentDate);
        if (!isNaN(txDate.getTime())) {
          const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyMap[key]) {
            monthlyMap[key].amount += amt;
          }
          if (txDate.getFullYear() === currentYear && txDate.getMonth() + 1 === currentMonth) {
            thisMonthTotal += amt;
          }
        }
      }
    });

    const monthlyBars = Object.values(monthlyMap);
    const maxMonthlyAmt = Math.max(...monthlyBars.map((b) => b.amount), 1000);

    // Calculate pending dues from students
    let totalPendingDues = 0;
    let studentsWithDueCount = 0;
    students.forEach((s) => {
      const due = Number(s.remainingFee) || 0;
      if (due > 0) {
        totalPendingDues += due;
        studentsWithDueCount++;
      }
    });

    const upiPercent = totalCollectedAllTime > 0 ? Math.round((upiTotal / totalCollectedAllTime) * 100) : 0;
    const cashPercent = totalCollectedAllTime > 0 ? 100 - upiPercent : 0;

    return {
      thisMonthTotal,
      totalCollectedAllTime,
      totalPendingDues,
      studentsWithDueCount,
      upiTotal,
      cashTotal,
      upiPercent,
      cashPercent,
      monthlyBars,
      maxMonthlyAmt,
    };
  }, [transactions, students]);

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200/90 dark:border-[#262626] shadow-xs p-4 sm:p-5 space-y-4 transition-all">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#262626] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-2xs">
            {activeMetric === 'occupancy' ? (
              <PieChart className="w-4 h-4" />
            ) : activeMetric === 'revenue' ? (
              <IndianRupee className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Branch Analytics & Insights
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#a8a8a8]">
              Live occupancy, collection revenue & shift optimization
            </p>
          </div>
        </div>

        {/* 3-Way Chart Switcher */}
        <div className="inline-flex bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl self-start sm:self-auto text-xs font-bold border dark:border-[#262626]">
          <button
            type="button"
            onClick={() => setActiveMetric('occupancy')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMetric === 'occupancy'
                ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-xs font-black'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Occupancy</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMetric === 'revenue'
                ? 'bg-white dark:bg-[#262626] text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Revenue</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('shifts')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMetric === 'shifts'
                ? 'bg-white dark:bg-[#262626] text-purple-700 dark:text-purple-300 shadow-xs font-black'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Shifts</span>
          </button>
        </div>
      </div>

      {/* View 1: Real-time Occupancy Pie Chart & Stats */}
      {activeMetric === 'occupancy' && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/70 dark:bg-[#181818] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#262626]">
            {/* SVG Donut / Pie Chart */}
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="occupiedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="availableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <filter id="pieGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                  </filter>
                </defs>

                {/* Background Ring Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-slate-200 dark:text-[#262626] opacity-70"
                />

                {/* If zero total seats, show empty dashed track */}
                {totalSeats === 0 ? (
                  <circle
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="18"
                    strokeDasharray="6 6"
                    className="text-slate-300 dark:text-[#363636]"
                  />
                ) : (
                  <>
                    {/* Available Slice */}
                    {availableCount > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r={RADIUS}
                        fill="none"
                        stroke="url(#availableGrad)"
                        strokeWidth="20"
                        strokeDasharray={
                          occupiedSeats === 0
                            ? `${CIRCUMFERENCE} 0`
                            : `${availableArc} ${CIRCUMFERENCE}`
                        }
                        strokeDashoffset={
                          occupiedSeats === 0 ? 0 : -((occupiedSeats / totalSeats) * CIRCUMFERENCE)
                        }
                        filter="url(#pieGlow)"
                        className="transition-all duration-700 ease-out"
                      />
                    )}

                    {/* Occupied Slice */}
                    {occupiedSeats > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r={RADIUS}
                        fill="none"
                        stroke="url(#occupiedGrad)"
                        strokeWidth="20"
                        strokeDasharray={
                          availableCount === 0
                            ? `${CIRCUMFERENCE} 0`
                            : `${occupiedArc} ${CIRCUMFERENCE}`
                        }
                        strokeDashoffset={0}
                        filter="url(#pieGlow)"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </>
                )}
              </svg>

              {/* Centered Donut Metric Card */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {occupancyPercent}%
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#737373] mt-1">
                  Occupancy
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {occupiedSeats}/{totalSeats}
                </span>
              </div>
            </div>

            {/* Interactive Stat Cards & Legend */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-emerald-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Available Desks</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373]">Ready for allotment</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">{availableCount} Free</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{availablePercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-indigo-600 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Occupied Desks</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373]">Active students</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">{occupiedSeats} Assigned</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{occupancyPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-[#202022] text-xs text-slate-600 dark:text-[#a8a8a8] font-semibold border dark:border-[#262626]">
                <span className="flex items-center gap-1.5">
                  <Armchair className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
                  Total Capacity
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{totalSeats} Desks</span>
              </div>
            </div>
          </div>

          {/* Mini Study Hall Capacity Bar */}
          {rooms.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-[#161616] rounded-xl border border-slate-200/70 dark:border-[#262626] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Hall Occupancy Breakdown
                </span>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('seats')}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center"
                  >
                    <span>View Layout</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {rooms.slice(0, 3).map((rm) => {
                  const rmSeats = seats.filter(
                    (s) =>
                      s.roomId === rm.id ||
                      (rm.rows && rm.rows.some((r) => r.toLowerCase().trim() === (s.rowName || '').toLowerCase().trim()))
                  );
                  const rmOcc = rmSeats.filter((s) => s.status === 'OCCUPIED').length;
                  const rmPct = rmSeats.length > 0 ? Math.round((rmOcc / rmSeats.length) * 100) : 0;
                  return (
                    <div key={rm.id} className="p-2 rounded-lg bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#222] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white truncate text-[11px]">{rm.name}</span>
                        <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">{rmPct}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-[#262626] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${rmPct}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-neutral-500">{rmOcc}/{rmSeats.length} seats</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 2: Monthly Fee Collections & Revenue Breakdown */}
      {activeMetric === 'revenue' && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
          <div className="bg-slate-50/70 dark:bg-[#181818] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Monthly Fee Collections (Last 6 Months)
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-[#737373]">
                  Fee collection trends across billing periods
                </p>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
                ₹{revenueStats.thisMonthTotal.toLocaleString('en-IN')} this month
              </span>
            </div>

            {/* 6-Month Visual Bars */}
            <div className="grid grid-cols-6 gap-2 pt-6 pb-1 items-end h-32 border-b border-slate-200 dark:border-[#262626]">
              {revenueStats.monthlyBars.map((bar, idx) => {
                const heightPct = Math.max(10, Math.round((bar.amount / revenueStats.maxMonthlyAmt) * 100));
                return (
                  <div key={idx} className="relative flex flex-col items-center gap-1.5 h-full justify-end group">
                    {/* Hover Rupee Tooltip - lifted cleanly above the bar */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-20 whitespace-nowrap">
                      <div className="px-1.5 py-0.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black shadow-md flex items-center gap-0.5">
                        <span>₹{bar.amount > 999 ? `${(bar.amount / 1000).toFixed(1)}k` : bar.amount}</span>
                      </div>
                      {/* Tooltip caret / arrow */}
                      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
                    </div>

                    <div className="w-full max-w-[28px] bg-slate-200 dark:bg-[#262626] rounded-t-md relative flex items-end overflow-hidden h-full">
                      <div
                        className={`w-full rounded-t-md transition-all duration-700 ${
                          bar.isCurrent
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-xs'
                            : 'bg-gradient-to-t from-indigo-500 to-indigo-400 dark:from-indigo-600 dark:to-indigo-500 opacity-80 group-hover:opacity-100'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        bar.isCurrent
                          ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                          : 'text-slate-400 dark:text-neutral-500'
                      }`}
                    >
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Payment Mode Ratio Bar & Totals */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
              <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  UPI / Online: <b>{revenueStats.upiPercent}%</b>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  Cash: <b>{revenueStats.cashPercent}%</b>
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                Lifetime: <b className="text-slate-900 dark:text-white">₹{revenueStats.totalCollectedAllTime.toLocaleString('en-IN')}</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Shift Allocation Distribution Pie Chart */}
      {activeMetric === 'shifts' && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/70 dark:bg-[#181818] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#262626]">
            {/* SVG Donut for Shifts */}
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="morningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="eveningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="fullDayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-slate-200 dark:text-[#262626] opacity-70"
                />

                {totalShiftStudents === 0 ? (
                  <circle
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="18"
                    strokeDasharray="6 6"
                    className="text-slate-300 dark:text-[#363636]"
                  />
                ) : (
                  <>
                    {/* Morning Slice */}
                    {morningCount > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r={RADIUS}
                        fill="none"
                        stroke="url(#morningGrad)"
                        strokeWidth="20"
                        strokeDasharray={
                          nonZeroShifts === 1
                            ? `${CIRCUMFERENCE} 0`
                            : `${morningArc} ${CIRCUMFERENCE}`
                        }
                        strokeDashoffset={morningOffset}
                        className="transition-all duration-700 ease-out"
                      />
                    )}

                    {/* Evening Slice */}
                    {eveningCount > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r={RADIUS}
                        fill="none"
                        stroke="url(#eveningGrad)"
                        strokeWidth="20"
                        strokeDasharray={
                          nonZeroShifts === 1
                            ? `${CIRCUMFERENCE} 0`
                            : `${eveningArc} ${CIRCUMFERENCE}`
                        }
                        strokeDashoffset={eveningOffset}
                        className="transition-all duration-700 ease-out"
                      />
                    )}

                    {/* Full Day Slice */}
                    {fullDayCount > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r={RADIUS}
                        fill="none"
                        stroke="url(#fullDayGrad)"
                        strokeWidth="20"
                        strokeDasharray={
                          nonZeroShifts === 1
                            ? `${CIRCUMFERENCE} 0`
                            : `${fullDayArc} ${CIRCUMFERENCE}`
                        }
                        strokeDashoffset={fullDayOffset}
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </>
                )}
              </svg>

              {/* Centered Donut Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {totalShiftStudents}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#737373] mt-1">
                  Students
                </span>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  3 Shift Batches
                </span>
              </div>
            </div>

            {/* Shift Breakdown Cards */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-amber-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Morning Shift</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373]">6:00 AM - 2:00 PM</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 block">{morningCount} Students</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{morningPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-purple-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Evening Shift</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373]">2:00 PM - 10:00 PM</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-purple-600 dark:text-purple-400 block">{eveningCount} Students</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{eveningPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-blue-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Full Day 24/7</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373]">Unlimited Access</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">{fullDayCount} Students</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{fullDayPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

