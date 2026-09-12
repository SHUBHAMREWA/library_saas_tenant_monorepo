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
import { CameraCaptureModal } from './CameraCaptureModal';

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

  // Camera Capture Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraModalMode, setCameraModalMode] = useState<'profile' | 'document'>('profile');

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
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs overflow-y-auto p-2.5 sm:p-4 flex min-h-full items-center justify-center">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl my-auto relative border border-slate-200 dark:border-[#262626] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Compact Header (Fixed Top) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-[#262626] shrink-0 bg-slate-50/50 dark:bg-[#161616]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.fullName}
                  onClick={() => setPreviewingImage(student.photoUrl || null)}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-indigo-600/30 dark:border-indigo-400/40 shadow-xs cursor-pointer hover:opacity-90 hover:scale-105 transition-all shrink-0"
                  title="Click to zoom profile photo"
                />
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                  {student.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate">
                    {student.fullName}
                  </h3>
                  <span
                    className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                      !student.seatNumber || student.status === 'INACTIVE'
                        ? 'bg-slate-200 dark:bg-[#2a2a2a] text-slate-700 dark:text-neutral-300'
                        : student.membershipEndsInDays <= 0 || student.status === 'EXPIRED'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : student.membershipEndsInDays <= 5
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    {!student.seatNumber || student.status === 'INACTIVE'
                      ? 'UNASSIGNED'
                      : student.membershipEndsInDays <= 0 || student.status === 'EXPIRED'
                      ? 'EXPIRED / DUE'
                      : student.membershipEndsInDays <= 5
                      ? `DUE IN ${student.membershipEndsInDays}D`
                      : 'ACTIVE'}
                  </span>
                </div>

                {/* Quick Phone + Call / WA Trigger Row */}
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-neutral-400">
                  <span className="font-bold text-slate-800 dark:text-neutral-200 text-xs sm:text-sm tracking-wide">
                    {student.phone}
                  </span>
                  <div className="flex items-center gap-1.5 ml-0.5">
                    <a
                      href={`tel:${student.phone}`}
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 transition-all shadow-2xs active:scale-95"
                      title="Call Student"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/91${student.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 transition-all shadow-2xs active:scale-95"
                      title="Message on WhatsApp"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right Action Icons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isEditing
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-500 dark:text-neutral-400'
                }`}
                title={isEditing ? 'Cancel Editing' : 'Edit Student'}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-400 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notification Toast */}
          {statusMsg && (
            <div className="mt-2.5 p-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Segmented Tab Bar (Compact) */}
          {!isEditing && (
            <div className="grid grid-cols-4 gap-1 bg-slate-200/80 dark:bg-[#202020] p-1 rounded-xl text-[11px] font-bold mt-3">
              <button
                type="button"
                onClick={() => setProfileTab('profile')}
                className={`py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'profile'
                    ? 'bg-white dark:bg-[#121212] text-indigo-700 dark:text-indigo-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab('enrollmentTimeline')}
                className={`py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'enrollmentTimeline'
                    ? 'bg-white dark:bg-[#121212] text-indigo-700 dark:text-indigo-300 shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab('feeHistory')}
                className={`py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'feeHistory'
                    ? 'bg-white dark:bg-[#121212] text-emerald-700 dark:text-emerald-300 shadow-2xs font-extrabold'
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
                        : 'bg-slate-300 dark:bg-[#363636] text-slate-700 dark:text-neutral-300'
                    }`}
                  >
                    {student.transactions?.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setProfileTab('kyc')}
                className={`py-1.5 px-1 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  profileTab === 'kyc'
                    ? 'bg-white dark:bg-[#121212] text-indigo-700 dark:text-indigo-300 shadow-2xs font-extrabold'
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
          )}
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
          {/* ================= EDIT MODE FORM ================= */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Profile Photo Edit */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626]">
                <div className="relative group shrink-0">
                  {isUploadingPhoto ? (
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : editPhotoUrl ? (
                    <img
                      src={editPhotoUrl}
                      alt="Student Profile"
                      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-[#262626] border border-dashed border-slate-300 dark:border-[#363636] flex items-center justify-center text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <label
                    htmlFor="edit-student-photo"
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
                    title="Upload / Change Photo"
                  >
                    <Camera className="w-3 h-3" />
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
                    Profile Photo
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <label
                      htmlFor="edit-student-photo"
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {isUploadingPhoto ? 'Uploading...' : editPhotoUrl ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    {editPhotoUrl && !isUploadingPhoto && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Purpose & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Purpose of Study
                  </label>
                  <select
                    value={editStudyPurposeChoice}
                    onChange={(e) => setEditStudyPurposeChoice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#333] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 bg-white dark:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Civil Services / UPSC">Civil Services / UPSC</option>
                    <option value="Medical / NEET">Medical / NEET</option>
                    <option value="Engineering / JEE">Engineering / JEE</option>
                    <option value="CA / CS / Finance">CA / CS / Finance</option>
                    <option value="General Study">General Study</option>
                    <option value="Other">Other / Custom Purpose</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Shift Plan
                  </label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#333] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100 bg-white dark:bg-[#1a1a1a] focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FULL_DAY">Full Day (24/7)</option>
                    <option value="MORNING">Morning Shift</option>
                    <option value="EVENING">Evening Shift</option>
                  </select>
                </div>
              </div>

              {editStudyPurposeChoice === 'Other' && (
                <div>
                  <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                    Specify Custom Study Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomPurpose}
                    onChange={(e) => setEditCustomPurpose(e.target.value)}
                    placeholder="e.g. SSC CGL, Banking Exams, UGC NET..."
                    className="w-full px-3 py-2 border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/30 rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100"
                  />
                </div>
              )}

              {/* KYC Document Box */}
              <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-neutral-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>KYC Verification & Document</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-neutral-400 mb-0.5">
                      Doc Type
                    </label>
                    <select
                      value={editKycType}
                      onChange={(e) => setEditKycType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-[#333] rounded-lg text-xs font-semibold text-slate-900 dark:text-neutral-100 bg-white dark:bg-[#121212]"
                    >
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="VOTER_ID">Voter ID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-neutral-400 mb-0.5">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={editKycDocId}
                      onChange={(e) => setEditKycDocId(e.target.value)}
                      placeholder="e.g. Aadhaar / ID No"
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-[#333] rounded-lg text-xs font-semibold text-slate-900 dark:text-neutral-100 bg-white dark:bg-[#121212]"
                    />
                  </div>
                </div>

                {/* KYC Photo */}
                <div>
                  {isUploadingKyc ? (
                    <div className="p-3 border border-dashed border-indigo-300 dark:border-indigo-800 rounded-lg flex items-center justify-center gap-2 bg-indigo-50/40 dark:bg-indigo-950/30">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Uploading Document...</span>
                    </div>
                  ) : editKycPhotoUrl ? (
                    <div className="p-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={editKycPhotoUrl}
                          alt="KYC Document"
                          className="w-10 h-8 object-cover rounded border shrink-0"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate">
                          Document Uploaded
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="edit-kyc-photo"
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Change
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveKycPhoto}
                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="edit-kyc-photo"
                      className="p-2.5 border border-dashed border-slate-300 dark:border-[#363636] hover:border-indigo-400 rounded-lg flex items-center justify-center gap-1.5 text-center bg-white dark:bg-[#121212] cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                        Upload Document Photo
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
                  className="flex-1 py-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================= VIEW MODE ================= */
            <>
              {/* TAB 1: PROFILE & SEAT ALLOCATION */}
              {profileTab === 'profile' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  {/* Assigned Seat & Actions Strip */}
                  <div className="bg-slate-50 dark:bg-[#181818] border border-slate-200/90 dark:border-[#262626] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                          <Armchair className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Assigned Desk
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {student.seatNumber ? `Seat ${student.seatNumber}` : 'No Seat Assigned'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isChangingSeat ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsChangingSeat(true)}
                              className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-colors cursor-pointer"
                            >
                              {student.seatNumber ? 'Change Seat' : 'Assign Seat'}
                            </button>
                            {student.seatNumber && (
                              <button
                                type="button"
                                onClick={handleUnassign}
                                disabled={isLoading}
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
                                title="Unassign Seat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Seat Switcher Form */}
                    {isChangingSeat && (
                      <form onSubmit={handleSeatSubmit} className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-[#2a2a2a] space-y-2">
                        <select
                          value={selectedSeat}
                          onChange={(e) => setSelectedSeat(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#363636] rounded-xl text-xs font-semibold text-slate-900 dark:text-neutral-100"
                        >
                          <option value="">-- Choose an Available Seat --</option>
                          {availableSeats.map((s) => (
                            <option key={s.id} value={s.seatNumber}>
                              Seat {s.seatNumber} ({s.rowName || 'Main Hall'})
                            </option>
                          ))}
                          {student.seatNumber && (
                            <option value="UNASSIGN">Remove / Unassign Seat</option>
                          )}
                        </select>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingSeat(false);
                              setSelectedSeat('');
                            }}
                            className="flex-1 py-1.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !selectedSeat}
                            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? 'Saving...' : 'Confirm'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* 2-Column Minimal Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Goal */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200/80 dark:border-[#262626] flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-indigo-500" /> Study Goal
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white mt-1 text-xs truncate">
                        {student.studyPurpose || 'General Study'}
                      </span>
                    </div>

                    {/* Shift */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200/80 dark:border-[#262626] flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-500" /> Shift & Plan
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white mt-1 text-xs truncate">
                        {formatShiftDetailed((currentMonthTx as any)?.shift || student.shift, (currentMonthTx as any)?.stayDuration || student.stayDuration)}
                      </span>
                    </div>

                    {/* Period Date Span */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200/80 dark:border-[#262626] flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-indigo-500" /> Active Period
                      </span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 mt-1 text-xs truncate">
                        {currentPeriodSpan || (hasCurrentMonthEnrollment ? `${currentMonthName} ${currentYearStr}` : 'No Active Period')}
                      </span>
                    </div>

                    {/* Monthly Rate & Due */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200/80 dark:border-[#262626] flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-emerald-500" /> Rate & Status
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-xs">
                          ₹{currentMonthTx?.totalFee || computedMonthlyRate || 1000}/mo
                        </span>
                        {Boolean(student.remainingFee && student.remainingFee > 0) && (
                          <span className="text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-1 py-0.2 rounded">
                            Due: ₹{student.remainingFee}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fee Reminder / Action Alert */}
                  {isFeePending && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-amber-900 dark:text-amber-200 font-semibold truncate text-[11px]">
                          {student.remainingFee && student.remainingFee > 0
                            ? `Fee balance due: ₹${student.remainingFee}`
                            : 'Membership fee pending for current cycle'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendFeeReminder}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
                      >
                        <WhatsAppIcon className="w-3 h-3" />
                        <span>Remind</span>
                      </button>
                    </div>
                  )}

                  {/* Fee Snapshot Card */}
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                        Total Paid Ledger
                      </span>
                      <span className="text-sm font-black text-emerald-900 dark:text-emerald-300">
                        ₹{((student.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)).toLocaleString('en-IN')}
                        <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium ml-1.5">
                          ({student.transactions?.length || 0} records)
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onCollectFee?.(student)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Collect Fee</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileTab('feeHistory')}
                        className="p-1.5 bg-white dark:bg-[#121212] border border-emerald-300/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-50 text-xs font-bold cursor-pointer"
                        title="View Complete Fee History"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Edit & Delete Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex-1 py-2 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#262626] hover:bg-slate-50 dark:hover:bg-[#202020] text-slate-700 dark:text-neutral-200 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Delete Student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: ENROLLMENT TIMELINE */}
              {profileTab === 'enrollmentTimeline' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  {/* Header & Year Switcher */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Monthly Attendance & Attendance Timeline</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                        12-Month breakdown for billing year {timelineYear}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#333] px-2 py-1 rounded-lg">
                      <select
                        value={timelineYear}
                        onChange={(e) => setTimelineYear(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                      >
                        {availableFeeHistoryYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status Legend (Compact) */}
                  <div className="bg-slate-50 dark:bg-[#181818] border border-slate-200/80 dark:border-[#262626] p-2 rounded-xl flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold">Enrolled</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-amber-800 dark:text-amber-300 font-bold">Inactive/Due</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span className="text-sky-800 dark:text-sky-300 font-bold">Upcoming</span>
                    </div>
                  </div>

                  {/* 12-Month Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-0.5">
                    {monthlyEnrollmentList.map((m) => {
                      const isGreen = m.statusType === 'ACTIVE';
                      const isOrange = m.statusType === 'INACTIVE' || m.statusType === 'PARTIAL';
                      return (
                        <div
                          key={m.monthIdx}
                          className={`p-2.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                            isGreen
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                              : isOrange
                              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                              : 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/50'
                          }`}
                        >
                          {m.isCurrentMonth && (
                            <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                              NOW
                            </span>
                          )}
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              {m.monthName}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded mt-1 inline-block ${
                                isGreen
                                  ? 'bg-emerald-600 text-white'
                                  : isOrange
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-sky-500 text-white'
                              }`}
                            >
                              {m.statusType === 'ACTIVE'
                                ? 'Enrolled'
                                : m.statusType === 'PARTIAL'
                                ? 'Due'
                                : m.statusType === 'INACTIVE'
                                ? 'Inactive'
                                : 'Upcoming'}
                            </span>

                            {m.periodSpan && (
                              <span className="text-[9px] text-slate-600 dark:text-neutral-400 block mt-1 truncate">
                                {m.periodSpan}
                              </span>
                            )}
                            {m.totalPaid > 0 && (
                              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                                Paid: ₹{m.totalPaid}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-[#262626] flex items-center justify-between text-[10px]">
                            {isGreen ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setFeeHistoryYear(m.year.toString());
                                  setFeeHistoryMonth(m.monthName);
                                  setProfileTab('feeHistory');
                                }}
                                className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>Receipt ({m.matchingTxs.length})</span>
                                <ArrowUpRight className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onCollectFee?.(student)}
                                className={`font-bold flex items-center gap-0.5 hover:underline cursor-pointer ${
                                  isOrange ? 'text-amber-800 dark:text-amber-300' : 'text-sky-700 dark:text-sky-300'
                                }`}
                              >
                                <span>Enroll</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Footer */}
                  <div className="p-2.5 bg-slate-50 dark:bg-[#181818] border border-slate-200/80 dark:border-[#262626] rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-neutral-300 text-[11px]">
                      Active in <strong className="text-emerald-600 dark:text-emerald-400 font-black">{monthlyEnrollmentList.filter((m) => m.statusType === 'ACTIVE').length} / 12</strong> months in {timelineYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCollectFee?.(student)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Enroll Month</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: FEES & TRANSACTIONS */}
              {profileTab === 'feeHistory' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  {/* Top Stats Banner */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Paid
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white mt-0.5 block text-xs sm:text-sm">
                        ₹{(feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL'
                          ? filteredPaidSum
                          : (student.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Monthly Rate
                      </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block text-xs sm:text-sm">
                        {computedMonthlyRate > 0 ? `₹${computedMonthlyRate}` : '₹1000'}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Validity
                      </span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 block text-xs sm:text-sm">
                        {student.membershipEndsInDays > 0 ? `${student.membershipEndsInDays}d left` : 'Expired'}
                      </span>
                    </div>
                  </div>

                  {/* Filter Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <select
                        value={feeHistoryYear}
                        onChange={(e) => setFeeHistoryYear(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#333] rounded-lg text-xs font-semibold text-slate-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="ALL">All Years</option>
                        {availableFeeHistoryYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>

                      <select
                        value={feeHistoryMonth}
                        onChange={(e) => setFeeHistoryMonth(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#333] rounded-lg text-xs font-semibold text-slate-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="ALL">All Months</option>
                        {MONTH_NAMES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>

                      {(feeHistoryYear !== 'ALL' || feeHistoryMonth !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setFeeHistoryYear('ALL');
                            setFeeHistoryMonth('ALL');
                          }}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onCollectFee?.(student)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Collect Fee</span>
                    </button>
                  </div>

                  {/* Transaction Cards List */}
                  {filteredFeeHistoryTransactions.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
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
                            className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#262626] rounded-xl p-2.5 space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                                  <Receipt className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 dark:text-white text-xs block">
                                    {tx.paidForMonth}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">
                                    {formattedD} {tx.validFrom && tx.validTo ? `• ${formatFriendlyDate(tx.validFrom)} – ${formatFriendlyDate(tx.validTo)}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm block">
                                  ₹{Number(tx.amount).toLocaleString('en-IN')}
                                </span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  tx.status === 'PARTIAL' || (tx.remainingFee && tx.remainingFee > 0)
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                }`}>
                                  {tx.status || 'PAID'} {tx.remainingFee ? `(Due: ₹${tx.remainingFee})` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Actions Row */}
                            <div className="pt-1.5 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 font-medium">
                                Mode: <strong className="text-slate-700 dark:text-neutral-300">{tx.paymentMode}</strong> {tx.receiptNumber ? `• #${tx.receiptNumber}` : ''}
                              </span>

                              <div className="flex items-center gap-1.5">
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
                                  className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded font-bold hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
                                >
                                  <WhatsAppIcon className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onViewReceipt?.(tx)}
                                  className="px-2 py-1 bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-neutral-200 rounded font-bold hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Receipt</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center border border-dashed border-slate-200 dark:border-[#262626] rounded-xl space-y-2">
                      <Receipt className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-500">
                        No transactions recorded for selected period
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: KYC & IDENTITY */}
              {profileTab === 'kyc' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div className="bg-slate-50 dark:bg-[#181818] rounded-xl p-3.5 border border-slate-200 dark:border-[#262626] text-xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-[#262626]">
                      <span className="text-slate-500 font-medium">Document Type:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {student.kycType === 'AADHAAR' ? 'Aadhaar Card' : student.kycType || 'Aadhaar Card'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-[#262626]">
                      <span className="text-slate-500 font-medium">Reference Number:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">
                        {student.kycDocId || 'Not provided'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-500 font-medium mb-1.5">
                        Uploaded Document Photo:
                      </span>
                      {student.kycPhotoUrl ? (
                        <div className="p-2 bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={student.kycPhotoUrl}
                              alt="KYC Document"
                              onClick={() => setPreviewingImage(student.kycPhotoUrl || null)}
                              className="w-12 h-9 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-90"
                              title="Click to view full image"
                            />
                            <div>
                              <span className="block font-bold text-slate-800 dark:text-neutral-200 text-xs">
                                Cloudinary Verified Photo
                              </span>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> WebP Stored
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPreviewingImage(student.kycPhotoUrl || null)}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-white dark:bg-[#121212] border border-dashed border-slate-300 dark:border-[#363636] rounded-xl text-center">
                          <p className="text-[11px] text-slate-400 italic">No document image uploaded</p>
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer mt-1 block mx-auto"
                          >
                            + Upload Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#262626] text-slate-700 dark:text-neutral-200 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Document Information</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewingImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewingImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 rounded-2xl p-2 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewingImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 hover:bg-black text-white cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewingImage}
              alt="Preview"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Live Camera WebP Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        mode={cameraModalMode}
        title={cameraModalMode === 'profile' ? 'Capture Student Profile Photo' : 'Capture KYC Document'}
        onPhotoUploaded={(cloudinaryUrl) => {
          if (cameraModalMode === 'profile') {
            setEditPhotoUrl(cloudinaryUrl);
          } else {
            setEditKycPhotoUrl(cloudinaryUrl);
          }
          setCameraModalOpen(false);
        }}
      />
    </div>
  );
};
