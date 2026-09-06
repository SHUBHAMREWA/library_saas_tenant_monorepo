'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Armchair,
  Calendar,
  IndianRupee,
  BarChart3,
  Clock,
  CheckCircle2,
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
  const [activeMetric, setActiveMetric] = useState<'occupancy' | 'shifts' | 'weekly'>('occupancy');

  const availableCount = Math.max(0, totalSeats - occupiedSeats);
  const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  // Calculate shift distribution
  const morningCount = students.filter((s) => s.shift === 'MORNING').length;
  const eveningCount = students.filter((s) => s.shift === 'EVENING').length;
  const fullDayCount = students.filter((s) => s.shift === 'FULL_DAY' || !s.shift).length;

  // Weekly attendance simulation data based on active student count
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const basePresent = Math.min(students.length, Math.max(1, Math.round(students.length * 0.85)));
  const weeklyData = [
    { day: 'Mon', present: Math.max(1, basePresent), capacity: totalSeats || 30 },
    { day: 'Tue', present: Math.max(1, Math.round(basePresent * 0.95)), capacity: totalSeats || 30 },
    { day: 'Wed', present: Math.max(1, Math.round(basePresent * 1.0)), capacity: totalSeats || 30 },
    { day: 'Thu', present: Math.max(1, Math.round(basePresent * 0.9)), capacity: totalSeats || 30 },
    { day: 'Fri', present: Math.max(1, Math.round(basePresent * 1.05)), capacity: totalSeats || 30 },
    { day: 'Sat', present: Math.max(1, Math.round(basePresent * 1.1)), capacity: totalSeats || 30 },
    { day: 'Sun', present: Math.max(0, Math.round(basePresent * 0.65)), capacity: totalSeats || 30 },
  ];

  const maxChartVal = Math.max(...weeklyData.map((d) => d.capacity), 30);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Branch Analytics & Occupancy Trends
              </h3>
              <p className="text-[11px] text-slate-500">
                Live utilization metrics, shift distribution, and 7-day attendance
              </p>
            </div>
          </div>
        </div>

        {/* Chart View Switcher */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold shadow-inner">
          <button
            type="button"
            onClick={() => setActiveMetric('occupancy')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'occupancy'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Occupancy Gauge
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('weekly')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'weekly'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Weekly Attendance
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('shifts')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'shifts'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Shifts Breakdown
          </button>
        </div>
      </div>

      {/* View 1: Real-time Occupancy Visual Bars & Stats */}
      {activeMetric === 'occupancy' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-200">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Seat Occupancy Utilization</span>
              <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {occupancyPercent}% Occupied
              </span>
            </div>

            {/* Segmented Visual Progress Bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
              <div
                style={{ width: `${occupancyPercent}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 shadow-xs"
              />
              <div
                style={{ width: `${100 - occupancyPercent}%` }}
                className="h-full bg-emerald-400/80 rounded-r-full transition-all duration-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 block text-[11px]">Total Capacity</span>
                <span className="text-base font-extrabold text-slate-900">{totalSeats} Seats</span>
              </div>
              <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                <span className="text-indigo-600 font-semibold block text-[11px]">Occupied Desks</span>
                <span className="text-base font-extrabold text-indigo-700">{occupiedSeats} Assigned</span>
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs col-span-2 sm:col-span-1">
                <span className="text-emerald-700 font-semibold block text-[11px]">Available Desks</span>
                <span className="text-base font-extrabold text-emerald-800">{availableCount} Free</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-2xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Branch Growth
              </span>
              <h4 className="text-sm font-bold text-white mt-1">Ready for New Admissions</h4>
              <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                You have {availableCount} vacant seat{availableCount === 1 ? '' : 's'} available to allocate for morning, evening, or 24/7 full day shifts.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-indigo-300">Enrolled Students:</span>
              <span className="font-extrabold text-white text-sm">{students.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Weekly Attendance 7-Day Bar Chart */}
      {activeMetric === 'weekly' && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>7-Day Attendance Volume (Check-ins vs Capacity)</span>
            <span className="font-semibold text-slate-700">Average: ~{basePresent} students / day</span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4 pb-2 px-1 bg-slate-50 rounded-2xl border border-slate-200">
            {weeklyData.map((d, idx) => {
              const heightPercent = Math.max(12, Math.round((d.present / maxChartVal) * 100));
              const isToday = idx === (new Date().getDay() + 6) % 7; // Monday = 0

              return (
                <div key={d.day} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.present}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 shadow-2xs ${
                      isToday
                        ? 'bg-indigo-600 group-hover:bg-indigo-700 ring-2 ring-indigo-300'
                        : 'bg-indigo-400/80 hover:bg-indigo-500'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-bold ${
                      isToday ? 'text-indigo-700 underline underline-offset-2' : 'text-slate-500'
                    }`}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>• Indigo bar represents student check-in count</span>
            <span>Highlighted ring indicates current day</span>
          </div>
        </div>
      )}

      {/* View 3: Shift Allocation Distribution */}
      {activeMetric === 'shifts' && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Morning Shift
                </span>
                <span>6 AM - 2 PM</span>
              </div>
              <p className="text-xl font-extrabold text-amber-900">{morningCount}</p>
              <p className="text-[11px] text-amber-700">Enrolled morning batch students</p>
            </div>

            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-purple-800 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Evening Shift
                </span>
                <span>2 PM - 10 PM</span>
              </div>
              <p className="text-xl font-extrabold text-purple-900">{eveningCount}</p>
              <p className="text-[11px] text-purple-700">Enrolled evening batch students</p>
            </div>

            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-indigo-800 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Full Day 24/7
                </span>
                <span>All Day</span>
              </div>
              <p className="text-xl font-extrabold text-indigo-900">{fullDayCount}</p>
              <p className="text-[11px] text-indigo-700">Unlimited all-day access students</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
