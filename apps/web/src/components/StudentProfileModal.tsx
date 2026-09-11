'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Armchair,
  Phone,
  Calendar,
  BookOpen,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Trash2,
  ShieldCheck,
  Eye,
  Pencil,
  Camera,
  Upload,
  Save,
  User,
  IndianRupee,
  Plus,
  Loader2,
  Receipt,
  FileText,
  History,
  Send,
  CalendarDays,
  Sparkles,
  UserX,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { StudentItem, StudentFeeRecord, formatShift, MONTH_NAMES, getStudentPreviousSeat } from './StudentList';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  compressAndConvertToWebP,
  uploadImageToCloudinaryViaApi,
  deleteImageFromCloudinaryViaApi,
} from '@/lib/image-utils';
import {
  generateWhatsAppReceiptText,
  generateWhatsAppFeeReminderText,
  openWhatsApp,
} from '@/lib/receipt-utils';

function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFriendlyPeriod(validFromStr?: string, validToStr?: string): string {
  if (!validFromStr) return '';
  const dFrom = new Date(validFromStr);
  if (isNaN(dFrom.getTime())) return validFromStr;

  const fromDay = dFrom.getDate();
  const fromMonth = dFrom.toLocaleString('en-US', { month: 'short' });
  const fromYear = dFrom.getFullYear();

  if (!validToStr) return `${fromDay} ${fromMonth} ${fromYear}`;
  const dTo = new Date(validToStr);
  if (isNaN(dTo.getTime())) return `${fromDay} ${fromMonth} ${fromYear} – ${validToStr}`;

  const toDay = dTo.getDate();
  const toMonth = dTo.toLocaleString('en-US', { month: 'short' });
  const toYear = dTo.getFullYear();

  if (fromYear === toYear) {
    if (fromMonth === toMonth) {
      return `${fromDay} – ${toDay} ${fromMonth} ${fromYear}`;
    }
    return `${fromDay} ${fromMonth} – ${toDay} ${toMonth} ${fromYear}`;
  }
  return `${fromDay} ${fromMonth} ${fromYear} – ${toDay} ${toMonth} ${toYear}`;
}

function formatShiftDetailed(shift?: string, stayDuration?: string): string {
  const normShift = shift ? shift.toUpperCase() : 'FULL_DAY';
  const normDuration = stayDuration ? stayDuration.toUpperCase() : undefined;

  if (normShift === 'MORNING') {
    if (normDuration === 'FOUR_HOURS') return 'Morning Shift • 4 Hours / Day';
    if (normDuration === 'HALF_DAY') return 'Morning Shift • Half Day (6–8h)';
    return 'Morning Shift';
  }
  if (normShift === 'EVENING') {
    if (normDuration === 'FOUR_HOURS') return 'Evening Shift • 4 Hours / Day';
    if (normDuration === 'HALF_DAY') return 'Evening Shift • Half Day (6–8h)';
    return 'Evening Shift';
  }
  if (normShift === 'FOUR_HOURS') return '4 Hours / Day';
  if (normShift === 'HALF_DAY') return 'Half Day (6–8 Hours / Day)';
  return 'Full Day (24/7 Unlimited)';
}

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentItem | null;
  availableSeats: { id: string; seatNumber: string; rowName?: string }[];
  onAssignSeat: (studentId: string, seatNumber: string | null) => Promise<void> | void;
  onUpdateStudent?: (studentId: string, data: Partial<StudentItem>) => Promise<void> | void;
  onDeleteStudent?: (studentId: string) => Promise<void> | void;
  onCollectFee?: (student: StudentItem) => void;
  onViewReceipt?: (transaction: StudentFeeRecord) => void;
  libraryName?: string;
  libraryPhone?: string;
  initialTab?: 'profile' | 'feeHistory' | 'kyc' | 'enrollmentTimeline';
}

const STANDARD_PURPOSES = [
  'Civil Services / UPSC',
  'Medical / NEET',
  'Engineering / JEE',
  'CA / CS / Finance',
  'General Study',
];

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  availableSeats,
  onAssignSeat,
  onUpdateStudent,
  onDeleteStudent,
  onCollectFee,
  onViewReceipt,
  libraryName = 'seeLibrary Study Center',
  libraryPhone,
  initialTab = 'profile',
}) => {
  const [profileTab, setProfileTab] = useState<'profile' | 'feeHistory' | 'kyc' | 'enrollmentTimeline'>(initialTab);
  const [isChangingSeat, setIsChangingSeat] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [previewingImage, setPreviewingImage] = useState<string | null>(null);

  const isFeePending = Boolean(
    student &&
      (student.membershipEndsInDays <= 0 ||
        student.status === 'EXPIRED' ||
        !student.monthlyFee ||
        Boolean(student.remainingFee && student.remainingFee > 0))
  );

  const handleSendFeeReminder = () => {
    if (!student) return;
    const text = generateWhatsAppFeeReminderText({
      libraryName,
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
    });
    openWhatsApp(student.phone, text);
  };

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStudyPurposeChoice, setEditStudyPurposeChoice] = useState('Civil Services / UPSC');
  const [editCustomPurpose, setEditCustomPurpose] = useState('');
  const [editShift, setEditShift] = useState('FULL_DAY');
  const [editKycType, setEditKycType] = useState('AADHAAR');
  const [editKycDocId, setEditKycDocId] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [editKycPhotoUrl, setEditKycPhotoUrl] = useState<string | null>(null);
  const [editMonthlyFee, setEditMonthlyFee] = useState<number | ''>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingKyc, setIsUploadingKyc] = useState(false);

  const computedMonthlyRate = useMemo(() => {
    if (!student) return 0;
    const latestTx = student.transactions?.[0];
    if (latestTx?.totalFee && Number(latestTx.totalFee) > 0) return Number(latestTx.totalFee);
    if (latestTx?.amount && Number(latestTx.amount) > 0) return Number(latestTx.amount);
    if (student.monthlyFee && Number(student.monthlyFee) > 0) return Number(student.monthlyFee);
    if (student.totalFee && Number(student.totalFee) > 0) return Number(student.totalFee);
    return 0; // No default — student must be enrolled+fee paid first
  }, [student]);

  const nowVal = useMemo(() => new Date(), []);
  const currentMonthNameStr = useMemo(() => nowVal.toLocaleString('en-US', { month: 'long' }), [nowVal]);
  const currentYearNumVal = useMemo(() => nowVal.getFullYear(), [nowVal]);

  // Transaction matching current calendar month/year or valid range covering current date
  const currentMonthTx = useMemo(() => {
    if (!student?.transactions || student.transactions.length === 0) return null;
    return student.transactions.find((tx) => {
      if (tx.validFrom && tx.validTo) {
        const dFrom = new Date(tx.validFrom);
        const dTo = new Date(tx.validTo);
        if (!isNaN(dFrom.getTime()) && !isNaN(dTo.getTime())) {
          if (dFrom <= nowVal && dTo >= nowVal) return true;
          if (dFrom.getMonth() === nowVal.getMonth() && dFrom.getFullYear() === currentYearNumVal) return true;
        }
      }
      if (tx.paidForMonth) {
        if (tx.paidForMonth.toLowerCase().includes(currentMonthNameStr.toLowerCase()) &&
            tx.paidForMonth.includes(currentYearNumVal.toString())) {
          return true;
        }
      }
      if (tx.paymentDate) {
        const pDate = new Date(tx.paymentDate);
        if (pDate.getMonth() === nowVal.getMonth() && pDate.getFullYear() === currentYearNumVal) return true;
      }
      return false;
    }) || null;
  }, [student?.transactions, currentMonthNameStr, currentYearNumVal, nowVal]);

  const hasCurrentMonthEnrollment = Boolean(
    currentMonthTx ||
    (student?.status === 'ACTIVE' && student?.seatNumber && (student?.membershipEndsInDays ?? 0) > 0)
  );

  const currentPeriodSpan = useMemo(() => {
    if (currentMonthTx?.validFrom) {
      return formatFriendlyPeriod(currentMonthTx.validFrom, currentMonthTx.validTo);
    }
    if (student?.transactions && student.transactions.length > 0) {
      const latestWithPeriod = student.transactions.find((t) => t.validFrom);
      if (latestWithPeriod?.validFrom) {
        return formatFriendlyPeriod(latestWithPeriod.validFrom, latestWithPeriod.validTo);
      }
    }
    return null;
  }, [currentMonthTx, student?.transactions]);

  // Fee History Filter states (Month & Year) - Defaults to current date's Year & Month
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  const [feeHistoryYear, setFeeHistoryYear] = useState<string>(currentYearStr);
  const [feeHistoryMonth, setFeeHistoryMonth] = useState<string>(currentMonthName);

  // Derive available years from student transactions (including 2024 to 2050)
  const availableFeeHistoryYears = useMemo(() => {
    const years = new Set<string>();
    for (let yr = 2024; yr <= 2050; yr++) {
      years.add(yr.toString());
    }
    (student?.transactions || []).forEach((tx) => {
      if (tx.paymentDate) {
        const yr = new Date(tx.paymentDate).getFullYear().toString();
        if (yr && !isNaN(Number(yr))) years.add(yr);
      }
      if (tx.paidForMonth) {
        const match = tx.paidForMonth.match(/\b(20\d\d)\b/);
        if (match) years.add(match[1]);
      }
      if (tx.validTo) {
        const match = tx.validTo.match(/\b(20\d\d)\b/);
        if (match) years.add(match[1]);
      }
    });
    return Array.from(years).sort((a, b) => Number(a) - Number(b));
  }, [student?.transactions]);

  // Filter transactions for this student by month & year
  const filteredFeeHistoryTransactions = useMemo(() => {
    return (student?.transactions || []).filter((tx) => {
      let matchYear = true;
      if (feeHistoryYear !== 'ALL') {
        const dMatch = tx.paymentDate && new Date(tx.paymentDate).getFullYear().toString() === feeHistoryYear;
        const pMatch = tx.paidForMonth && tx.paidForMonth.includes(feeHistoryYear);
        const vMatch =
          (tx.validFrom && tx.validFrom.includes(feeHistoryYear)) ||
          (tx.validTo && tx.validTo.includes(feeHistoryYear));
        matchYear = Boolean(dMatch || pMatch || vMatch);
      }

      let matchMonth = true;
      if (feeHistoryMonth !== 'ALL') {
        const pMatch = tx.paidForMonth && tx.paidForMonth.toLowerCase().includes(feeHistoryMonth.toLowerCase());
        const dMatch =
          tx.paymentDate &&
          new Date(tx.paymentDate).toLocaleString('en-US', { month: 'long' }).toLowerCase() ===
            feeHistoryMonth.toLowerCase();
        matchMonth = Boolean(pMatch || dMatch);
      }

      return matchYear && matchMonth;
    });
  }, [student?.transactions, feeHistoryYear, feeHistoryMonth]);

  // Total paid under currently selected filter
  const filteredPaidSum = useMemo(() => {
    return filteredFeeHistoryTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [filteredFeeHistoryTransactions]);

  // Timeline Year State
  const [timelineYear, setTimelineYear] = useState<string>(new Date().getFullYear().toString());

  // 12 Months Enrollment Matrix for Selected Year
  const monthlyEnrollmentList = useMemo(() => {
    if (!student) return [];
    const now = new Date();
    const currentCalYear = now.getFullYear();
    const currentCalMonthIdx = now.getMonth(); // 0 to 11
    const targetYearNum = parseInt(timelineYear, 10) || currentCalYear;

    return MONTH_NAMES.map((mName, mIdx) => {
      const isCurrentMonth = targetYearNum === currentCalYear && mIdx === currentCalMonthIdx;
      const isFutureMonth = targetYearNum > currentCalYear || (targetYearNum === currentCalYear && mIdx > currentCalMonthIdx);
      const isPastMonth = targetYearNum < currentCalYear || (targetYearNum === currentCalYear && mIdx < currentCalMonthIdx);

      // Search all transactions for this student matching this start month and year
      const matchingTxs = (student.transactions || []).filter((tx) => {
        // If validFrom is specified, transaction strictly belongs to validFrom's start month & year
        if (tx.validFrom) {
          const vFrom = new Date(tx.validFrom);
          if (!isNaN(vFrom.getTime())) {
            return vFrom.getFullYear() === targetYearNum && vFrom.getMonth() === mIdx;
          }
        }

        // Fallback for legacy transactions without validFrom
        let matchY = false;
        if (tx.paidForMonth && tx.paidForMonth.includes(targetYearNum.toString())) matchY = true;
        if (tx.paymentDate && new Date(tx.paymentDate).getFullYear() === targetYearNum) matchY = true;

        let matchM = false;
        if (tx.paidForMonth && tx.paidForMonth.toLowerCase().includes(mName.toLowerCase())) matchM = true;
        if (tx.paymentDate && new Date(tx.paymentDate).getMonth() === mIdx && new Date(tx.paymentDate).getFullYear() === targetYearNum) matchM = true;

        return matchY && matchM;
      });

      const totalPaid = matchingTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const totalDue = matchingTxs.reduce((sum, t) => sum + (Number(t.remainingFee) || 0), 0);
      const hasFullPaid = matchingTxs.some((t) => t.status === 'PAID' && (!t.remainingFee || t.remainingFee === 0));
      const hasPartialPaid = matchingTxs.some((t) => t.status === 'PARTIAL' || (t.remainingFee && t.remainingFee > 0));

      // Representative period span if transaction exists
      let periodSpan: string | undefined = undefined;
      const txWithPeriod = matchingTxs.find((t) => t.validFrom) || matchingTxs[0];
      if (txWithPeriod?.validFrom) {
        periodSpan = formatFriendlyPeriod(txWithPeriod.validFrom, txWithPeriod.validTo);
      }

      // Determine Enrollment Status
      // 1. ACTIVE / PRESENT (GREEN): Student enrolled/attended and paid or active during this month
      // 2. INACTIVE / ABSENT (ORANGE): Month has passed/occurred but student didn't enroll or pay (inactive period)
      // 3. UPCOMING (LIGHT BLUE): Future month not reached yet
      let statusType: 'ACTIVE' | 'PARTIAL' | 'INACTIVE' | 'UPCOMING' = 'UPCOMING';
      let statusLabel = 'Upcoming Month';

      if (isFutureMonth) {
        if (matchingTxs.length > 0) {
          statusType = hasFullPaid ? 'ACTIVE' : 'PARTIAL';
          statusLabel = hasFullPaid ? 'Advance Enrolled' : 'Advance Partial';
        } else {
          statusType = 'UPCOMING';
          statusLabel = 'Upcoming';
        }
      } else if (isCurrentMonth) {
        if (hasFullPaid || (matchingTxs.length > 0 && totalPaid > 0 && totalDue === 0)) {
          statusType = 'ACTIVE';
          statusLabel = 'Enrolled & Active';
        } else if (hasPartialPaid || totalDue > 0) {
          statusType = 'PARTIAL';
          statusLabel = `Partial Due (₹${totalDue})`;
        } else if (student.status === 'ACTIVE' && student.seatNumber) {
          statusType = 'ACTIVE';
          statusLabel = 'Active in Library';
        } else {
          statusType = 'INACTIVE';
          statusLabel = 'Inactive / Unpaid';
        }
      } else if (isPastMonth) {
        if (hasFullPaid || totalPaid > 0) {
          statusType = 'ACTIVE';
          statusLabel = 'Enrolled & Attended';
        } else if (matchingTxs.length > 0) {
          statusType = 'PARTIAL';
          statusLabel = 'Partial Fee Paid';
        } else {
          statusType = 'INACTIVE';
          statusLabel = 'Inactive (Did Not Attend)';
        }
      }

      return {
        monthName: mName,
        monthIdx: mIdx,
        year: targetYearNum,
        isCurrentMonth,
        isFutureMonth,
        isPastMonth,
        statusType,
        statusLabel,
        periodSpan,
        matchingTxs,
        totalPaid,
        totalDue,
      };
    });
  }, [student, timelineYear]);

  // Reset or populate fields when modal opens or student changes
  useEffect(() => {
    if (student) {
      setEditFullName(student.fullName);
      setEditPhone(student.phone);
      if (student.studyPurpose && STANDARD_PURPOSES.includes(student.studyPurpose)) {
        setEditStudyPurposeChoice(student.studyPurpose);
        setEditCustomPurpose('');
      } else if (student.studyPurpose) {
        setEditStudyPurposeChoice('Other');
        setEditCustomPurpose(student.studyPurpose);
      } else {
        setEditStudyPurposeChoice('General Study');
        setEditCustomPurpose('');
      }
      setEditShift(student.shift || 'FULL_DAY');
      setEditKycType(student.kycType || 'AADHAAR');
      setEditKycDocId(student.kycDocId || '');
      setEditPhotoUrl(student.photoUrl || null);
      setEditKycPhotoUrl(student.kycPhotoUrl || null);
      const effectiveRate = computedMonthlyRate > 0 ? computedMonthlyRate : (student.monthlyFee && student.monthlyFee > 0 ? student.monthlyFee : '');
      setEditMonthlyFee(effectiveRate);
      setIsUploadingPhoto(false);
      setIsUploadingKyc(false);
      setIsEditing(false);
      setIsChangingSeat(false);
      setStatusMsg(null);
      setFeeHistoryYear(new Date().getFullYear().toString());
      setFeeHistoryMonth(new Date().toLocaleString('en-US', { month: 'long' }));
      setTimelineYear(new Date().getFullYear().toString());
      if (initialTab) {
        setProfileTab(initialTab);
      }
    }
  }, [student, isOpen, initialTab, computedMonthlyRate]);

  if (!isOpen || !student) return null;

  const handleSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) return;
    setIsLoading(true);
    setStatusMsg(null);
    try {
      await onAssignSeat(student.id, selectedSeat === 'UNASSIGN' ? null : selectedSeat);
      setStatusMsg(selectedSeat === 'UNASSIGN' ? 'Seat unassigned successfully' : `Assigned to Seat ${selectedSeat}`);
      setIsChangingSeat(false);
      setSelectedSeat('');

      if (selectedSeat !== 'UNASSIGN' && (student.membershipEndsInDays <= 0 || student.status === 'INACTIVE' || student.status === 'EXPIRED')) {
        if (onCollectFee) {
          onCollectFee(student);
        }
      }
    } catch {
      setStatusMsg('Failed to update seat assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm(`Unassign seat ${student.seatNumber} from ${student.fullName}?`)) return;
    setIsLoading(true);
    setStatusMsg(null);
    try {
      await onAssignSeat(student.id, null);
      setStatusMsg('Seat unassigned successfully');
      setIsChangingSeat(false);
    } catch {
      setStatusMsg('Failed to unassign seat');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      // 1. Compress & convert to WebP
      const processed = await compressAndConvertToWebP(file, 600, 600, 0.82);

      // If there was an intermediate draft photo uploaded in this session, delete it
      if (editPhotoUrl && editPhotoUrl !== student.photoUrl) {
        deleteImageFromCloudinaryViaApi(editPhotoUrl);
      }

      // 2. Upload WebP to Cloudinary
      const uploaded = await uploadImageToCloudinaryViaApi(
        processed.dataUrl,
        'library_saas/students/photos',
        ['student_profile']
      );
      setEditPhotoUrl(uploaded.url);
    } catch (err: any) {
      console.error('Failed to process and upload profile photo:', err);
      alert('Photo upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    if (editPhotoUrl && editPhotoUrl !== student.photoUrl) {
      deleteImageFromCloudinaryViaApi(editPhotoUrl);
    }
    setEditPhotoUrl(null);
  };

  const handleKycPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingKyc(true);
    try {
      // 1. Compress & convert to WebP
      const processed = await compressAndConvertToWebP(file, 1200, 1200, 0.80);

      // If there was an intermediate draft KYC photo uploaded in this session, delete it
      if (editKycPhotoUrl && editKycPhotoUrl !== student.kycPhotoUrl) {
        deleteImageFromCloudinaryViaApi(editKycPhotoUrl);
      }

      // 2. Upload WebP to Cloudinary
      const uploaded = await uploadImageToCloudinaryViaApi(
        processed.dataUrl,
        'library_saas/students/kyc',
        ['student_kyc']
      );
      setEditKycPhotoUrl(uploaded.url);
    } catch (err: any) {
      console.error('Failed to process and upload KYC document photo:', err);
      alert('Document photo upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploadingKyc(false);
      e.target.value = '';
    }
  };

  const handleRemoveKycPhoto = () => {
    if (editKycPhotoUrl && editKycPhotoUrl !== student.kycPhotoUrl) {
      deleteImageFromCloudinaryViaApi(editKycPhotoUrl);
    }
    setEditKycPhotoUrl(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim() || !editPhone.trim()) {
      alert('Please provide student full name and phone number.');
      return;
    }

    const finalPurpose =
      editStudyPurposeChoice === 'Other'
        ? editCustomPurpose.trim() || 'Other'
        : editStudyPurposeChoice;

    setIsLoading(true);
    setStatusMsg(null);
    try {
      if (onUpdateStudent) {
        await onUpdateStudent(student.id, {
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          studyPurpose: finalPurpose,
          shift: editShift,
          photoUrl: editPhotoUrl,
          kycPhotoUrl: editKycPhotoUrl,
          kycDocId: editKycDocId.trim() || undefined,
          kycType: editKycType,
          monthlyFee: editMonthlyFee === '' ? (student.monthlyFee || 0) : Math.max(0, Number(editMonthlyFee)),
        });
      }
      setStatusMsg('Student details updated successfully');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update student:', err);
      setStatusMsg('Failed to update student details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmMessage = student.seatNumber
      ? `Are you sure you want to delete student "${student.fullName}"? This will permanently remove their records and free up Seat ${student.seatNumber}.`
      : `Are you sure you want to delete student "${student.fullName}"? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      if (onDeleteStudent) {
        await onDeleteStudent(student.id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to delete student:', err);
      alert('Failed to delete student. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-[#262626]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262626] pb-3">
          <div className="flex items-center gap-3 min-w-0">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                onClick={() => setPreviewingImage(student.photoUrl || null)}
                className="w-12 h-12 rounded-2xl object-cover shadow-xs border border-slate-200 dark:border-[#363636] cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                title="Click to view photo"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-xs shrink-0">
                {student.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{student.fullName}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    !student.seatNumber || student.status === 'INACTIVE'
                      ? 'bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700'
                      : student.membershipEndsInDays <= 0 || student.status === 'EXPIRED'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                      : student.membershipEndsInDays <= 5
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                  }`}
                >
                  {!student.seatNumber || student.status === 'INACTIVE'
                    ? 'INACTIVE (NO SEAT)'
                    : student.membershipEndsInDays <= 0 || student.status === 'EXPIRED'
                    ? 'FEE DUE / EXPIRED'
                    : student.membershipEndsInDays <= 5
                    ? `DUE IN ${student.membershipEndsInDays}D`
                    : 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
                <span>{student.phone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isEditing
                  ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-slate-100 dark:hover:bg-[#1c1c1e] text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
              title={isEditing ? 'Cancel Edit' : 'Edit Student Details'}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#1c1c1e] text-slate-400 dark:text-neutral-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* ================= EDIT MODE FORM ================= */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-[#262626]">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Student Information</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 dark:text-neutral-400 hover:text-slate-600 dark:hover:text-neutral-200 font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Profile Photo Edit */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626]">
              <div className="relative group shrink-0">
                {isUploadingPhoto ? (
                  <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : editPhotoUrl ? (
                  <img
                    src={editPhotoUrl}
                    alt="Student Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-600 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-[#262626] border-2 border-dashed border-slate-300 dark:border-[#363636] flex flex-col items-center justify-center text-slate-400 dark:text-neutral-500">
                    <User className="w-6 h-6 text-slate-300 dark:text-neutral-500" />
                  </div>
                )}
                <label
                  htmlFor="edit-student-photo"
                  className={`absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all ${
                    isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  title="Upload / Change Photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </label>
                <input
                  id="edit-student-photo"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingPhoto}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Profile Photo <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">(Auto-WebP & Cloudinary)</span>
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <label
                    htmlFor="edit-student-photo"
                    className={`text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer ${
                      isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isUploadingPhoto ? 'Uploading...' : editPhotoUrl ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {editPhotoUrl && !isUploadingPhoto && (
                    <>
                      <span className="text-slate-300 dark:text-neutral-600 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Name & Phone Inputs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Student Full Name"
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1c1c1e] rounded-xl text-sm font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Mobile Phone *
              </label>
              <input
                type="tel"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1c1c1e] rounded-xl text-sm font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Study Purpose */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Purpose of Study
              </label>
              <select
                value={editStudyPurposeChoice}
                onChange={(e) => setEditStudyPurposeChoice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#262626] rounded-xl text-sm font-semibold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#1c1c1e]"
              >
                <option value="Civil Services / UPSC" className="dark:bg-[#1c1c1e] dark:text-neutral-100">Civil Services / UPSC</option>
                <option value="Medical / NEET" className="dark:bg-[#1c1c1e] dark:text-neutral-100">Medical / NEET</option>
                <option value="Engineering / JEE" className="dark:bg-[#1c1c1e] dark:text-neutral-100">Engineering / JEE</option>
                <option value="CA / CS / Finance" className="dark:bg-[#1c1c1e] dark:text-neutral-100">CA / CS / Finance</option>
                <option value="General Study" className="dark:bg-[#1c1c1e] dark:text-neutral-100">General Study</option>
                <option value="Other" className="dark:bg-[#1c1c1e] dark:text-neutral-100">Other / Custom Purpose</option>
              </select>
            </div>

            {editStudyPurposeChoice === 'Other' && (
              <div className="animate-in fade-in zoom-in-95 duration-150">
                <label className="block text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
                  Specify Custom Study Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={editCustomPurpose}
                  onChange={(e) => setEditCustomPurpose(e.target.value)}
                  placeholder="e.g. SSC CGL, Banking Exams, UGC NET..."
                  className="w-full px-3 py-2 border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/30 dark:bg-indigo-950/30 rounded-xl text-sm font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* KYC & Aadhaar Edit */}
            <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-neutral-200">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>KYC & Document Verification</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Document Type
                </label>
                <select
                  value={editKycType}
                  onChange={(e) => setEditKycType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#262626] rounded-lg text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#1c1c1e]"
                >
                  <option value="AADHAAR" className="dark:bg-[#1c1c1e] dark:text-neutral-100">Aadhaar Card</option>
                  <option value="PASSPORT" className="dark:bg-[#1c1c1e] dark:text-neutral-100">Passport</option>
                  <option value="VOTER_ID" className="dark:bg-[#1c1c1e] dark:text-neutral-100">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  {editKycType === 'AADHAAR' ? 'Aadhaar Card Number' : 'ID Reference'}
                </label>
                <input
                  type="text"
                  value={editKycDocId}
                  onChange={(e) => setEditKycDocId(e.target.value)}
                  placeholder={
                    editKycType === 'AADHAAR'
                      ? 'e.g. 12-digit Aadhaar Number'
                      : 'e.g. Reference ID'
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#262626] rounded-lg text-xs font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#1c1c1e]"
                />
              </div>

              {/* Aadhaar Photo Edit Upload */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                  <span>{editKycType === 'AADHAAR' ? 'Aadhaar Card Photo' : 'Document Photo'}</span>
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">Optional</span>
                </label>

                {isUploadingKyc ? (
                  <div className="p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-lg flex flex-col items-center justify-center text-center bg-indigo-50/40 dark:bg-indigo-950/30 space-y-1.5">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                      Uploading to Cloudinary (WebP)...
                    </span>
                  </div>
                ) : editKycPhotoUrl ? (
                  <div className="p-2.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-lg flex items-center gap-3">
                    <img
                      src={editKycPhotoUrl}
                      alt="Aadhaar Card"
                      className="w-14 h-11 object-cover rounded-md border border-slate-200 dark:border-[#363636] shadow-2xs shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-neutral-200 truncate">
                        Cloudinary Document Photo Ready
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <label
                          htmlFor="edit-kyc-photo"
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                        >
                          Change Photo
                        </label>
                        <span className="text-slate-300 dark:text-neutral-600 text-[10px]">•</span>
                        <button
                          type="button"
                          onClick={handleRemoveKycPhoto}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="edit-kyc-photo"
                    className="p-3 border-2 border-dashed border-slate-300 dark:border-[#363636] hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg flex flex-col items-center justify-center text-center bg-white dark:bg-[#121212] cursor-pointer transition-colors group"
                  >
                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                      Upload {editKycType === 'AADHAAR' ? 'Aadhaar Card' : 'ID Card'} Photo
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5">
                      Auto-compressed to WebP & saved on Cloudinary
                    </span>
                  </label>
                )}
                <input
                  id="edit-kyc-photo"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingKyc}
                  onChange={handleKycPhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#262626]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-neutral-300 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-[#262626] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ================= VIEW MODE ================= */
          <>
            {/* View Mode Segmented Tab Selector */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#1c1c1e] p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setProfileTab('profile')}
                className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'profile'
                    ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab('enrollmentTimeline')}
                className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'enrollmentTimeline'
                    ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">Enrollment</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab('feeHistory')}
                className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'feeHistory'
                    ? 'bg-white dark:bg-[#262626] text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Fees</span>
                {(student.transactions?.length || 0) > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold shrink-0 ${
                      profileTab === 'feeHistory'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                        : 'bg-slate-200 dark:bg-[#363636] text-slate-700 dark:text-neutral-300'
                    }`}
                  >
                    {student.transactions?.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setProfileTab('kyc')}
                className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'kyc'
                    ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">KYC</span>
                {student.kycPhotoUrl && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>
            </div>

            {/* TAB 1: PROFILE & SEAT ALLOCATION */}
            {profileTab === 'profile' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Quick Contact CTAs */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${student.phone}`}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#1c1c1e] text-slate-700 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                    <span>Call Student</span>
                  </a>
                  <a
                    href={`https://wa.me/91${student.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {/* Send Fee Reminder on WhatsApp CTA if fee is due/pending */}
                {isFeePending && (
                  <button
                    type="button"
                    onClick={handleSendFeeReminder}
                    className="w-full py-2.5 px-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Send Fee Reminder on WhatsApp ({student.remainingFee && student.remainingFee > 0 ? `Due: ₹${student.remainingFee}` : 'Fee Due'})</span>
                  </button>
                )}

                {/* Seat Management Card */}
                <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Armchair className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Assigned Seat</span>
                    </span>
                    {student.seatNumber ? (
                      <span className="text-xs font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
                        <Armchair className="w-3.5 h-3.5" /> Seat {student.seatNumber}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-0.5 rounded-lg">
                        No Seat Assigned
                      </span>
                    )}
                  </div>

                  {hasCurrentMonthEnrollment ? (
                    !isChangingSeat ? (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsChangingSeat(true)}
                          className="flex-1 py-2 px-3 bg-white dark:bg-[#121212] border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{student.seatNumber ? 'Change / Reassign Seat' : 'Assign a Seat Now'}</span>
                        </button>

                        {student.seatNumber && (
                          <button
                            type="button"
                            onClick={handleUnassign}
                            disabled={isLoading}
                            className="py-2 px-3 bg-white dark:bg-[#121212] border border-rose-200 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Free up this seat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Unassign</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSeatSubmit} className="space-y-3 pt-1 border-t border-slate-200 dark:border-[#262626]">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                            Choose Available Seat
                          </label>
                          <select
                            value={selectedSeat}
                            onChange={(e) => setSelectedSeat(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#363636] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="" className="dark:bg-[#121212] dark:text-neutral-100">-- Select an Available Seat --</option>
                            {availableSeats.map((s) => (
                              <option key={s.id} value={s.seatNumber} className="dark:bg-[#121212] dark:text-neutral-100">
                                Seat {s.seatNumber} ({s.rowName || 'Main Hall'})
                              </option>
                            ))}
                            {student.seatNumber && (
                              <option value="UNASSIGN" className="dark:bg-[#121212] dark:text-neutral-100">Remove Seat (Make Unassigned)</option>
                            )}
                          </select>
                          {availableSeats.length === 0 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                              No free seats available in this library right now.
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingSeat(false);
                              setSelectedSeat('');
                            }}
                            className="flex-1 py-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] text-slate-600 dark:text-neutral-400 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-[#262626] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !selectedSeat}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {isLoading ? 'Saving...' : 'Confirm Assignment'}
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onCollectFee?.(student)}
                        className="w-full py-2.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Re-Enroll Student to Assign / Change Seat</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Academic & Shift Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#262626] text-slate-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" /> Study Goal
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{student.studyPurpose || 'General Study'}</span>
                  </div>

                  {hasCurrentMonthEnrollment ? (
                    <>
                      {/* Current Period Date Range */}
                      {currentPeriodSpan && (
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#262626] text-slate-600 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Current Period Range
                          </span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                            {currentPeriodSpan}
                          </span>
                        </div>
                      )}

                      {/* Stay Duration / Plan */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#262626] text-slate-600 dark:text-neutral-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" /> Stay Duration / Plan
                        </span>
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                          {formatShiftDetailed((currentMonthTx as any)?.shift || student.shift, (currentMonthTx as any)?.stayDuration || student.stayDuration)}
                        </span>
                      </div>

                      {/* Monthly Fee Rate */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#262626] text-slate-600 dark:text-neutral-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Monthly Fee Rate
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                            ₹{currentMonthTx?.totalFee || computedMonthlyRate || 1000} / month
                          </span>
                          {Boolean(student.remainingFee && student.remainingFee > 0) && (
                            <span className="font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-md text-[11px]">
                              Due: ₹{student.remainingFee}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Membership Remaining */}
                      <div className="flex items-center justify-between py-2 text-slate-600 dark:text-neutral-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" /> Membership Remaining
                        </span>
                        {!student.seatNumber || student.status === 'INACTIVE' ? (
                          <span className="font-bold text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-[#262626] border border-slate-200 dark:border-neutral-700 px-2 py-0.5 rounded-md">
                            Inactive (No Seat Assigned)
                          </span>
                        ) : student.membershipEndsInDays <= 0 ? (
                          <span className="font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-md">
                            Expired / Fee Due
                          </span>
                        ) : student.membershipEndsInDays <= 5 ? (
                          <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
                            {student.membershipEndsInDays} days left (Expiring Soon)
                          </span>
                        ) : (
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                            {student.membershipEndsInDays} days left
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    /* No Active Enrollment Notice for Current Month */
                    <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl space-y-2.5 my-2">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            No Active Enrollment for {currentMonthName} {currentYearStr}
                          </h5>
                          <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-snug">
                            This student has no active enrollment or fee transaction logged for the current month.
                          </p>
                        </div>
                      </div>

                      {/* Previous Seat Helper Badge if inactive <= 30 days */}
                      {(() => {
                        const prevSeat = getStudentPreviousSeat(student);
                        return prevSeat.seatNumber ? (
                          <div className="flex items-center gap-1.5 py-1.5 px-2.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-950 dark:text-indigo-200">
                            <Armchair className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>
                              Previous Seat Allotment: <strong className="font-bold text-indigo-700 dark:text-indigo-300">Seat {prevSeat.seatNumber}</strong>
                              {prevSeat.inactiveDays > 0 ? (
                                <span className="text-[11px] text-slate-500 dark:text-neutral-400 ml-1">
                                  (Released {prevSeat.inactiveDays} days ago)
                                </span>
                              ) : ''}
                            </span>
                          </div>
                        ) : null;
                      })()}

                      <button
                        type="button"
                        onClick={() => onCollectFee?.(student)}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Re-Enroll for {currentMonthName}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Fee Snapshot Banner linking to Fee History tab */}
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Fee Status & History</h4>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400/90">
                          {student.transactions && student.transactions.length > 0
                            ? `${student.transactions.length} payment${student.transactions.length > 1 ? 's' : ''} recorded`
                            : 'No payment recorded yet'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCollectFee?.(student)}
                      className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Collect Fee</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs">
                    <span className="text-slate-600 dark:text-neutral-400 font-medium">Total Paid:</span>
                    <span className="font-extrabold text-emerald-900 dark:text-emerald-300">
                      ₹{((student.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setProfileTab('feeHistory')}
                    className="w-full py-2 px-3 bg-white dark:bg-[#121212] hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>View Complete Fee History Tab →</span>
                  </button>
                </div>

                {/* Quick Actions Footer: Edit & Delete Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2.5 px-3 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                    <span>Edit Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="py-2.5 px-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Delete this student"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: DEDICATED FEE HISTORY TAB */}
            {profileTab === 'feeHistory' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Tab Header & Primary Action */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Fee & Payment History</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Month-wise fee records for {student.fullName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCollectFee?.(student)}
                    className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Collect Fee</span>
                  </button>
                </div>

                {/* Due Alert Banner */}
                {Boolean(student.remainingFee && student.remainingFee > 0) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                          Remaining Fee Due: ₹{student.remainingFee}
                        </span>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 block">
                          Student has an unpaid balance. Collect fee or send WhatsApp reminder.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSendFeeReminder}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                        <span>Remind</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCollectFee?.(student)}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer shadow-xs transition-colors active:scale-95"
                      >
                        Collect Due
                      </button>
                    </div>
                  </div>
                )}

                {/* 3 Metric Summary Banner */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-[#262626] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block">
                      {feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL' ? 'Filtered Paid' : 'Total Paid'}
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5 block truncate">
                      ₹{(feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL'
                        ? filteredPaidSum
                        : (student.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-[#262626] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block">
                      Monthly Rate
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block truncate">
                      {computedMonthlyRate > 0 ? `₹${computedMonthlyRate}` : 'Fee Due'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-[#262626] rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block">
                      Validity
                    </span>
                    <span className={`text-sm sm:text-base font-extrabold mt-0.5 block truncate ${
                      !student.seatNumber || student.status === 'INACTIVE'
                        ? 'text-slate-500 dark:text-neutral-400'
                        : student.membershipEndsInDays <= 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : student.membershipEndsInDays <= 5
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {!student.seatNumber || student.status === 'INACTIVE'
                        ? 'No Seat'
                        : student.membershipEndsInDays <= 0
                        ? 'Expired'
                        : `${student.membershipEndsInDays}d`}
                    </span>
                  </div>
                </div>

                {/* Month & Year Filter Controls */}
                <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-[#262626] rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    {/* Year select */}
                    <div className="flex items-center gap-1 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-lg px-2.5 py-1.5 shadow-2xs flex-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <select
                        value={feeHistoryYear}
                        onChange={(e) => setFeeHistoryYear(e.target.value)}
                        className="bg-transparent text-slate-800 dark:text-neutral-200 font-semibold text-xs focus:outline-hidden cursor-pointer w-full"
                      >
                        <option value="ALL">All Years</option>
                        {availableFeeHistoryYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Month select */}
                    <div className="flex items-center gap-1 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-lg px-2.5 py-1.5 shadow-2xs flex-1">
                      <select
                        value={feeHistoryMonth}
                        onChange={(e) => setFeeHistoryMonth(e.target.value)}
                        className="bg-transparent text-slate-800 dark:text-neutral-200 font-semibold text-xs focus:outline-hidden cursor-pointer w-full"
                      >
                        <option value="ALL">All Months</option>
                        {MONTH_NAMES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setFeeHistoryYear('ALL');
                        setFeeHistoryMonth('ALL');
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer shrink-0 px-1"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {/* Transaction Ledger / Cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 font-semibold px-0.5">
                    <span>
                      {feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL'
                        ? `Filtered Transactions (${filteredFeeHistoryTransactions.length})`
                        : `Monthly Transactions (${student.transactions?.length || 0})`}
                    </span>
                    <span>Newest First</span>
                  </div>

                  {filteredFeeHistoryTransactions.length > 0 ? (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                      {filteredFeeHistoryTransactions.map((tx) => {
                        const d = new Date(tx.paymentDate);
                        const formattedD = d.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        return (
                          <div
                            key={tx.id}
                            className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl p-3 shadow-2xs hover:border-slate-300 dark:hover:border-[#363636] transition-colors space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40 font-bold shrink-0">
                                  <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block">
                                    {tx.paidForMonth}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">
                                    {formattedD}
                                  </span>
                                  {tx.validFrom && tx.validTo && (
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5 flex items-center gap-1">
                                      <Calendar className="w-3 h-3 inline" />
                                      {formatFriendlyDate(tx.validFrom)} – {formatFriendlyDate(tx.validTo)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm block">
                                  ₹{Number(tx.amount).toLocaleString('en-IN')}
                                </span>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                                    tx.status === 'PARTIAL' || (tx.remainingFee && tx.remainingFee > 0)
                                      ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50'
                                      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50'
                                  }`}>
                                    {tx.status || 'PAID'}
                                  </span>
                                  {tx.remainingFee !== undefined && tx.remainingFee > 0 && (
                                    <span className="text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 px-1 py-0.2 rounded">
                                      Due: ₹{tx.remainingFee}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Metadata row */}
                            <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 font-medium">
                                  Mode: <span className="font-bold text-slate-700 dark:text-neutral-200">{tx.paymentMode}</span>
                                </span>
                                {tx.totalFee && tx.totalFee > tx.amount && (
                                  <span className="text-[10px] text-slate-500">
                                    (Total: ₹{tx.totalFee})
                                  </span>
                                )}
                              </div>

                              {tx.receiptNumber && (
                                <span className="font-mono text-[10px] text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-[#262626] px-2 py-0.5 rounded-md">
                                  #{tx.receiptNumber}
                                </span>
                              )}
                            </div>

                            {tx.notes && (
                              <div className="text-[10px] bg-slate-50 dark:bg-[#121212] p-2 rounded-lg text-slate-600 dark:text-neutral-400 italic border border-slate-100 dark:border-[#262626]">
                                &quot;{tx.notes}&quot;
                              </div>
                            )}

                            {/* Receipt Action Buttons */}
                            <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const text = generateWhatsAppReceiptText({
                                    libraryName,
                                    libraryPhone,
                                    studentName: student.fullName,
                                    studentPhone: student.phone,
                                    seatNumber: student.seatNumber,
                                    receiptNumber: tx.receiptNumber,
                                    paidForMonth: tx.paidForMonth,
                                    validFrom: tx.validFrom,
                                    validTo: tx.validTo,
                                    totalFee: tx.totalFee,
                                    amount: tx.amount,
                                    remainingFee: tx.remainingFee,
                                    paymentMode: tx.paymentMode,
                                    paymentDate: tx.paymentDate,
                                    notes: tx.notes,
                                  });
                                  openWhatsApp(student.phone, text);
                                }}
                                className="py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                                title="Send fee receipt on WhatsApp"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Send WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onViewReceipt?.(tx)}
                                className="py-1 px-2.5 bg-slate-100 dark:bg-[#262626] hover:bg-slate-200 dark:hover:bg-[#303030] text-slate-700 dark:text-neutral-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                                title="View and print official fee receipt"
                              >
                                <FileText className="w-3 h-3 text-slate-500 dark:text-neutral-400" />
                                <span>View / Print Receipt</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Clean Empty State */
                    <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-dashed border-slate-200 dark:border-[#262626] rounded-2xl p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                          {feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL'
                            ? `No Transactions in ${feeHistoryMonth !== 'ALL' ? feeHistoryMonth : ''} ${feeHistoryYear !== 'ALL' ? feeHistoryYear : ''}`
                            : 'No Fee Payments Recorded Yet'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 max-w-xs mx-auto mt-1">
                          {feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL'
                            ? 'No payment records found for the selected month and year filter.'
                            : 'No monthly transactions found for this student. Click the button below to collect their fee.'}
                        </p>
                      </div>
                      {feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFeeHistoryYear('ALL');
                            setFeeHistoryMonth('ALL');
                          }}
                          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <span>Show All Months</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCollectFee?.(student)}
                          className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Collect First Fee</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: MONTH ENROLLMENT TIMELINE (Green = Enrolled/Attended, Orange = Inactive/Absent, Light Blue = Upcoming) */}
            {profileTab === 'enrollmentTimeline' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Header & Year Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100 dark:border-[#262626]">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Monthly Enrollment Status</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Attendance &amp; enrollment track across billing months
                    </p>
                  </div>

                  {/* Year Dropdown */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#333] px-2.5 py-1 rounded-xl shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <select
                        value={timelineYear}
                        onChange={(e) => setTimelineYear(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                      >
                        {availableFeeHistoryYears.map((yr) => (
                          <option key={yr} value={yr}>
                            Year {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Status Legend (Green, Orange, Light Blue) */}
                <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-[#262626] p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 shrink-0" />
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold">Green: Enrolled / Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50 shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300 font-bold">Orange: Inactive / Absent</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs shadow-sky-400/50 shrink-0" />
                    <span className="text-sky-800 dark:text-sky-300 font-bold">Light Blue: Upcoming Month</span>
                  </div>
                </div>

                {/* 12-Month Interactive Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-0.5">
                  {monthlyEnrollmentList.map((m) => {
                    const isGreen = m.statusType === 'ACTIVE';
                    const isOrange = m.statusType === 'INACTIVE' || m.statusType === 'PARTIAL';
                    const isLightBlue = m.statusType === 'UPCOMING';

                    return (
                      <div
                        key={m.monthIdx}
                        className={`p-3 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between group shadow-2xs ${
                          isGreen
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-400 hover:shadow-md'
                            : isOrange
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 hover:border-amber-400 hover:shadow-md'
                            : 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/50 hover:border-sky-300 hover:shadow-md'
                        }`}
                      >
                        {/* Current Month Highlight Dot */}
                        {m.isCurrentMonth && (
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/90 dark:bg-[#121212] px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-[#333] shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                            <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">NOW</span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {m.monthName}
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-center gap-1.5">
                            {isGreen && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                                <Check className="w-3 h-3" />
                                <span>Enrolled</span>
                              </span>
                            )}
                            {isOrange && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-2xs">
                                <UserX className="w-3 h-3" />
                                <span>{m.statusType === 'PARTIAL' ? 'Due' : 'Inactive'}</span>
                              </span>
                            )}
                            {isLightBlue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500 text-white text-[10px] font-bold shadow-2xs">
                                <Clock className="w-3 h-3" />
                                <span>Upcoming</span>
                              </span>
                            )}
                          </div>

                          {/* Period Date Span (e.g. 8 Sep – 8 Oct 2026) */}
                          {m.periodSpan && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-700 dark:text-neutral-300 bg-white/80 dark:bg-black/40 px-1.5 py-0.5 rounded-md border border-slate-200/70 dark:border-white/10 shadow-2xs">
                              <CalendarDays className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span className="truncate">{m.periodSpan}</span>
                            </div>
                          )}

                          <p className="text-[10px] text-slate-600 dark:text-neutral-400 mt-1.5 leading-snug">
                            {m.statusLabel}
                          </p>

                          {/* Paid / Due metrics */}
                          {m.totalPaid > 0 && (
                            <p className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                              Paid: ₹{m.totalPaid}
                            </p>
                          )}
                        </div>

                        {/* Action Link / Enroll Trigger */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#2a2a2d] flex items-center justify-between">
                          {isGreen ? (
                            <button
                              type="button"
                              onClick={() => {
                                setFeeHistoryYear(m.year.toString());
                                setFeeHistoryMonth(m.monthName);
                                setProfileTab('feeHistory');
                              }}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>View Receipts ({m.matchingTxs.length})</span>
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onCollectFee?.(student)}
                              className={`text-[10px] font-bold flex items-center gap-0.5 hover:underline cursor-pointer ${
                                isOrange
                                  ? 'text-amber-800 dark:text-amber-300'
                                  : 'text-sky-700 dark:text-sky-300'
                              }`}
                            >
                              <span>Enroll / Pay Fee</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Annual Attendance Summary Card */}
                <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-[#262626] rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-slate-700 dark:text-neutral-300">
                      <strong>{student.fullName}</strong> was active in{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {monthlyEnrollmentList.filter((m) => m.statusType === 'ACTIVE').length} / 12
                      </strong>{' '}
                      months in {timelineYear}.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCollectFee?.(student)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enroll Month</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: KYC & IDENTIFICATION */}
            {profileTab === 'kyc' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>KYC & Document Verification</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Identity verification records for {student.fullName}
                    </p>
                  </div>

                  {student.kycPhotoUrl ? (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-full">
                      Pending Photo
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-[#1c1c1e] rounded-2xl p-4 border border-slate-200 dark:border-[#262626] text-xs space-y-3">
                  <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400 pb-2 border-b border-slate-200/60 dark:border-[#262626]">
                    <span>Document Type:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {student.kycType === 'AADHAAR' ? 'Aadhaar Card' : student.kycType || 'Aadhaar Card'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400 pb-2 border-b border-slate-200/60 dark:border-[#262626]">
                    <span>Card Reference Number:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">
                      {student.kycDocId || 'Not provided'}
                    </span>
                  </div>

                  {/* Document Photo */}
                  <div>
                    <span className="block text-slate-600 dark:text-neutral-400 font-medium mb-1.5">
                      Uploaded Document Image:
                    </span>
                    {student.kycPhotoUrl ? (
                      <div className="p-2.5 bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.kycPhotoUrl}
                            alt="Aadhaar Card Document"
                            onClick={() => setPreviewingImage(student.kycPhotoUrl || null)}
                            className="w-16 h-12 object-cover rounded-lg border border-slate-200 dark:border-[#363636] shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                            title="Click to view full image"
                          />
                          <div>
                            <span className="block font-bold text-slate-800 dark:text-neutral-200 text-xs">
                              {student.kycType === 'AADHAAR' ? 'Aadhaar Card Photo' : 'ID Document Photo'}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Stored in Cloudinary (WebP)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewingImage(student.kycPhotoUrl || null)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/50 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Full</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-white dark:bg-[#121212] border border-dashed border-slate-300 dark:border-[#363636] rounded-xl text-center space-y-2">
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500 italic">
                          No document photo uploaded yet for this student.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline cursor-pointer"
                        >
                          Upload Document Photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2.5 px-3 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                    <span>Edit Document & Info</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {previewingImage && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewingImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 rounded-2xl p-2 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewingImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 hover:bg-black text-white cursor-pointer z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewingImage}
              alt="Document Preview"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
