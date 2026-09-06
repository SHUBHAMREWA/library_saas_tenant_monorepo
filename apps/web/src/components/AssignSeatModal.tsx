'use client';

import React, { useState } from 'react';
import { X, Search, UserCheck, UserPlus, Armchair, CheckCircle2, User } from 'lucide-react';
import { StudentItem } from './StudentList';

interface SeatInfo {
  id: string;
  seatNumber: string;
  rowName?: string;
  studentName?: string | null;
}

interface AssignSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  seat: SeatInfo | null;
  students: StudentItem[];
  onAssign: (studentId: string, seatNumber: string) => Promise<void> | void;
  onEnrollNewStudent: (seatNumber: string) => void;
}

export const AssignSeatModal: React.FC<AssignSeatModalProps> = ({
  isOpen,
  onClose,
  seat,
  students,
  onAssign,
  onEnrollNewStudent,
}) => {
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  if (!isOpen || !seat) return null;

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const handleAssignClick = async (studentId: string) => {
    setAssigningId(studentId);
    try {
      await onAssign(studentId, seat.seatNumber);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Assign Seat {seat.seatNumber}</h3>
              <p className="text-xs text-slate-500">
                {seat.rowName ? `${seat.rowName} • ` : ''}Select an existing student or enroll new
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enroll New Student CTA */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => {
              onEnrollNewStudent(seat.seatNumber);
              onClose();
            }}
            className="w-full p-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Enroll & Register New Student for Seat {seat.seatNumber}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider my-1 shrink-0">
          <div className="h-px bg-slate-200 flex-1" />
          <span>Or Choose Existing Student</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] pr-0.5">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => {
              const hasThisSeat = student.seatNumber === seat.seatNumber;
              const isBusy = assigningId === student.id;

              return (
                <div
                  key={student.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    hasThisSeat
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {student.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{student.fullName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>{student.phone}</span>
                        <span>•</span>
                        {student.seatNumber ? (
                          <span className="text-indigo-600 font-semibold">Seat: {student.seatNumber}</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">No Seat</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={hasThisSeat || isBusy}
                    onClick={() => handleAssignClick(student.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      hasThisSeat
                        ? 'bg-emerald-100 text-emerald-800 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs'
                    }`}
                  >
                    {hasThisSeat ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                      </>
                    ) : isBusy ? (
                      'Assigning...'
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> Assign Seat
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {students.length === 0
                ? 'No students enrolled in this branch yet.'
                : 'No students match your search.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
