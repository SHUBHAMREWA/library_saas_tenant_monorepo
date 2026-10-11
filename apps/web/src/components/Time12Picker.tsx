'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface Time12PickerProps {
  label: string;
  totalMinutes: number; // 0 to 1440 minutes from midnight
  onChange: (newMinutes: number) => void;
  minMinutes?: number;
}

export function minutesTo12Hour(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const rawHour = Math.floor(normalized / 60); // 0 to 23
  const minute = normalized % 60; // 0 to 59
  const isPM = rawHour >= 12;
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
  return { hour12, minute, isPM };
}

export function twelveHourToMinutes(hour12: number, minute: number, isPM: boolean): number {
  let h24 = hour12 % 12;
  if (isPM) h24 += 12;
  return Math.min(Math.max(h24 * 60 + minute, 0), 1440);
}

export function formatTime12(minutes: number): string {
  const { hour12, minute, isPM } = minutesTo12Hour(minutes);
  const hStr = String(hour12).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  const ampm = isPM ? 'PM' : 'AM';
  return `${hStr}:${mStr} ${ampm}`;
}

export const Time12Picker: React.FC<Time12PickerProps> = ({
  label,
  totalMinutes,
  onChange,
}) => {
  const { hour12, minute, isPM } = minutesTo12Hour(totalMinutes);

  const handleHourChange = (newHour: number) => {
    onChange(twelveHourToMinutes(newHour, minute, isPM));
  };

  const handleMinuteChange = (newMinute: number) => {
    onChange(twelveHourToMinutes(hour12, newMinute, isPM));
  };

  const handleAmPmToggle = (newIsPM: boolean) => {
    onChange(twelveHourToMinutes(hour12, minute, newIsPM));
  };

  // Minutes options in 5-minute increments
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-indigo-500" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.5 rounded tracking-wide">
          {formatTime12(totalMinutes)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2d2d2d] rounded-xl p-1.5 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
        {/* Hour Select */}
        <select
          value={hour12}
          onChange={(e) => handleHourChange(Number(e.target.value))}
          className="bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-[#333] text-xs font-black text-slate-900 dark:text-white px-2 py-1 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
            <option key={h} value={h} className="dark:bg-[#1a1a1a] text-slate-900 dark:text-white">
              {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>

        <span className="text-slate-400 dark:text-neutral-500 font-black text-xs select-none">:</span>

        {/* Minute Select */}
        <select
          value={minuteOptions.includes(minute) ? minute : Math.floor(minute / 5) * 5}
          onChange={(e) => handleMinuteChange(Number(e.target.value))}
          className="bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-[#333] text-xs font-black text-slate-900 dark:text-white px-2 py-1 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m} className="dark:bg-[#1a1a1a] text-slate-900 dark:text-white">
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </select>

        {/* AM / PM Segmented Buttons */}
        <div className="ml-auto flex items-center bg-slate-100 dark:bg-[#252525] p-0.5 rounded-lg border border-slate-200/80 dark:border-[#333]">
          <button
            type="button"
            onClick={() => handleAmPmToggle(false)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
              !isPM
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleAmPmToggle(true)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
              isPM
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
};
