'use client';

import React, { useState } from 'react';
import { Search, CheckCircle2, LogIn, LogOut, Clock, Armchair, Users } from 'lucide-react';

export interface RosterItem {
  studentId: string;
  studentName: string;
  phone: string;
  seatNumber?: string | null;
  shift: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  isPresent: boolean;
}

interface AttendanceRosterProps {
  roster: RosterItem[];
  onToggleAttendance: (studentId: string, currentPresent: boolean) => void;
}

export const AttendanceRoster: React.FC<AttendanceRosterProps> = ({
  roster,
  onToggleAttendance,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');

  const presentCount = roster.filter((r) => r.isPresent).length;
  const absentCount = roster.length - presentCount;

  const filtered = roster.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search) ||
      (item.seatNumber && item.seatNumber.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'PRESENT') return item.isPresent;
    if (filter === 'ABSENT') return !item.isPresent;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 font-semibold block">Present Today</span>
            <span className="text-xl font-bold text-emerald-950">{presentCount}</span>
          </div>
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 font-semibold block">Not Checked In</span>
            <span className="text-xl font-bold text-slate-800">{absentCount}</span>
          </div>
          <div className="p-2 bg-slate-200 rounded-lg text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or seat..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs self-start">
          {(['ALL', 'PRESENT', 'ABSENT'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filter === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? `All (${roster.length})` : tab === 'PRESENT' ? `Present (${presentCount})` : `Absent (${absentCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Items */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <div
            key={item.studentId}
            className={`p-3.5 rounded-xl border transition-all shadow-xs flex items-center justify-between ${
              item.isPresent ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                  item.isPresent ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.studentName.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-900 text-sm">{item.studentName}</h4>
                  {item.seatNumber && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Armchair className="w-2.5 h-2.5" /> {item.seatNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{item.shift}</span>
                  {item.checkInTime && (
                    <>
                      <span>•</span>
                      <span suppressHydrationWarning className="text-emerald-700 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> In: {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* One-Touch Check-in / Check-out Button */}
            <button
              type="button"
              onClick={() => onToggleAttendance(item.studentId, item.isPresent)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                item.isPresent
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {item.isPresent ? (
                <>
                  <LogOut className="w-3.5 h-3.5" /> Check Out
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" /> Check In
                </>
              )}
            </button>
          </div>
        ))}

        {roster.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Attendance Records Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Once students are registered in this branch, their daily 1-touch check-in buttons will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
            No students matching the filter.
          </div>
        ) : null}
      </div>
    </div>
  );
};
