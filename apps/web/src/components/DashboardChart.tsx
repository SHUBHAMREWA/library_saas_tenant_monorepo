'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Armchair,
  PieChart,
  Clock,
  Sparkles,
} from 'lucide-react';
import { StudentItem } from './StudentList';
import { VisualSeatItem } from './SeatGrid';

interface DashboardChartProps {
  students: StudentItem[];
  seats: VisualSeatItem[];
  totalSeats: number;
  occupiedSeats: number;
}

export const DashboardChart: React.FC<DashboardChartProps> = ({
  students,
  seats,
  totalSeats,
  occupiedSeats,
}) => {
  const [activeMetric, setActiveMetric] = useState<'occupancy' | 'shifts'>('occupancy');

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

  // Geometry for Donut / Pie chart (Radius = 58, Center = 80, 80, Circumference = 2 * PI * 58 ~= 364.42)
  const RADIUS = 58;
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

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs p-4 sm:p-5 space-y-4 transition-colors">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#262626] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-2xs">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Branch Analytics & Distribution
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#a8a8a8]">
              Interactive seat occupancy pie & shift turnover visualization
            </p>
          </div>
        </div>

        {/* Chart View Switcher */}
        <div className="inline-flex bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl self-start sm:self-auto text-xs font-bold border dark:border-[#262626]">
          <button
            type="button"
            onClick={() => setActiveMetric('occupancy')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMetric === 'occupancy'
                ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Occupancy Pie</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('shifts')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMetric === 'shifts'
                ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-[#a8a8a8] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Shifts Breakdown</span>
          </button>
        </div>
      </div>

      {/* View 1: Real-time Occupancy Pie Chart & Stats */}
      {activeMetric === 'occupancy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1 items-center animate-in fade-in duration-200">
          {/* Main Pie Chart & Legend Column */}
          <div className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-6 bg-slate-50/70 dark:bg-[#181818] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#262626]">
            {/* SVG Donut / Pie Chart */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
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
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                  </filter>
                </defs>

                {/* Background Ring Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="22"
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
                    strokeWidth="20"
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
                        strokeWidth="22"
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
                        strokeWidth="22"
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
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
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
            <div className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Available Desks</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373] font-medium">Ready for allotment</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">{availableCount} Free</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{availablePercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-indigo-600 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Occupied Desks</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373] font-medium">Assigned to students</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block">{occupiedSeats} Assigned</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{occupancyPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#202022] text-xs text-slate-600 dark:text-[#a8a8a8] font-semibold border dark:border-[#262626]">
                <span className="flex items-center gap-1.5">
                  <Armchair className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
                  Total Capacity
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{totalSeats} Desks</span>
              </div>
            </div>
          </div>

          {/* Right Card: Growth & Utilization Callout */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-5 rounded-2xl flex flex-col justify-between shadow-xs h-full min-h-[190px] border border-indigo-900/50 dark:border-[#262626]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Branch Growth
              </span>
              <h4 className="text-sm font-bold text-white mt-1">Ready for Admissions</h4>
              <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                {availableCount > 0 ? (
                  <>
                    You have <span className="text-emerald-400 font-bold">{availableCount} vacant seat{availableCount === 1 ? '' : 's'}</span> available to allocate across morning, evening, or full-day batches.
                  </>
                ) : (
                  <>
                    All seats are currently allocated! Add more halls or desks to expand capacity.
                  </>
                )}
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs mt-3">
              <span className="text-indigo-300">Enrolled Students:</span>
              <span className="font-extrabold text-white text-sm bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                {students.length} Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Shift Allocation Distribution Pie Chart */}
      {activeMetric === 'shifts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1 items-center animate-in fade-in duration-200">
          {/* Main Shifts Pie Chart & Legend */}
          <div className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-6 bg-slate-50/70 dark:bg-[#181818] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#262626]">
            {/* SVG Donut for Shifts */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
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
                  strokeWidth="22"
                  className="text-slate-200 dark:text-[#262626] opacity-70"
                />

                {totalShiftStudents === 0 ? (
                  <circle
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="20"
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
                        strokeWidth="22"
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
                        strokeWidth="22"
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
                        strokeWidth="22"
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
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {totalShiftStudents}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#737373] mt-1">
                  Students
                </span>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  3 Shift Types
                </span>
              </div>
            </div>

            {/* Shift Breakdown Cards */}
            <div className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-amber-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Morning Shift</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373] font-medium">6:00 AM - 2:00 PM</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 block">{morningCount}</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{morningPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-purple-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Evening Shift</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373] font-medium">2:00 PM - 10:00 PM</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-purple-600 dark:text-purple-400 block">{eveningCount}</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{eveningPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-[#262626] shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-blue-500 shadow-xs shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Full Day 24/7</h4>
                    <p className="text-[10px] text-slate-400 dark:text-[#737373] font-medium">Unlimited All Day</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400 block">{fullDayCount}</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#737373]">{fullDayPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Shift Turnover Highlights */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white p-5 rounded-2xl flex flex-col justify-between shadow-xs h-full min-h-[190px] border border-purple-900/40 dark:border-[#262626]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Turnover System
              </span>
              <h4 className="text-sm font-bold text-white mt-1">Multi-Shift Optimization</h4>
              <p className="text-xs text-purple-200/80 mt-1 leading-relaxed">
                Study centers can allocate the same seat to morning and evening students separately to double your seat revenue per desk.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs mt-3">
              <span className="text-purple-300">Shift Diversity:</span>
              <span className="font-extrabold text-white text-sm bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                {nonZeroShifts} Active Shifts
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
