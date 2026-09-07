'use client';

import React, { useState } from 'react';
import { Phone, Search, Armchair, Shield, Check, Clock, Plus } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';

export interface StudentFeeRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  seatNumber?: string | null;
  amount: number;
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
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  membershipEndsInDays: number;
  photoUrl?: string | null;
  kycPhotoUrl?: string | null;
  kycDocId?: string;
  kycType?: string;
  monthlyFee?: number;
  transactions?: StudentFeeRecord[];
}

interface StudentListProps {
  students: StudentItem[];
  onAddStudent: () => void;
  onStudentClick?: (student: StudentItem, initialTab?: 'profile' | 'feeHistory' | 'kyc') => void;
  initialFilterTab?: 'ALL' | 'EXPIRING_5_DAYS' | 'FEE_DUE' | 'ACTIVE';
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
}) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'EXPIRING_5_DAYS' | 'FEE_DUE' | 'ACTIVE'>(initialFilterTab);

  React.useEffect(() => {
    if (initialFilterTab) {
      setFilterTab(initialFilterTab);
    }
  }, [initialFilterTab]);

  const expiring5DaysCount = students.filter(
    (s) => s.membershipEndsInDays <= 5 && s.membershipEndsInDays > 0 && s.status !== 'EXPIRED'
  ).length;

  const feeDueCount = students.filter(
    (s) => s.membershipEndsInDays <= 0 || s.status === 'EXPIRED' || !s.monthlyFee || s.monthlyFee === 0
  ).length;

  const activeCount = students.filter(
    (s) => s.membershipEndsInDays > 5 && s.status === 'ACTIVE'
  ).length;

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    if (!matchesSearch) return false;

    if (filterTab === 'EXPIRING_5_DAYS') {
      return s.membershipEndsInDays <= 5 && s.membershipEndsInDays > 0 && s.status !== 'EXPIRED';
    }
    if (filterTab === 'FEE_DUE') {
      return s.membershipEndsInDays <= 0 || s.status === 'EXPIRED' || !s.monthlyFee || s.monthlyFee === 0;
    }
    if (filterTab === 'ACTIVE') {
      return s.membershipEndsInDays > 5 && s.status === 'ACTIVE';
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search & Add Action */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
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
          className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-amber-900">
                {expiring5DaysCount} Student{expiring5DaysCount > 1 ? 's' : ''} Membership Ending in &le; 5 Days
              </h5>
              <p className="text-[11px] text-amber-700">
                Month ending soon. Collect fee to renew validity and prevent seat auto-release.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-200/60 group-hover:bg-amber-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors">
            {filterTab === 'EXPIRING_5_DAYS' ? 'Showing Due' : 'View Due →'}
          </span>
        </div>
      )}

      {/* Filter Chips / Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: 'ALL', label: `All Students (${students.length})` },
          {
            id: 'EXPIRING_5_DAYS',
            label: `Due in 5 Days (${expiring5DaysCount})`,
            alert: expiring5DaysCount > 0,
          },
          {
            id: 'FEE_DUE',
            label: `Fee Due / Expired (${feeDueCount})`,
            danger: feeDueCount > 0,
          },
          { id: 'ACTIVE', label: `Active (${activeCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer text-xs ${
              filterTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : tab.alert
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : tab.danger
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Student List */}
      <div className="space-y-2">
        {filtered.map((student) => (
          <div
            key={student.id}
            onClick={() => onStudentClick?.(student)}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-indigo-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.fullName}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {student.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{student.fullName}</h4>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      student.membershipEndsInDays <= 0 || student.status === 'EXPIRED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : student.membershipEndsInDays <= 5
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {student.membershipEndsInDays <= 0 || student.status === 'EXPIRED'
                      ? 'EXPIRED / FEE DUE'
                      : student.membershipEndsInDays <= 5
                      ? `DUE IN ${student.membershipEndsInDays}D`
                      : 'ACTIVE'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <span>{student.phone}</span>
                  <span>•</span>
                  <span className="truncate max-w-[130px]">{student.studyPurpose || 'General'}</span>
                  <span>•</span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center">
                    {formatShift(student.shift)}
                  </span>
                  <span>•</span>
                  {student.monthlyFee && student.monthlyFee > 0 ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudentClick?.(student, 'feeHistory');
                      }}
                      className="font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[11px] inline-flex items-center cursor-pointer transition-colors"
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
                      className="font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center cursor-pointer transition-colors"
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
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/91${student.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp student"
                  className="w-8 h-8 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                </a>
              </div>

              {/* Seat & Validity */}
              <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[55px]">
                {student.seatNumber ? (
                  <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Armchair className="w-3 h-3" /> {student.seatNumber}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">No seat</span>
                )}
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {student.membershipEndsInDays}d left
                </div>
              </div>
            </div>
          </div>
        ))}

        {students.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Students Enrolled Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mb-4">
              Register students into this study branch, assign shifts, record membership fees, and allocate seats.
            </p>
            <button
              type="button"
              onClick={onAddStudent}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll First Student</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
            No students found matching your search.
          </div>
        ) : null}
      </div>
    </div>
  );
};
