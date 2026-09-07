'use client';

import React, { useState } from 'react';
import { Phone, Search, Armchair, Shield, Check, Clock, Plus, Bell } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { generateWhatsAppFeeReminderText } from '@/lib/receipt-utils';

export interface StudentFeeRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  seatNumber?: string | null;
  amount: number;
  totalFee?: number;
  remainingFee?: number;
  validFrom?: string;
  validTo?: string;
  paidForMonth: string;
  paymentDate: string;
  paymentMode: string;
  status: string;
  receiptNumber?: string;
  notes?: string;
}

export interface StudentItem {
  id: string;
  fullName: string;
  phone: string;
  studyPurpose?: string;
  shift: string;
  seatNumber?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'INACTIVE';
  membershipEndsInDays: number;
  photoUrl?: string | null;
  kycPhotoUrl?: string | null;
  kycDocId?: string;
  kycType?: string;
  monthlyFee?: number;
  totalFee?: number;
  remainingFee?: number;
  transactions?: StudentFeeRecord[];
}

export type StudentFilterTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'FEE_DUE' | 'EXPIRING_5_DAYS';

interface StudentListProps {
  students: StudentItem[];
  onAddStudent: () => void;
  onStudentClick?: (student: StudentItem, initialTab?: 'profile' | 'feeHistory' | 'kyc') => void;
  initialFilterTab?: StudentFilterTab;
  libraryName?: string;
  libraryPhone?: string;
}

export const formatShift = (shift?: string): string => {
  if (!shift) return 'Full Day';
  switch (shift.toUpperCase()) {
    case 'FOUR_HOURS':
      return '4 Hours';
    case 'HALF_DAY':
      return 'Half Day';
    case 'FULL_DAY':
      return 'Full Day';
    case 'MORNING':
      return 'Morning';
    case 'EVENING':
      return 'Evening';
    case 'NIGHT':
      return 'Night';
    default:
      return shift;
  }
};

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onAddStudent,
  onStudentClick,
  initialFilterTab = 'ALL',
  libraryName,
  libraryPhone,
}) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<StudentFilterTab>(initialFilterTab);

  React.useEffect(() => {
    if (initialFilterTab) {
      setFilterTab(initialFilterTab);
    }
  }, [initialFilterTab]);

  // Inactive students: admitted but no seat allocated yet
  const inactiveCount = students.filter(
    (s) => !s.seatNumber || s.status === 'INACTIVE'
  ).length;

  // Active students: students with a seat allocated (membership active)
  const activeCount = students.filter(
    (s) => Boolean(s.seatNumber) && s.status !== 'INACTIVE'
  ).length;

  // Fee due: students with an allocated seat whose fee is unpaid / expired / pending
  const feeDueCount = students.filter(
    (s) =>
      Boolean(s.seatNumber) &&
      (s.membershipEndsInDays <= 0 ||
        s.status === 'EXPIRED' ||
        !s.monthlyFee ||
        s.monthlyFee === 0 ||
        Boolean(s.remainingFee && s.remainingFee > 0))
  ).length;

  // Expiring in next 5 days: students with an allocated seat expiring soon
  const expiring5DaysCount = students.filter(
    (s) =>
      Boolean(s.seatNumber) &&
      s.membershipEndsInDays <= 5 &&
      s.membershipEndsInDays > 0 &&
      s.status !== 'EXPIRED'
  ).length;

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    if (!matchesSearch) return false;

    const isNoSeat = !s.seatNumber || s.status === 'INACTIVE';

    if (filterTab === 'INACTIVE') {
      return isNoSeat;
    }
    if (filterTab === 'ACTIVE') {
      // Active seat holders (including those with fees due as per requirements)
      return !isNoSeat;
    }
    if (filterTab === 'FEE_DUE') {
      return (
        !isNoSeat &&
        (s.membershipEndsInDays <= 0 ||
          s.status === 'EXPIRED' ||
          !s.monthlyFee ||
          s.monthlyFee === 0 ||
          Boolean(s.remainingFee && s.remainingFee > 0))
      );
    }
    if (filterTab === 'EXPIRING_5_DAYS') {
      return (
        !isNoSeat &&
        s.membershipEndsInDays <= 5 &&
        s.membershipEndsInDays > 0 &&
        s.status !== 'EXPIRED'
      );
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search & Add Action */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#737373] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>
        <button
          type="button"
          onClick={onAddStudent}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Due in 5 Days Alert Banner */}
      {expiring5DaysCount > 0 && (
        <div
          onClick={() => setFilterTab(filterTab === 'EXPIRING_5_DAYS' ? 'ALL' : 'EXPIRING_5_DAYS')}
          className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-950/50 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {expiring5DaysCount} Student{expiring5DaysCount > 1 ? 's' : ''} Membership Ending in &le; 5 Days
              </h5>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Month ending soon. Collect fee to renew validity and prevent seat auto-release.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 group-hover:bg-amber-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors">
            {filterTab === 'EXPIRING_5_DAYS' ? 'Showing Due' : 'View Due →'}
          </span>
        </div>
      )}

      {/* Filter Chips / Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: 'ALL', label: `All Students (${students.length})` },
          { id: 'ACTIVE', label: `Active (${activeCount})` },
          {
            id: 'INACTIVE',
            label: `Inactive Students (${inactiveCount})`,
            inactive: inactiveCount > 0,
          },
          {
            id: 'FEE_DUE',
            label: `Fee Due (${feeDueCount})`,
            danger: feeDueCount > 0,
          },
          {
            id: 'EXPIRING_5_DAYS',
            label: `Due in 5 Days (${expiring5DaysCount})`,
            alert: expiring5DaysCount > 0,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs ${
              filterTab === tab.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                : tab.danger
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                : tab.alert
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                : tab.inactive
                ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-neutral-300 border border-slate-300/80 dark:border-[#333333] hover:bg-slate-200/70 dark:hover:bg-[#222222]'
                : 'bg-white dark:bg-[#121212] text-slate-600 dark:text-[#a8a8a8] border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#1a1a1a] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Student List */}
      <div className="space-y-2">
        {filtered.map((student) => {
          const isNoSeat = !student.seatNumber || student.status === 'INACTIVE';
          const isStudentFeeDue =
            !isNoSeat &&
            (student.membershipEndsInDays <= 0 ||
              student.status === 'EXPIRED' ||
              !student.monthlyFee ||
              Boolean(student.remainingFee && student.remainingFee > 0));

          return (
            <div
              key={student.id}
              onClick={() => onStudentClick?.(student)}
              className="bg-white dark:bg-[#121212] p-3.5 rounded-xl border border-slate-200 dark:border-[#262626] shadow-xs flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50/50 dark:hover:bg-[#181818] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.fullName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-[#262626]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1e1e1e] text-slate-700 dark:text-[#f5f5f5] font-bold flex items-center justify-center text-sm shrink-0">
                    {student.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{student.fullName}</h4>
                    {isNoSeat ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#222222] text-slate-700 dark:text-neutral-300 border border-slate-300/80 dark:border-[#333333]">
                        INACTIVE (NO SEAT)
                      </span>
                    ) : student.remainingFee && student.remainingFee > 0 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        DUE: ₹{student.remainingFee}
                      </span>
                    ) : student.membershipEndsInDays <= 0 || student.status === 'EXPIRED' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        FEE DUE
                      </span>
                    ) : student.membershipEndsInDays <= 5 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        DUE IN {student.membershipEndsInDays}D
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-[#a8a8a8] mt-0.5">
                    <span>{student.phone}</span>
                    <span>•</span>
                    <span className="truncate max-w-[130px]">{student.studyPurpose || 'General'}</span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center">
                      {formatShift(student.shift)}
                    </span>
                    <span>•</span>
                    {isNoSeat ? (
                      <span className="font-semibold text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] px-1.5 py-0.5 rounded text-[10px] inline-flex items-center">
                        Admission Recorded
                      </span>
                    ) : student.remainingFee && student.remainingFee > 0 ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick?.(student, 'feeHistory');
                        }}
                        className="font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                        title="Remaining fee due - click to collect fee"
                      >
                        Due: ₹{student.remainingFee}
                      </span>
                    ) : student.monthlyFee && student.monthlyFee > 0 ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick?.(student, 'feeHistory');
                        }}
                        className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 px-1.5 py-0.5 rounded text-[11px] inline-flex items-center cursor-pointer transition-colors"
                        title="Click to view fee history"
                      >
                        ₹{student.monthlyFee}/mo
                      </span>
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick?.(student, 'feeHistory');
                        }}
                        className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
                        title="Fee due - click to view history & collect fee"
                      >
                        Fee Due
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* WhatsApp & Call Quick Actions */}
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={`tel:${student.phone}`}
                    title="Call student"
                    className="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1a1a1a] hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-600 dark:text-[#a8a8a8] hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  {(() => {
                    const reminderText = isStudentFeeDue
                      ? generateWhatsAppFeeReminderText({
                          libraryName: libraryName || 'seeLibrary Study Center',
                          libraryPhone,
                          studentName: student.fullName,
                          studentPhone: student.phone,
                          seatNumber: student.seatNumber,
                          shift: formatShift(student.shift),
                          dueAmount:
                            student.remainingFee && student.remainingFee > 0
                              ? student.remainingFee
                              : student.monthlyFee,
                          paidForMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                        })
                      : '';

                    const waHref = isStudentFeeDue
                      ? `https://wa.me/91${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(reminderText)}`
                      : `https://wa.me/91${student.phone.replace(/\D/g, '')}`;

                    return (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          isStudentFeeDue
                            ? `Send Fee Reminder on WhatsApp to ${student.fullName}`
                            : `WhatsApp ${student.fullName}`
                        }
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer relative ${
                          isStudentFeeDue
                            ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300'
                            : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <WhatsAppIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        {isStudentFeeDue && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5 ring-2 ring-white dark:ring-[#121212]" />
                        )}
                      </a>
                    );
                  })()}
                </div>

                {/* Seat & Validity */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[70px]">
                  {student.seatNumber ? (
                    <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Armchair className="w-3 h-3" /> {student.seatNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 px-1.5 py-0.5 rounded-md">
                      No Seat
                    </span>
                  )}
                  {isNoSeat ? (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-[#737373]">
                      Pending Seat
                    </span>
                  ) : (
                    <div className="text-[11px] text-slate-400 dark:text-[#737373] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {student.membershipEndsInDays}d left
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {students.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/70 dark:bg-[#121212] rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#262626] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Students Enrolled Yet</h4>
            <p className="text-xs text-slate-500 dark:text-[#a8a8a8] mt-1 max-w-xs mb-4">
              Register students into this study branch, assign shifts, record membership fees, and allocate seats.
            </p>
            <button
              type="button"
              onClick={onAddStudent}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll First Student</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] text-slate-500 dark:text-[#a8a8a8] text-sm">
            {filterTab === 'INACTIVE'
              ? 'No inactive students. All enrolled students have been assigned seats!'
              : filterTab === 'ACTIVE'
              ? 'No active students with allocated seats found.'
              : filterTab === 'FEE_DUE'
              ? 'No students with fee dues or expired memberships.'
              : 'No students found matching your search.'}
          </div>
        ) : null}
      </div>
    </div>
  );
};
