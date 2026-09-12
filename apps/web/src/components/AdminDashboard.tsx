'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Armchair,
  IndianRupee,
  ShieldCheck,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag,
  ExternalLink,
  Sparkles,
  X,
  Phone,
  Mail,
  Layers,
  Edit3,
  CreditCard,
  Calendar,
  Clock,
  Percent,
  Bell,
  Send,
  Megaphone,
  MapPin,
  Eye,
  ChevronRight,
  DoorOpen,
  Crown,
  LogOut,
  Sun,
  Moon,
  Trash2,
  GraduationCap,
  Filter,
  UserCheck,
  FileText,
  User,
  CalendarDays,
  Check,
  UserX,
  ArrowUpRight,
  ArrowRight,
  Receipt,
  ZoomIn,
} from 'lucide-react';
import { AdminSkeleton } from './Skeleton';
import { useTheme } from './ThemeProvider';
import { getAdminCache, setAdminCache } from '../lib/indexed-db';

interface AdminPlanItem {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  durationMonths: number;
  originalPrice: number;
  badge: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminPaymentItem {
  id: string;
  libraryId: string;
  libraryName: string;
  ownerName: string;
  ownerEmail: string;
  amount: number;
  originalAmount?: number;
  discountApplied?: number;
  couponCode?: string | null;
  currency: string;
  status: string;
  provider: string;
  paymentId: string;
  orderId?: string;
  createdAt: string;
  planCode: string;
  planName: string;
  durationMonths: number;
  adjustmentAction?: string;
  daysAdjusted?: number | null;
  isAutopay?: boolean;
  isCancelled?: boolean;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  failureReason?: string | null;
  statusDetail?: string | null;
}

interface PlatformMetrics {
  totalLibraries: number;
  activeLibraries: number;
  suspendedLibraries: number;
  totalStudents: number;
  totalSeats: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
}

interface AdminLibrary {
  id: string;
  name: string;
  slug: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  subscription?: {
    status: string;
    autoRenew: boolean;
    autoRenewCancelledAt: string | null;
    cancellationReason: string | null;
    validUntil: string;
  } | null;
  counts?: {
    rooms?: number;
    seats?: number;
    students?: number;
  };
}

interface AdminCoupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  validFrom: string;
  validUntil: string;
  maxRedemptions?: number | null;
  perUserLimit?: number;
  usageCount: number;
  isActive: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  librariesCount: number;
}

interface AuditLogEntry {
  id: string;
  actorName: string;
  actorEmail: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  libraryName?: string | null;
  diffPayload?: any;
  createdAt: string;
}

interface AdminStudentItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  address?: string | null;
  studyPurpose?: string | null;
  photoUrl?: string | null;
  kycDocId?: string | null;
  kycDocType?: string;
  kycPhotoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  libraryId: string;
  libraryName: string;
  librarySlug: string;
  ownerName?: string;
  ownerEmail?: string;
  membership?: {
    id: string;
    status: string;
    shift: string;
    startDate: string | null;
    endDate: string | null;
    feeAmount: number;
  } | null;
  memberships?: Array<{
    id: string;
    status: string;
    shift: string;
    startDate: string | null;
    endDate: string | null;
    feeAmount: number;
  }>;
  feeTransactions?: any[];
  transactions?: any[];
  seat?: {
    seatNumber: string;
    roomName?: string | null;
    rowName?: string | null;
    shift?: string;
  } | null;
  remainingDue?: number;
  lastPaymentDate?: string | null;
}

interface FloorPlanSeat {
  id: string;
  seatNumber: string;
  status: string;
  studentName: string | null;
}

interface FloorPlanRow {
  id: string;
  name: string;
  seats: FloorPlanSeat[];
}

interface FloorPlanRoom {
  id: string;
  name: string;
  rows: FloorPlanRow[];
}

interface FloorPlanLibrary {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  isActive: boolean;
  owner: { id: string; fullName: string; email: string; phone?: string };
  totalSeats: number;
  totalStudents: number;
  rooms: FloorPlanRoom[];
}

interface AdminDashboardProps {
  currentUser: { fullName: string; email: string; phone: string; role: string; avatar?: string };
  onSwitchToLibraryView?: (libraryId?: string) => void;
  onLogout?: () => void;
}

const rawBackendUrl =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'https://seelibrarybackend.onrender.com';

const RENDER_BACKEND_ORIGIN = rawBackendUrl
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '')
  .replace('://localhost:', '://127.0.0.1:');

async function adminApiFetch(path: string, options: RequestInit = {}, userEmail?: string): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (userEmail && !headers.has('x-admin-email')) {
    headers.set('x-admin-email', userEmail);
  }
  options.headers = headers;

  let directUrl: string;
  if (path.startsWith('/api/admin')) {
    const subpath = path.slice('/api/admin'.length).replace(/^\/+/, '');
    directUrl = `${RENDER_BACKEND_ORIGIN}/api/v1/admin/${subpath}`;
  } else if (path.startsWith('/api/v1/admin')) {
    const subpath = path.slice('/api/v1/admin'.length).replace(/^\/+/, '');
    directUrl = `${RENDER_BACKEND_ORIGIN}/api/v1/admin/${subpath}`;
  } else {
    directUrl = path;
  }

  try {
    const directOptions: RequestInit = {
      ...options,
      signal: options.signal || AbortSignal.timeout(5000),
    };
    const res = await fetch(directUrl, directOptions);
    if (res.status < 500) {
      return res;
    }
  } catch {
    // Network or CORS error, fall back to relative proxy path
  }

  const proxyOptions: RequestInit = {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
  };
  return fetch(path, proxyOptions);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatFriendlyDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFriendlyPeriod(fromStr?: string | null, toStr?: string | null): string {
  if (!fromStr) return '';
  const f = new Date(fromStr);
  if (isNaN(f.getTime())) return '';
  const fromFormatted = f.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (!toStr) return fromFormatted;
  const t = new Date(toStr);
  if (isNaN(t.getTime())) return fromFormatted;
  const toFormatted = t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fromFormatted} – ${toFormatted}`;
}

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function AdminDashboard({ currentUser, onSwitchToLibraryView, onLogout }: AdminDashboardProps) {
  const adminFetch = (path: string, options: RequestInit = {}) => {
    return adminApiFetch(path, options, currentUser.email);
  };
  const { resolvedTheme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'plans' | 'coupons' | 'users' | 'audit' | 'payments' | 'broadcast'>('overview');
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [adminPaymentFilter, setAdminPaymentFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED_AUTOPAY'>('ALL');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [libraries, setLibraries] = useState<AdminLibrary[]>([]);
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  
  // Platform Students Directory States
  const [studentsList, setStudentsList] = useState<AdminStudentItem[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentLibraryFilter, setStudentLibraryFilter] = useState('ALL');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'DUE' | 'MORNING' | 'EVENING' | 'FULL_DAY'>('ALL');
  const [selectedStudentForInspect, setSelectedStudentForInspect] = useState<AdminStudentItem | null>(null);
  const [isInspectStudentModalOpen, setIsInspectStudentModalOpen] = useState(false);
  const [inspectStudentTab, setInspectStudentTab] = useState<'profile' | 'enrollmentTimeline' | 'feeHistory' | 'kyc'>('profile');
  const [inspectTimelineYear, setInspectTimelineYear] = useState<string>(new Date().getFullYear().toString());
  const [inspectFeeYear, setInspectFeeYear] = useState<string>('ALL');
  const [inspectFeeMonth, setInspectFeeMonth] = useState<string>('ALL');
  const [adminPreviewingImage, setAdminPreviewingImage] = useState<string | null>(null);
  
  // Push Broadcast States
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | 'LIBRARY'>('ALL');
  const [broadcastLibraryId, setBroadcastLibraryId] = useState('');
  const [broadcastUrl, setBroadcastUrl] = useState('/');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({
    overview: false,
    students: false,
    plans: false,
    coupons: false,
    users: false,
    payments: false,
    broadcast: false,
    audit: false,
  });
  const [tabLastUpdated, setTabLastUpdated] = useState<Record<string, number>>({});
  const [tabLoaded, setTabLoaded] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Plan Edit/Create States
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<AdminPlanItem | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanDuration, setEditPlanDuration] = useState('1');
  const [editPlanPrice, setEditPlanPrice] = useState('799');
  const [editPlanOrigPrice, setEditPlanOrigPrice] = useState('999');
  const [editPlanBadge, setEditPlanBadge] = useState('');
  const [editPlanDesc, setEditPlanDesc] = useState('');
  const [editPlanActive, setEditPlanActive] = useState(true);
  const [planSaving, setPlanSaving] = useState(false);

  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [newPlanCode, setNewPlanCode] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState('1');
  const [newPlanPrice, setNewPlanPrice] = useState('999');
  const [newPlanOrigPrice, setNewPlanOrigPrice] = useState('1299');
  const [newPlanBadge, setNewPlanBadge] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');

  // Coupon Modal States
  const [isCreateCouponOpen, setIsCreateCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [couponValue, setCouponValue] = useState('20');
  const [couponMaxRedemptions, setCouponMaxRedemptions] = useState('100');
  const [couponMinOrderAmount, setCouponMinOrderAmount] = useState('');
  const [couponMaxDiscountAmount, setCouponMaxDiscountAmount] = useState('');
  const [couponValidUntil, setCouponValidUntil] = useState('');
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  // Coupon Edit / Delete States
  const [isEditCouponOpen, setIsEditCouponOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<AdminCoupon | null>(null);
  const [editCouponCode, setEditCouponCode] = useState('');
  const [editCouponType, setEditCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [editCouponValue, setEditCouponValue] = useState('20');
  const [editCouponMaxRedemptions, setEditCouponMaxRedemptions] = useState('');
  const [editCouponMinOrderAmount, setEditCouponMinOrderAmount] = useState('');
  const [editCouponMaxDiscountAmount, setEditCouponMaxDiscountAmount] = useState('');
  const [editCouponValidUntil, setEditCouponValidUntil] = useState('');
  const [editCouponActive, setEditCouponActive] = useState(true);
  const [couponSaving, setCouponSaving] = useState(false);

  const [selectedCouponForDelete, setSelectedCouponForDelete] = useState<AdminCoupon | null>(null);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false);

  // Library Toggle & Delete Confirmation
  const [selectedLibForToggle, setSelectedLibForToggle] = useState<AdminLibrary | null>(null);
  const [isTogglingLib, setIsTogglingLib] = useState(false);
  const [selectedLibForDelete, setSelectedLibForDelete] = useState<AdminLibrary | null>(null);
  const [isDeletingLib, setIsDeletingLib] = useState(false);
  const [deleteConfirmLibName, setDeleteConfirmLibName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Subscription Adjust Modal
  const [selectedLibForSubAdjust, setSelectedLibForSubAdjust] = useState<AdminLibrary | null>(null);
  const [adjustAction, setAdjustAction] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [adjustDays, setAdjustDays] = useState('30');
  const [adjustPlanCode, setAdjustPlanCode] = useState('PRO');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjustingSub, setIsAdjustingSub] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleUpdateUserRole = async (targetUser: AdminUser, newRole: string) => {
    if (updatingUserId) return;
    setUpdatingUserId(targetUser.id);

    try {
      const res = await adminFetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser.email,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
        setStatusMessage({
          type: 'success',
          text: `User '${targetUser.email}' role updated to ${newRole}!`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to update user role',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Network error while updating user role',
      });
    } finally {
      setUpdatingUserId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleAdjustSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLibForSubAdjust) return;
    setIsAdjustingSub(true);
    try {
      const res = await adminFetch('/api/admin/subscriptions/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser.email,
        },
        body: JSON.stringify({
          libraryId: selectedLibForSubAdjust.id,
          action: adjustAction,
          days: parseInt(adjustDays, 10) || 30,
          planCode: adjustPlanCode,
          adminNotes: adjustNotes.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Library subscription adjusted successfully!',
        });
        setSelectedLibForSubAdjust(null);
        setAdjustNotes('');
        await Promise.all([fetchOverviewData(true), fetchPaymentsData(true)]);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to adjust subscription',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Network error while adjusting subscription',
      });
    } finally {
      setIsAdjustingSub(false);
    }
  };

  // Floor Plan Inspect Modal
  const [inspectLibrary, setInspectLibrary] = useState<FloorPlanLibrary | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectRoomId, setInspectRoomId] = useState<string | null>(null);

  const openInspectModal = async (libraryId: string) => {
    setInspectLibrary(null);
    setInspectRoomId(null);
    setInspectLoading(true);
    try {
      const res = await fetch(`/api/libraries/${libraryId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.library) {
          setInspectLibrary(data.library);
          if (data.library.rooms?.length > 0) {
            setInspectRoomId(data.library.rooms[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load floor plan:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Inspect Student Monthly Enrollment & Fee Helpers
  const availableInspectFeeYears = useMemo(() => {
    if (!selectedStudentForInspect) return [new Date().getFullYear().toString()];
    const years = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    years.add(currentYr);
    years.add((new Date().getFullYear() + 1).toString());
    years.add((new Date().getFullYear() - 1).toString());

    const txList = selectedStudentForInspect.transactions || selectedStudentForInspect.feeTransactions || [];
    txList.forEach((tx: any) => {
      if (tx.validFrom) {
        const y = new Date(tx.validFrom).getFullYear();
        if (!isNaN(y)) years.add(y.toString());
      }
      if (tx.paymentDate) {
        const y = new Date(tx.paymentDate).getFullYear();
        if (!isNaN(y)) years.add(y.toString());
      }
      if (tx.paidForMonth) {
        const match = tx.paidForMonth.match(/\d{4}/);
        if (match) years.add(match[0]);
      }
    });

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [selectedStudentForInspect]);

  const inspectFilteredTxs = useMemo(() => {
    if (!selectedStudentForInspect) return [];
    const txList = selectedStudentForInspect.transactions || selectedStudentForInspect.feeTransactions || [];
    return txList.filter((tx: any) => {
      let matchYear = true;
      if (inspectFeeYear !== 'ALL') {
        const targetYr = parseInt(inspectFeeYear, 10);
        let txYr: number | null = null;
        if (tx.validFrom) txYr = new Date(tx.validFrom).getFullYear();
        else if (tx.paymentDate) txYr = new Date(tx.paymentDate).getFullYear();
        else if (tx.paidForMonth) {
          const match = tx.paidForMonth.match(/\d{4}/);
          if (match) txYr = parseInt(match[0], 10);
        }
        matchYear = txYr === targetYr;
      }

      let matchMonth = true;
      if (inspectFeeMonth !== 'ALL') {
        let txMo: number | null = null;
        if (tx.validFrom) txMo = new Date(tx.validFrom).getMonth();
        else if (tx.paymentDate) txMo = new Date(tx.paymentDate).getMonth();
        else if (tx.paidForMonth) {
          const mIdx = MONTH_NAMES.findIndex((m) =>
            tx.paidForMonth.toLowerCase().includes(m.toLowerCase())
          );
          if (mIdx !== -1) txMo = mIdx;
        }
        const targetMoIdx = MONTH_NAMES.indexOf(inspectFeeMonth);
        matchMonth = txMo === targetMoIdx;
      }

      return matchYear && matchMonth;
    });
  }, [selectedStudentForInspect, inspectFeeYear, inspectFeeMonth]);

  const inspectMonthlyEnrollmentList = useMemo(() => {
    if (!selectedStudentForInspect) return [];
    const now = new Date();
    const currentCalYear = now.getFullYear();
    const currentCalMonthIdx = now.getMonth();
    const targetYearNum = parseInt(inspectTimelineYear, 10) || currentCalYear;

    const txList = selectedStudentForInspect.transactions || selectedStudentForInspect.feeTransactions || [];

    return MONTH_NAMES.map((mName, mIdx) => {
      const isCurrentMonth = targetYearNum === currentCalYear && mIdx === currentCalMonthIdx;
      const isFutureMonth = targetYearNum > currentCalYear || (targetYearNum === currentCalYear && mIdx > currentCalMonthIdx);
      const isPastMonth = targetYearNum < currentCalYear || (targetYearNum === currentCalYear && mIdx < currentCalMonthIdx);

      const matchingTxs = txList.filter((tx: any) => {
        if (tx.validFrom) {
          const vFrom = new Date(tx.validFrom);
          if (!isNaN(vFrom.getTime())) {
            return vFrom.getFullYear() === targetYearNum && vFrom.getMonth() === mIdx;
          }
        }

        let matchY = false;
        if (tx.paidForMonth && tx.paidForMonth.includes(targetYearNum.toString())) matchY = true;
        if (tx.paymentDate && new Date(tx.paymentDate).getFullYear() === targetYearNum) matchY = true;

        let matchM = false;
        if (tx.paidForMonth && tx.paidForMonth.toLowerCase().includes(mName.toLowerCase())) matchM = true;
        if (tx.paymentDate && new Date(tx.paymentDate).getMonth() === mIdx && new Date(tx.paymentDate).getFullYear() === targetYearNum) matchM = true;

        return matchY && matchM;
      });

      const totalPaid = matchingTxs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      const totalDue = matchingTxs.reduce((sum: number, t: any) => sum + (Number(t.remainingFee) || 0), 0);
      const hasFullPaid = matchingTxs.some((t: any) => t.status === 'PAID' && (!t.remainingFee || t.remainingFee === 0));
      const hasPartialPaid = matchingTxs.some((t: any) => t.status === 'PARTIAL' || (t.remainingFee && t.remainingFee > 0));

      let periodSpan: string | undefined = undefined;
      const txWithPeriod = matchingTxs.find((t: any) => t.validFrom) || matchingTxs[0];
      if (txWithPeriod?.validFrom) {
        periodSpan = formatFriendlyPeriod(txWithPeriod.validFrom, txWithPeriod.validTo);
      }

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
        } else if (selectedStudentForInspect.isActive && selectedStudentForInspect.seat) {
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
  }, [selectedStudentForInspect, inspectTimelineYear]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setStatusMessage({ type: 'error', text: 'Title and message body are required' });
      return;
    }

    setIsBroadcasting(true);
    setStatusMessage(null);
    try {
      const res = await adminFetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify({
          adminEmail: currentUser.email,
          title: broadcastTitle,
          body: broadcastBody,
          target: broadcastTarget,
          targetLibraryId: broadcastTarget === 'LIBRARY' ? broadcastLibraryId : undefined,
          url: broadcastUrl || '/',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'Push notification broadcast delivered!' });
        setBroadcastTitle('');
        setBroadcastBody('');
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to dispatch broadcast' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to dispatch broadcast' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const fetchOverviewData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getAdminCache<{ metrics: PlatformMetrics; libraries: AdminLibrary[] }>('admin_overview');
      if (cached?.data) {
        if (cached.data.metrics) setMetrics(cached.data.metrics);
        if (cached.data.libraries) setLibraries(cached.data.libraries);
        setTabLastUpdated((prev) => ({ ...prev, overview: cached.updatedAt }));
        setTabLoaded((prev) => ({ ...prev, overview: true }));
        setIsLoading(false);
        if (Date.now() - cached.updatedAt < 5 * 60 * 1000) {
          return;
        }
      }
    }

    setTabLoading((prev) => ({ ...prev, overview: true }));
    try {
      const headers = { 'x-admin-email': currentUser.email };
      const [metricsRes, libsRes] = await Promise.all([
        adminFetch('/api/admin/metrics', { headers }),
        adminFetch('/api/admin/libraries', { headers }),
      ]);

      let newMetrics: PlatformMetrics | null = null;
      let newLibraries: AdminLibrary[] = [];

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        if (m.data) {
          newMetrics = m.data;
          setMetrics(m.data);
        }
      }

      if (libsRes.ok) {
        const l = await libsRes.json();
        const rawLibs = l.libraries || l.data || [];
        newLibraries = rawLibs.map((lib: any) => ({
          ...lib,
          owner: lib.owner || {
            id: lib.ownerId || '',
            fullName: lib.ownerName || 'Owner',
            email: lib.ownerEmail || '',
            phone: lib.contactPhone || '',
          },
          counts: {
            seats: lib.counts?.seats ?? lib.seatCount ?? lib.totalSeats ?? 0,
            students: lib.counts?.students ?? lib.studentCount ?? lib.totalStudents ?? 0,
            rooms: lib.counts?.rooms ?? lib.roomCount ?? 0,
          },
        }));
        setLibraries(newLibraries);
      }

      const finalMetrics = newMetrics || metrics || {
        totalLibraries: newLibraries.length,
        activeLibraries: newLibraries.filter((l) => l.isActive).length,
        suspendedLibraries: newLibraries.filter((l) => !l.isActive).length,
        totalStudents: 0,
        totalSeats: 0,
        totalUsers: 1,
        activeSubscriptions: 0,
        totalRevenue: 0,
      };
      setMetrics(finalMetrics);

      const now = Date.now();
      setTabLastUpdated((prev) => ({ ...prev, overview: now }));
      setTabLoaded((prev) => ({ ...prev, overview: true }));
      await setAdminCache('admin_overview', { metrics: finalMetrics, libraries: newLibraries });
    } catch (err) {
      console.error('Failed to load overview data:', err);
      setMetrics((prev) => prev || {
        totalLibraries: 0,
        activeLibraries: 0,
        suspendedLibraries: 0,
        totalStudents: 0,
        totalSeats: 0,
        totalUsers: 1,
        activeSubscriptions: 0,
        totalRevenue: 0,
      });
    } finally {
      setTabLoading((prev) => ({ ...prev, overview: false }));
      setIsLoading(false);
    }
  };

  const fetchStudentsData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getAdminCache<AdminStudentItem[]>('admin_students');
      if (cached?.data) {
        setStudentsList(cached.data);
        setTabLastUpdated((prev) => ({ ...prev, students: cached.updatedAt }));
        setTabLoaded((prev) => ({ ...prev, students: true }));
        if (Date.now() - cached.updatedAt < 5 * 60 * 1000) {
          if (libraries.length === 0) fetchOverviewData(false);
          return;
        }
      }
    }

    setTabLoading((prev) => ({ ...prev, students: true }));
    try {
      const headers = { 'x-admin-email': currentUser.email };
      const [studentsRes] = await Promise.all([
        adminFetch('/api/admin/students', { headers }),
        libraries.length === 0 ? adminFetch('/api/admin/libraries', { headers }) : Promise.resolve(null),
      ]);

      if (studentsRes && studentsRes.ok) {
        const sData = await studentsRes.json();
        const rawStudents: AdminStudentItem[] = sData.students || sData.data || [];
        setStudentsList(rawStudents);
        const now = Date.now();
        setTabLastUpdated((prev) => ({ ...prev, students: now }));
        setTabLoaded((prev) => ({ ...prev, students: true }));
        await setAdminCache('admin_students', rawStudents);
      }
    } catch (err) {
      console.error('Failed to load students data:', err);
    } finally {
      setTabLoading((prev) => ({ ...prev, students: false }));
    }
  };

  const fetchPlansData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getAdminCache<AdminPlanItem[]>('admin_plans');
      if (cached?.data) {
        setPlans(cached.data);
        setTabLastUpdated((prev) => ({ ...prev, plans: cached.updatedAt }));
        setTabLoaded((prev) => ({ ...prev, plans: true }));
        if (Date.now() - cached.updatedAt < 5 * 60 * 1000) return;
      }
    }

    setTabLoading((prev) => ({ ...prev, plans: true }));
    try {
      const headers = { 'x-admin-email': currentUser.email };
      const plansRes = await adminFetch('/api/admin/plans', { headers });
      if (plansRes.ok) {
        const p = await plansRes.json();
        const planList: AdminPlanItem[] = p.plans || p.data || [];
        setPlans(planList);
        const now = Date.now();
        setTabLastUpdated((prev) => ({ ...prev, plans: now }));
        setTabLoaded((prev) => ({ ...prev, plans: true }));
        await setAdminCache('admin_plans', planList);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setTabLoading((prev) => ({ ...prev, plans: false }));
    }
  };

  const fetchCouponsData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getAdminCache<AdminCoupon[]>('admin_coupons');
      if (cached?.data) {
        setCoupons(cached.data);
        setTabLastUpdated((prev) => ({ ...prev, coupons: cached.updatedAt }));
        setTabLoaded((prev) => ({ ...prev, coupons: true }));
        if (Date.now() - cached.updatedAt < 5 * 60 * 1000) return;
      }
    }

    setTabLoading((prev) => ({ ...prev, coupons: true }));
    try {
      const headers = { 'x-admin-email': currentUser.email };
      const couponsRes = await adminFetch('/api/admin/coupons', { headers });
      if (couponsRes.ok) {
        const c = await couponsRes.json();
        const couponList: AdminCoupon[] = c.coupons || c.data || [];
        setCoupons(couponList);
        const now = Date.now();
        setTabLastUpdated((prev) => ({ ...prev, coupons: now }));
        setTabLoaded((prev) => ({ ...prev, coupons: true }));
        await setAdminCache('admin_coupons', couponList);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setTabLoading((prev) => ({ ...prev, coupons: false }));
    }
  };

  const fetchUsersData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getAdminCache<AdminUser[]>('admin_users');
      if (cached?.data) {
        setUsers(cached.data);
        setTabLastUpdated((prev) => ({ ...prev, users: cached.updatedAt }));
        setTabLoaded((prev) => ({ ...prev, users: true }));
        if (Date.now() - cached.updatedAt < 5 * 60 * 1000) return;
      }
    }

    setTabLoading((prev) => ({ ...prev, users: true }));
    try {
      const headers = { 'x-admin-email': currentUser.email };
      const usersRes = await adminFetch('/api/admin/users', { headers });
      if (usersRes.ok) {
        const u = await usersRes.json();
        const userList: AdminUser[] = u.users || u.data || [];
        setUsers(userList);
        const now = Date.now();
        setTabLastUpdated((prev) => ({ ...prev, users: now }));
        setTabLoaded((prev) => ({ ...prev, users: true }));
        await setAdminCache('admin_users', userList);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setTabLoading((prev) => ({ ...prev, users: false }));
    }
  };

  const fetchPaymentsData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getAdminCache<AdminPaymentItem[]>('admin_payments');
      if (cached?.data) {
        setPayments(cached.data);
        setTabLastUpdated((prev) => ({ ...prev, payments: cached.updatedAt }));
        setTabLoaded((prev) => ({ ...prev, payments: true }));
        if (Date.now() - cached.updatedAt < 5 * 60 * 1000) return;
      }
    }

    setTabLoading((prev) => ({ ...prev, payments: true }));
    try {
      const headers = { 'x-admin-email': currentUser.email };
      const paymentsRes = await adminFetch('/api/admin/payments', { headers });
      if (paymentsRes.ok) {
        const pData = await paymentsRes.json();
        const rawPayments = pData.payments || pData.data || [];
        const normalizedPayments: AdminPaymentItem[] = rawPayments.map((p: any) => {
          const amount = Number(p.amount ?? 0);
          const discountApplied = Number(p.discountApplied ?? p.metadata?.discountApplied ?? 0);
          const originalAmount = Number(p.originalAmount ?? (amount + discountApplied));
          const couponCode = p.couponCode || p.metadata?.couponCode || null;

          return {
            id: p.id,
            libraryId: p.libraryId || p.library?.id || '',
            libraryName: p.libraryName || p.library?.name || 'Library',
            ownerName: p.ownerName || p.user?.fullName || p.library?.owner?.fullName || 'Owner',
            ownerEmail: p.ownerEmail || p.user?.email || p.library?.owner?.email || p.library?.contactEmail || '',
            amount,
            originalAmount,
            discountApplied,
            couponCode,
            currency: p.currency || 'INR',
            status: p.status || 'PENDING',
            provider: p.provider || 'RAZORPAY',
            paymentId: p.paymentId || p.providerPaymentId || p.metadata?.razorpay_payment_id || p.id,
            orderId: p.orderId || p.providerOrderId || p.metadata?.razorpay_order_id || p.metadata?.orderId || '',
            createdAt: p.createdAt || new Date().toISOString(),
            planCode: p.planCode || p.metadata?.planCode || 'BASIC',
            planName: p.planName || p.metadata?.planName || 'Basic Plan',
            durationMonths: Number(p.durationMonths || p.metadata?.durationMonths || 1),
            adjustmentAction: p.adjustmentAction || p.metadata?.adjustmentAction,
            daysAdjusted: p.daysAdjusted !== undefined ? p.daysAdjusted : p.metadata?.daysAdjusted,
            isAutopay: Boolean(p.isAutopay ?? p.metadata?.isAutopay),
            isCancelled: Boolean(p.isCancelled ?? p.metadata?.isCancelled),
            cancellationReason: p.cancellationReason || p.metadata?.cancellationReason,
            cancelledAt: p.cancelledAt || p.metadata?.cancelledAt,
            failureReason: p.failureReason || p.metadata?.failureReason,
            statusDetail: p.statusDetail || p.metadata?.statusDetail,
          };
        });
        setPayments(normalizedPayments);
        const now = Date.now();
        setTabLastUpdated((prev) => ({ ...prev, payments: now }));
        setTabLoaded((prev) => ({ ...prev, payments: true }));
        await setAdminCache('admin_payments', normalizedPayments);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setTabLoading((prev) => ({ ...prev, payments: false }));
    }
  };

  const fetchAuditLogsData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getAdminCache<AuditLogEntry[]>('admin_audit');
      if (cached?.data) {
        setAuditLogs(cached.data);
        setTabLastUpdated((prev) => ({ ...prev, audit: cached.updatedAt }));
        setTabLoaded((prev) => ({ ...prev, audit: true }));
        if (Date.now() - cached.updatedAt < 5 * 60 * 1000) return;
      }
    }

    setTabLoading((prev) => ({ ...prev, audit: true }));
    try {
      const headers = { 'x-admin-email': currentUser.email };
      const auditRes = await adminFetch('/api/admin/audit-logs?limit=50', { headers });
      if (auditRes.ok) {
        const a = await auditRes.json();
        const logs: AuditLogEntry[] = a.logs || a.data || [];
        setAuditLogs(logs);
        const now = Date.now();
        setTabLastUpdated((prev) => ({ ...prev, audit: now }));
        setTabLoaded((prev) => ({ ...prev, audit: true }));
        await setAdminCache('admin_audit', logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setTabLoading((prev) => ({ ...prev, audit: false }));
    }
  };

  const fetchCurrentTabData = async (forceRefresh = false) => {
    switch (activeTab) {
      case 'overview':
        return fetchOverviewData(forceRefresh);
      case 'students':
        return fetchStudentsData(forceRefresh);
      case 'plans':
        return fetchPlansData(forceRefresh);
      case 'coupons':
        return fetchCouponsData(forceRefresh);
      case 'users':
        return fetchUsersData(forceRefresh);
      case 'payments':
        return fetchPaymentsData(forceRefresh);
      case 'audit':
        return fetchAuditLogsData(forceRefresh);
      case 'broadcast':
        if (libraries.length === 0) fetchOverviewData(false);
        return;
    }
  };

  const fetchAllData = async () => {
    return Promise.all([
      fetchOverviewData(true),
      fetchStudentsData(true),
      fetchPlansData(true),
      fetchCouponsData(true),
      fetchUsersData(true),
      fetchPaymentsData(true),
      fetchAuditLogsData(true),
    ]);
  };

  const renderTabRefreshButton = (tabKey: string, label: string = 'Refresh') => {
    const isThisLoading = Boolean(tabLoading[tabKey]);
    const lastUpdatedTime = tabLastUpdated[tabKey];
    const timeAgoStr = formatTimeAgo(lastUpdatedTime);

    const handleRefreshClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      switch (tabKey) {
        case 'overview': fetchOverviewData(true); break;
        case 'students': fetchStudentsData(true); break;
        case 'plans': fetchPlansData(true); break;
        case 'coupons': fetchCouponsData(true); break;
        case 'users': fetchUsersData(true); break;
        case 'payments': fetchPaymentsData(true); break;
        case 'audit': fetchAuditLogsData(true); break;
        case 'broadcast': fetchOverviewData(true); break;
      }
    };

    return (
      <button
        type="button"
        onClick={handleRefreshClick}
        disabled={isThisLoading}
        title={`Refresh ${label} data`}
        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#1c1c1e] hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 dark:border-[#2a2a2a] cursor-pointer shadow-2xs shrink-0 disabled:opacity-60"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isThisLoading ? 'animate-spin' : ''}`} />
        <span>{isThisLoading ? 'Refreshing...' : label}</span>
        {timeAgoStr && !isThisLoading && (
          <span className="text-[10px] font-normal text-slate-400 dark:text-neutral-400 border-l border-slate-200 dark:border-neutral-700 pl-1.5">
            {timeAgoStr}
          </span>
        )}
      </button>
    );
  };

  const handleOpenEditPlan = (plan: AdminPlanItem) => {
    setPlanToEdit(plan);
    setEditPlanName(plan.name);
    setEditPlanDuration(plan.durationMonths.toString());
    setEditPlanPrice(plan.priceMonthly.toString());
    setEditPlanOrigPrice(plan.originalPrice.toString());
    setEditPlanBadge(plan.badge || '');
    setEditPlanDesc(plan.description || '');
    setEditPlanActive(plan.isActive);
    setIsEditPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planToEdit) return;
    setPlanSaving(true);
    try {
      const res = await adminFetch(`/api/admin/plans/${planToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({
          name: editPlanName.trim(),
          durationMonths: parseInt(editPlanDuration, 10),
          priceMonthly: parseFloat(editPlanPrice),
          priceYearly: parseFloat(editPlanOrigPrice),
          originalPrice: parseFloat(editPlanOrigPrice),
          badge: editPlanBadge.trim(),
          description: editPlanDesc.trim(),
          isActive: editPlanActive,
        }),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Plan '${editPlanName}' updated successfully!` });
        setIsEditPlanModalOpen(false);
        setPlanToEdit(null);
        const pRes = await adminFetch('/api/admin/plans', { headers: { 'x-admin-email': currentUser.email } });
        if (pRes.ok) {
          const d = await pRes.json();
          if (d.plans) setPlans(d.plans);
        }
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to update plan' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setPlanSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanCode.trim() || !newPlanName.trim() || !newPlanPrice) return;
    setPlanSaving(true);
    try {
      const res = await adminFetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({
          code: newPlanCode.trim().toUpperCase(),
          name: newPlanName.trim(),
          durationMonths: parseInt(newPlanDuration, 10),
          priceMonthly: parseFloat(newPlanPrice),
          priceYearly: parseFloat(newPlanOrigPrice),
          originalPrice: parseFloat(newPlanOrigPrice),
          badge: newPlanBadge.trim(),
          description: newPlanDesc.trim(),
        }),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Plan '${newPlanName}' created successfully!` });
        setIsCreatePlanModalOpen(false);
        setNewPlanCode('');
        setNewPlanName('');
        const pRes = await adminFetch('/api/admin/plans', { headers: { 'x-admin-email': currentUser.email } });
        if (pRes.ok) {
          const d = await pRes.json();
          if (d.plans) setPlans(d.plans);
        }
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to create plan' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setPlanSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleTogglePlan = async (plan: AdminPlanItem) => {
    try {
      const res = await adminFetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (res.ok) {
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, isActive: !p.isActive } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle plan status:', err);
    }
  };

  useEffect(() => {
    fetchCurrentTabData(false);
  }, [activeTab, currentUser.email]);

  const handleToggleLibraryStatus = async () => {
    if (!selectedLibForToggle) return;
    setIsTogglingLib(true);
    const newStatus = !selectedLibForToggle.isActive;

    try {
      const res = await adminFetch(`/api/admin/libraries/${selectedLibForToggle.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({ isActive: newStatus, adminEmail: currentUser.email }),
      });

      if (res.ok) {
        setLibraries((prev) =>
          prev.map((lib) => (lib.id === selectedLibForToggle.id ? { ...lib, isActive: newStatus } : lib))
        );
        if (metrics) {
          setMetrics({
            ...metrics,
            activeLibraries: newStatus ? metrics.activeLibraries + 1 : metrics.activeLibraries - 1,
            suspendedLibraries: newStatus ? metrics.suspendedLibraries - 1 : metrics.suspendedLibraries + 1,
          });
        }
        setStatusMessage({
          type: 'success',
          text: `Library "${selectedLibForToggle.name}" has been ${newStatus ? 'activated' : 'suspended'}.`,
        });
        setSelectedLibForToggle(null);
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to update library status' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsTogglingLib(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDeleteLibrary = async () => {
    if (!selectedLibForDelete) return;
    setIsDeletingLib(true);
    try {
      const res = await adminFetch(`/api/admin/libraries/${selectedLibForDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-email': currentUser.email },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const deletedId = selectedLibForDelete.id;
        const deletedName = selectedLibForDelete.name;
        const isLibActive = selectedLibForDelete.isActive;
        const libStudentCount = selectedLibForDelete.counts?.students ?? (selectedLibForDelete as any).studentCount ?? 0;
        const libSeatCount = selectedLibForDelete.counts?.seats ?? (selectedLibForDelete as any).seatCount ?? 0;

        // Update libraries state
        const updatedLibs = libraries.filter((lib) => lib.id !== deletedId);
        setLibraries(updatedLibs);

        // Update students state if any belong to deleted library
        setStudentsList((prev) => prev.filter((s) => s.libraryId !== deletedId));

        // Update metrics
        if (metrics) {
          const updatedMetrics: PlatformMetrics = {
            ...metrics,
            totalLibraries: Math.max(0, metrics.totalLibraries - 1),
            activeLibraries: isLibActive ? Math.max(0, metrics.activeLibraries - 1) : metrics.activeLibraries,
            suspendedLibraries: !isLibActive ? Math.max(0, metrics.suspendedLibraries - 1) : metrics.suspendedLibraries,
            totalStudents: Math.max(0, metrics.totalStudents - libStudentCount),
            totalSeats: Math.max(0, metrics.totalSeats - libSeatCount),
          };
          setMetrics(updatedMetrics);
          await setAdminCache('admin_overview', { metrics: updatedMetrics, libraries: updatedLibs });
        } else {
          await setAdminCache('admin_overview', { metrics: null, libraries: updatedLibs });
        }

        // Invalidate students cache
        await setAdminCache('admin_students', studentsList.filter((s) => s.libraryId !== deletedId));

        setStatusMessage({
          type: 'success',
          text: `Library "${deletedName}" and all associated documents & records have been permanently deleted.`,
        });
        setSelectedLibForDelete(null);
        setDeleteConfirmLibName('');
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error?.message || data.error || 'Failed to delete library',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Network error while deleting library',
      });
    } finally {
      setIsDeletingLib(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !couponValue) return;
    setCouponSubmitting(true);

    try {
      const res = await adminFetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          discountType: couponType,
          discountValue: parseFloat(couponValue),
          maxUses: couponMaxRedemptions ? parseInt(couponMaxRedemptions, 10) : null,
          minOrderAmount: couponMinOrderAmount ? parseFloat(couponMinOrderAmount) : null,
          maxDiscount: couponMaxDiscountAmount ? parseFloat(couponMaxDiscountAmount) : null,
          validUntil: couponValidUntil ? new Date(couponValidUntil).toISOString() : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage({ type: 'success', text: `Coupon code '${data.coupon?.code || couponCode}' created successfully!` });
        setIsCreateCouponOpen(false);
        setCouponCode('');
        setCouponMinOrderAmount('');
        setCouponMaxDiscountAmount('');
        setCouponValidUntil('');
        const cRes = await adminFetch('/api/admin/coupons', { headers: { 'x-admin-email': currentUser.email } });
        if (cRes.ok) {
          const c = await cRes.json();
          if (c.coupons) setCoupons(c.coupons);
        }
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to create coupon' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setCouponSubmitting(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleOpenEditCoupon = (coupon: AdminCoupon) => {
    setCouponToEdit(coupon);
    setEditCouponCode(coupon.code);
    setEditCouponType(coupon.discountType);
    setEditCouponValue(coupon.discountValue.toString());
    setEditCouponMaxRedemptions(coupon.maxRedemptions ? coupon.maxRedemptions.toString() : '');
    setEditCouponMinOrderAmount(coupon.minOrderAmount ? coupon.minOrderAmount.toString() : '');
    setEditCouponMaxDiscountAmount(coupon.maxDiscountAmount ? coupon.maxDiscountAmount.toString() : '');
    setEditCouponValidUntil(coupon.validUntil ? coupon.validUntil.split('T')[0] : '');
    setEditCouponActive(coupon.isActive);
    setIsEditCouponOpen(true);
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponToEdit || !editCouponCode.trim() || !editCouponValue) return;
    setCouponSaving(true);

    try {
      const res = await adminFetch(`/api/admin/coupons/${couponToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({
          code: editCouponCode.trim().toUpperCase(),
          discountType: editCouponType,
          discountValue: parseFloat(editCouponValue),
          maxUses: editCouponMaxRedemptions ? parseInt(editCouponMaxRedemptions, 10) : null,
          minOrderAmount: editCouponMinOrderAmount ? parseFloat(editCouponMinOrderAmount) : null,
          maxDiscount: editCouponMaxDiscountAmount ? parseFloat(editCouponMaxDiscountAmount) : null,
          validUntil: editCouponValidUntil ? new Date(editCouponValidUntil).toISOString() : null,
          isActive: editCouponActive,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage({ type: 'success', text: `Coupon '${data.coupon?.code || editCouponCode}' updated successfully!` });
        setIsEditCouponOpen(false);
        setCouponToEdit(null);

        const cRes = await adminFetch('/api/admin/coupons', { headers: { 'x-admin-email': currentUser.email } });
        if (cRes.ok) {
          const c = await cRes.json();
          if (c.coupons) setCoupons(c.coupons);
        }
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to update coupon' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setCouponSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!selectedCouponForDelete) return;
    setIsDeletingCoupon(true);

    try {
      const res = await adminFetch(`/api/admin/coupons/${selectedCouponForDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-email': currentUser.email },
      });

      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== selectedCouponForDelete.id));
        setStatusMessage({
          type: 'success',
          text: `Coupon '${selectedCouponForDelete.code}' deleted successfully!`,
        });
        setSelectedCouponForDelete(null);
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to delete coupon' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setIsDeletingCoupon(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleToggleCoupon = async (couponId: string) => {
    try {
      const res = await adminFetch(`/api/admin/coupons/${couponId}/toggle`, {
        method: 'PUT',
        headers: { 'x-admin-email': currentUser.email },
      });

      if (res.ok) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === couponId ? { ...c, isActive: !c.isActive } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle coupon:', err);
    }
  };

  const filteredLibraries = libraries.filter((lib) => {
    const matchesSearch =
      lib.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lib.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lib.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lib.address && lib.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (libraryFilter === 'active') return matchesSearch && lib.isActive;
    if (libraryFilter === 'suspended') return matchesSearch && !lib.isActive;
    return matchesSearch;
  });

  if (isLoading && !metrics) {
    return <AdminSkeleton />;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Super Admin Top Banner */}
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white rounded-2xl p-5 md:p-6 shadow-xs dark:shadow-xl border border-slate-200 dark:border-[#262626]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Super Admin Portal</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30">
                  Root Admin
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Platform governance, multi-tenant libraries, users, coupons & audit logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Theme Switcher Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#2c2c2e] rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-[#2a2a2a] cursor-pointer shadow-xs"
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline font-semibold">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-neutral-400" />
                  <span className="hidden sm:inline font-semibold">Dark</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                fetchOverviewData(true);
                if (activeTab !== 'overview') fetchCurrentTabData(true);
              }}
              disabled={tabLoading[activeTab] || tabLoading.overview}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#2c2c2e] rounded-xl transition-colors flex items-center gap-2 border border-slate-200 dark:border-[#2a2a2a] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tabLoading[activeTab] || tabLoading.overview ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {onSwitchToLibraryView && (
              <button
                onClick={() => onSwitchToLibraryView()}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Switch to User Library View"
              >
                <Layers className="w-3.5 h-3.5" />
                Switch to Library View
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 cursor-pointer shadow-xs"
                title="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Global Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-[#262626]">
          <div className="bg-slate-50 dark:bg-[#18181b] rounded-xl p-3.5 border border-slate-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Libraries</span>
              <Building2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics?.totalLibraries ?? libraries.length}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              {metrics?.activeLibraries ?? libraries.filter((l) => l.isActive).length} active
            </div>
          </div>

          <div
            onClick={() => {
              setStudentLibraryFilter('ALL');
              setActiveTab('students');
            }}
            className="bg-slate-50 dark:bg-[#18181b] rounded-xl p-3.5 border border-slate-200 dark:border-[#2a2a2a] cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-semibold transition-colors">Students</span>
              <GraduationCap className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics?.totalStudents ?? studentsList.length}
            </div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium flex items-center gap-1">
              <span>View all students</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#18181b] rounded-xl p-3.5 border border-slate-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Seats</span>
              <Armchair className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics?.totalSeats ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Physical capacity</div>
          </div>

          <div className="bg-slate-50 dark:bg-[#18181b] rounded-xl p-3.5 border border-slate-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Users</span>
              <Users className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics?.totalUsers ?? users.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Registered</div>
          </div>

          <div className="bg-slate-50 dark:bg-[#18181b] rounded-xl p-3.5 border border-slate-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Subscriptions</span>
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics?.activeSubscriptions ?? 0}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-0.5 font-medium">Active plans</div>
          </div>

          <div className="bg-slate-50 dark:bg-[#18181b] rounded-xl p-3.5 border border-slate-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Revenue</span>
              <IndianRupee className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              ₹{(metrics?.totalRevenue ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Total collected</div>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation */}
      <div className="flex border-b border-slate-200 dark:border-[#262626] overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          All Libraries ({libraries.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'students'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>All Students ({studentsList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'plans'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          Subscription Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'coupons'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          Coupons & Offers ({coupons.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          Platform Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          Payments Ledger ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'broadcast'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Push Broadcast</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: ALL LIBRARIES */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search libraries by name, owner, or city..."
                className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex bg-slate-100 dark:bg-[#1c1c1e] p-1 rounded-xl border border-slate-200 dark:border-[#2a2a2a] text-xs font-medium">
                <button
                  onClick={() => setLibraryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    libraryFilter === 'all'
                      ? 'bg-white dark:bg-[#2a2a2a] text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({libraries.length})
                </button>
                <button
                  onClick={() => setLibraryFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    libraryFilter === 'active'
                      ? 'bg-white dark:bg-[#2a2a2a] text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-emerald-400'
                  }`}
                >
                  Active ({libraries.filter((l) => l.isActive).length})
                </button>
                <button
                  onClick={() => setLibraryFilter('suspended')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    libraryFilter === 'suspended'
                      ? 'bg-white dark:bg-[#2a2a2a] text-rose-700 dark:text-rose-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-rose-700 dark:hover:text-rose-400'
                  }`}
                >
                  Suspended ({libraries.filter((l) => !l.isActive).length})
                </button>
              </div>
              {renderTabRefreshButton('overview', 'Refresh')}
            </div>
          </div>

          {filteredLibraries.length === 0 ? (
            <div className="bg-white dark:bg-[#121212] rounded-2xl p-12 text-center border border-slate-200 dark:border-[#262626] shadow-xs">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">No libraries found</h3>
              <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                {searchQuery ? 'Try adjusting your search terms or filters.' : 'No libraries registered on the platform yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#262626] text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Library</th>
                      <th className="px-5 py-3.5">Owner</th>
                      <th className="px-5 py-3.5">Stats</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Created</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#222222]">
                    {filteredLibraries.map((lib) => (
                      <tr key={lib.id} className="hover:bg-slate-50/75 dark:hover:bg-[#1c1c1e]/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{lib.name}</div>
                          <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                            <span>{lib.address || 'Address not set'}</span>
                            <span>·</span>
                            <span className="font-mono text-[11px] text-slate-400 dark:text-neutral-500">/{lib.slug}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800 dark:text-neutral-200">{lib.owner?.fullName || 'Owner'}</div>
                          <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
                            <span>{lib.owner?.email}</span>
                          </div>
                          {lib.contactPhone && (
                            <div className="text-xs text-slate-400 dark:text-neutral-500 flex items-center gap-1.5">
                              <Phone className="w-3 h-3" />
                              <span>{lib.contactPhone}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-[#1e1e1e] text-slate-700 dark:text-neutral-300 font-medium">
                              {lib.counts?.seats ?? (lib as any).seatCount ?? (lib as any).totalSeats ?? 0} Seats
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setStudentLibraryFilter(lib.id);
                                setActiveTab('students');
                              }}
                              title="Click to view this library's enrolled students"
                              className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>{lib.counts?.students ?? (lib as any).studentCount ?? (lib as any).totalStudents ?? 0} Students</span>
                            </button>
                            <span className="text-slate-400 dark:text-neutral-500">
                              {lib.counts?.rooms ?? (lib as any).roomCount ?? 0} Rooms
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            {lib.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Suspended
                              </span>
                            )}

                            {/* Autopay & Subscription Badge */}
                            {lib.subscription ? (
                              lib.subscription.autoRenew ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 w-fit">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                  Autopay Active
                                </span>
                              ) : lib.subscription.autoRenewCancelledAt ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 w-fit"
                                  title={`Autopay cancelled on ${new Date(lib.subscription.autoRenewCancelledAt).toLocaleDateString('en-IN')}`}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                  Autopay Cancelled
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium">
                                  One-time Sub (until {lib.subscription.validUntil})
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-neutral-500 italic">No Sub</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 dark:text-neutral-400">
                          {new Date(lib.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setStudentLibraryFilter(lib.id);
                                setActiveTab('students');
                              }}
                              title="View all students enrolled in this library"
                              className="p-2 text-slate-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <GraduationCap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openInspectModal(lib.id)}
                              title="Inspect library floor plan"
                              className="p-2 text-slate-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedLibForSubAdjust(lib)}
                              title="Manage / Increase / Decrease Subscription Validity"
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/50 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>Sub</span>
                            </button>
                            <button
                              onClick={() => setSelectedLibForToggle(lib)}
                              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                                lib.isActive
                                    ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                    : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              {lib.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLibForDelete(lib);
                                setDeleteConfirmLibName('');
                              }}
                              title="Delete library and all related records"
                              className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40 hover:border-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL STUDENTS DIRECTORY */}
      {activeTab === 'students' && (() => {
        const filteredStudents = studentsList.filter((s) => {
          // Library filter
          if (studentLibraryFilter !== 'ALL' && s.libraryId !== studentLibraryFilter) {
            return false;
          }
          // Status filter
          if (studentStatusFilter === 'ACTIVE' && s.membership?.status !== 'ACTIVE') return false;
          if (studentStatusFilter === 'EXPIRED' && s.membership?.status !== 'EXPIRED') return false;
          if (studentStatusFilter === 'DUE' && (!s.remainingDue || s.remainingDue <= 0)) return false;
          if (studentStatusFilter === 'MORNING' && s.seat?.shift !== 'MORNING' && s.membership?.shift !== 'MORNING') return false;
          if (studentStatusFilter === 'EVENING' && s.seat?.shift !== 'EVENING' && s.membership?.shift !== 'EVENING') return false;
          if (studentStatusFilter === 'FULL_DAY' && s.seat?.shift !== 'FULL_DAY' && s.membership?.shift !== 'FULL_DAY') return false;

          // Search query
          if (studentSearchQuery.trim()) {
            const q = studentSearchQuery.trim().toLowerCase();
            const matchName = s.fullName.toLowerCase().includes(q);
            const matchPhone = s.phone.includes(q);
            const matchEmail = s.email?.toLowerCase().includes(q) || false;
            const matchFather = s.fatherName?.toLowerCase().includes(q) || false;
            const matchPurpose = s.studyPurpose?.toLowerCase().includes(q) || false;
            const matchLib = s.libraryName.toLowerCase().includes(q);
            const matchSeat = s.seat?.seatNumber?.toLowerCase().includes(q) || false;
            return matchName || matchPhone || matchEmail || matchFather || matchPurpose || matchLib || matchSeat;
          }
          return true;
        });

        const activeCount = studentsList.filter((s) => s.membership?.status === 'ACTIVE').length;
        const expiredCount = studentsList.filter((s) => s.membership?.status === 'EXPIRED').length;
        const dueCount = studentsList.filter((s) => s.remainingDue && s.remainingDue > 0).length;

        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search students by name, phone, email, father's name, or study purpose..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                  />
                </div>

                {/* Library Filter Dropdown */}
                <div className="relative min-w-[200px]">
                  <select
                    value={studentLibraryFilter}
                    onChange={(e) => setStudentLibraryFilter(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-neutral-200 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs cursor-pointer"
                  >
                    <option value="ALL">🏢 All Libraries ({libraries.length})</option>
                    {libraries.map((lib) => (
                      <option key={lib.id} value={lib.id}>
                        {lib.name} ({lib.counts?.students ?? 0} students)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter Pills + Refresh */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <div className="flex flex-wrap items-center bg-slate-100 dark:bg-[#1c1c1e] p-1 rounded-xl text-xs font-semibold gap-1 border border-slate-200 dark:border-[#2a2a2a]">
                  <button
                    type="button"
                    onClick={() => setStudentStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      studentStatusFilter === 'ALL'
                        ? 'bg-white dark:bg-[#2a2a2a] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    All ({filteredStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentStatusFilter('ACTIVE')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      studentStatusFilter === 'ACTIVE'
                        ? 'bg-white dark:bg-[#2a2a2a] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                        : 'text-slate-500 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentStatusFilter('EXPIRED')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      studentStatusFilter === 'EXPIRED'
                        ? 'bg-white dark:bg-[#2a2a2a] text-rose-700 dark:text-rose-400 shadow-xs font-bold'
                        : 'text-slate-500 dark:text-neutral-400 hover:text-rose-700 dark:hover:text-rose-400'
                    }`}
                  >
                    Expired ({expiredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentStatusFilter('DUE')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      studentStatusFilter === 'DUE'
                        ? 'bg-white dark:bg-[#2a2a2a] text-amber-700 dark:text-amber-400 shadow-xs font-bold'
                        : 'text-slate-500 dark:text-neutral-400 hover:text-amber-700 dark:hover:text-amber-400'
                    }`}
                  >
                    Due Pending ({dueCount})
                  </button>
                </div>
                {renderTabRefreshButton('students', 'Refresh')}
              </div>
            </div>

            {/* Table */}
            {filteredStudents.length === 0 ? (
              <div className="bg-white dark:bg-[#121212] rounded-2xl p-12 text-center border border-slate-200 dark:border-[#262626] shadow-xs">
                <GraduationCap className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">No students found</h3>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  {studentSearchQuery || studentLibraryFilter !== 'ALL' || studentStatusFilter !== 'ALL'
                    ? 'Try adjusting your search query or filters.'
                    : 'No students enrolled across any library branch yet.'}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#262626] text-slate-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5">Student</th>
                        <th className="px-4 py-3.5">Library / Branch</th>
                        <th className="px-4 py-3.5">Seat & Shift</th>
                        <th className="px-4 py-3.5">Membership</th>
                        <th className="px-4 py-3.5">Fee & Due</th>
                        <th className="px-4 py-3.5">KYC / Doc</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#222222] text-slate-700 dark:text-neutral-300">
                      {filteredStudents.map((std) => (
                        <tr key={std.id} className="hover:bg-slate-50/70 dark:hover:bg-[#1c1c1e]/60 transition-colors">
                          {/* Student info */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {std.photoUrl ? (
                                <img
                                  src={std.photoUrl}
                                  alt={std.fullName}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-neutral-700"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs border border-indigo-200 dark:border-indigo-800">
                                  {std.fullName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{std.fullName}</span>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{std.phone}</span>
                                </div>
                                {std.studyPurpose && (
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
                                    🎯 {std.studyPurpose}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Library / Branch */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-white block">{std.libraryName}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1e1e1e] text-slate-600 dark:text-neutral-400">
                                /{std.librarySlug}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mt-0.5">
                              Owner: {std.ownerName}
                            </span>
                          </td>

                          {/* Seat & Shift */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {std.seat ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-[11px]">
                                  <Armchair className="w-3 h-3" />
                                  Seat {std.seat.seatNumber}
                                </span>
                                {std.seat.roomName && (
                                  <div className="text-[10px] text-slate-400 dark:text-neutral-500">
                                    {std.seat.roomName} {std.seat.rowName ? `· ${std.seat.rowName}` : ''}
                                  </div>
                                )}
                                <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                  {std.seat.shift === 'MORNING' ? 'Morning' : std.seat.shift === 'EVENING' ? 'Evening' : 'Full Day'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-neutral-500 italic">No Seat Assigned</span>
                            )}
                          </td>

                          {/* Membership */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {std.membership ? (
                              <div className="space-y-0.5">
                                {std.membership.status === 'ACTIVE' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    ACTIVE
                                  </span>
                                ) : std.membership.status === 'EXPIRED' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    EXPIRED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#222] text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-[#333]">
                                    {std.membership.status}
                                  </span>
                                )}
                                {std.membership.endDate && (
                                  <div className="text-[10px] text-slate-400 dark:text-neutral-500">
                                    Valid till: {new Date(std.membership.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-neutral-500 italic">No Membership</span>
                            )}
                          </td>

                          {/* Fee & Due */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">
                              ₹{(std.membership?.feeAmount || 0).toLocaleString('en-IN')}/mo
                            </div>
                            {std.remainingDue && std.remainingDue > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 mt-0.5">
                                Due: ₹{std.remainingDue.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">All Clear</span>
                            )}
                          </td>

                          {/* KYC / Doc */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {std.kycDocId || std.kycPhotoUrl ? (
                              <div className="flex items-center gap-2.5">
                                {std.kycPhotoUrl ? (
                                  <div
                                    className="relative group cursor-pointer shrink-0"
                                    onClick={() => setAdminPreviewingImage(std.kycPhotoUrl || null)}
                                  >
                                    <img
                                      src={std.kycPhotoUrl}
                                      alt="KYC Document"
                                      className="w-11 h-8 object-cover rounded-md border border-slate-200 dark:border-[#363636] shadow-2xs group-hover:scale-105 group-hover:border-indigo-500 transition-all"
                                      title="Click to view KYC document image"
                                    />
                                    <div className="absolute inset-0 bg-black/30 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <ZoomIn className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                                  </div>
                                )}

                                <div className="space-y-0.5">
                                  {std.kycDocId && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1e1e1e] text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-[#2a2a2a]">
                                      <FileText className="w-3 h-3 text-indigo-500" />
                                      {std.kycDocType || 'AADHAAR'}: {std.kycDocId}
                                    </span>
                                  )}
                                  {std.kycPhotoUrl ? (
                                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> WebP Document
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                                      No Image Attached
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-neutral-500 italic">Not Submitted</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {std.kycPhotoUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStudentForInspect(std);
                                    setInspectStudentTab('kyc');
                                    setIsInspectStudentModalOpen(true);
                                  }}
                                  title="View KYC Document"
                                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800/50 transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>KYC</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForInspect(std);
                                  setInspectStudentTab('profile');
                                  setIsInspectStudentModalOpen(true);
                                }}
                                title="Inspect Student Profile"
                                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-800/50 transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Profile</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: SUBSCRIPTION PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Subscription Plans & Pricing</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Configure user plans, duration, pricing & discounts. All plans include 100% full platform features.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {renderTabRefreshButton('plans', 'Refresh Plans')}
              <button
                onClick={() => setIsCreatePlanModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create New Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white dark:bg-[#121212] rounded-2xl p-5 border shadow-xs relative overflow-hidden flex flex-col justify-between transition-all ${
                  plan.isActive ? 'border-slate-200 dark:border-[#262626]' : 'border-slate-200 dark:border-[#262626] opacity-60 bg-slate-50/50 dark:bg-[#18181b]/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{plan.name}</h3>
                        {plan.badge && (
                          <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-full">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                        Duration: {plan.durationMonths} Month{plan.durationMonths > 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      onClick={() => handleTogglePlan(plan)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                        plan.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
                          : 'bg-slate-100 dark:bg-[#1e1e1e] text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-[#2a2a2a] hover:bg-slate-200 dark:hover:bg-[#2c2c2e]'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262626]">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        ₹{plan.priceMonthly.toLocaleString('en-IN')}
                      </span>
                      {plan.originalPrice > plan.priceMonthly && (
                        <span className="text-xs text-slate-400 dark:text-neutral-500 line-through">
                          ₹{plan.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    {plan.originalPrice > plan.priceMonthly && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        Discounted by ₹{(plan.originalPrice - plan.priceMonthly).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 dark:bg-[#18181b] rounded-xl border border-slate-100 dark:border-[#262626] text-[11px] text-slate-600 dark:text-neutral-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>All Platform Features Unlocked</span>
                    </div>
                    <p className="text-slate-500 dark:text-neutral-400 leading-snug">
                      {plan.description || 'Full student admission, fee collection, seats, and monthly plans.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 uppercase">
                    Code: {plan.code}
                  </span>
                  <button
                    onClick={() => handleOpenEditPlan(plan)}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-[#222224] hover:bg-slate-800 dark:hover:bg-[#2c2c2e] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-[#333333]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Price & Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Platform Promotion Coupons</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Manage promotional discounts for SaaS subscriptions</p>
            </div>
            <div className="flex items-center gap-2">
              {renderTabRefreshButton('coupons', 'Refresh Coupons')}
              <button
                onClick={() => setIsCreateCouponOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Coupon
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-white dark:bg-[#121212] rounded-2xl p-5 border border-slate-200 dark:border-[#262626] shadow-xs relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-lg font-extrabold tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                      {coupon.code}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleCoupon(coupon.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                          coupon.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
                            : 'bg-slate-100 dark:bg-[#1e1e1e] text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-[#2a2a2a] hover:bg-slate-200 dark:hover:bg-[#2c2c2e]'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditCoupon(coupon)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-[#2a2a2a] rounded-lg transition-colors cursor-pointer"
                        title="Edit Coupon"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCouponForDelete(coupon)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-[#2a2a2a] rounded-lg transition-colors cursor-pointer"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue} OFF`}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400">
                      Redeemed: <span className="font-semibold text-slate-800 dark:text-neutral-200">{coupon.usageCount}</span>
                      {coupon.maxRedemptions && ` / ${coupon.maxRedemptions} max`}
                    </div>
                    {(coupon.minOrderAmount || coupon.maxDiscountAmount) && (
                      <div className="text-[11px] text-slate-400 dark:text-neutral-500 flex items-center gap-2">
                        {coupon.minOrderAmount && <span>Min: ₹{coupon.minOrderAmount}</span>}
                        {coupon.minOrderAmount && coupon.maxDiscountAmount && <span>·</span>}
                        {coupon.maxDiscountAmount && <span>Max: ₹{coupon.maxDiscountAmount}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-[11px] text-slate-400 dark:text-neutral-500">
                  <span>Expires {coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString('en-IN') : 'No expiry'}</span>
                  <span>Limit: {coupon.perUserLimit || 1}/user</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-[#262626] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Registered Platform Users</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">All registered library owners, staff, and super administrators</p>
            </div>
            {renderTabRefreshButton('users', 'Refresh Users')}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#262626] text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Global Role</th>
                  <th className="px-5 py-3">Libraries</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#222222]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/75 dark:hover:bg-[#1c1c1e]/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{u.fullName}</div>
                      <div className="text-xs text-slate-500 dark:text-neutral-400">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-neutral-300">
                      {u.phone || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 inline-flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-600" />
                          SUPER_ADMIN
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#1e1e1e] text-slate-700 dark:text-neutral-300">
                          USER
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700 dark:text-neutral-300">
                      {u.librariesCount} {u.librariesCount === 1 ? 'branch' : 'branches'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 dark:text-neutral-500">
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {u.role === 'SUPER_ADMIN' ? (
                        <button
                          type="button"
                          disabled={updatingUserId === u.id || u.email.toLowerCase() === currentUser.email.toLowerCase()}
                          onClick={() => handleUpdateUserRole(u, 'USER')}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-rose-100 hover:text-rose-700 transition-colors disabled:opacity-40 cursor-pointer"
                          title={u.email.toLowerCase() === currentUser.email.toLowerCase() ? "Cannot demote active logged-in admin" : "Demote to USER"}
                        >
                          {updatingUserId === u.id ? 'Updating...' : 'Demote to USER'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingUserId === u.id}
                          onClick={() => handleUpdateUserRole(u, 'SUPER_ADMIN')}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1 inline-flex"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          {updatingUserId === u.id ? 'Updating...' : 'Make Super Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Platform Payments Ledger</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                All platform payment transactions across branches (Success, Initiated, Rejected & Cancelled Autopay)
              </p>
            </div>

            {/* Filter Pills + Refresh */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <div className="flex flex-wrap items-center bg-slate-100 dark:bg-[#1c1c1e] p-1 rounded-xl text-xs font-semibold gap-1 border border-slate-200 dark:border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => setAdminPaymentFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminPaymentFilter === 'ALL'
                      ? 'bg-white dark:bg-[#2a2a2a] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  All ({payments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPaymentFilter('SUCCESS')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminPaymentFilter === 'SUCCESS'
                      ? 'bg-white dark:bg-[#2a2a2a] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-emerald-400'
                  }`}
                >
                  Success ({payments.filter((p) => p.status === 'SUCCESS').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPaymentFilter('CANCELLED_AUTOPAY')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    adminPaymentFilter === 'CANCELLED_AUTOPAY'
                      ? 'bg-white dark:bg-[#2a2a2a] text-rose-700 dark:text-rose-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-rose-700 dark:hover:text-rose-400'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelled Autopay ({payments.filter((p) => p.isCancelled).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPaymentFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminPaymentFilter === 'PENDING'
                      ? 'bg-white dark:bg-[#2a2a2a] text-amber-700 dark:text-amber-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-amber-700 dark:hover:text-amber-400'
                  }`}
                >
                  Initiated ({payments.filter((p) => p.status === 'PENDING').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPaymentFilter('FAILED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminPaymentFilter === 'FAILED'
                      ? 'bg-white dark:bg-[#2a2a2a] text-rose-700 dark:text-rose-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-rose-700 dark:hover:text-rose-400'
                  }`}
                >
                  Rejected ({payments.filter((p) => p.status === 'FAILED' && !p.isCancelled).length})
                </button>
              </div>
              {renderTabRefreshButton('payments', 'Refresh')}
            </div>
          </div>

          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs overflow-hidden">
            {(() => {
              const filteredPayments = payments.filter((p) => {
                if (adminPaymentFilter === 'ALL') return true;
                if (adminPaymentFilter === 'CANCELLED_AUTOPAY') return p.isCancelled;
                if (adminPaymentFilter === 'FAILED') return p.status === 'FAILED' && !p.isCancelled;
                return p.status === adminPaymentFilter;
              });

              if (filteredPayments.length === 0) {
                return (
                  <div className="p-12 text-center text-xs text-slate-500 dark:text-neutral-400">
                    No payments found for this filter.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#18181b] border-b border-slate-200 dark:border-[#262626] text-slate-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Date & Time</th>
                        <th className="px-4 py-3">Library / Branch</th>
                        <th className="px-4 py-3">Plan & Renewal Mode</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Payment / Order ID</th>
                        <th className="px-5 py-3 text-right">Status & Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#222222] text-slate-700 dark:text-neutral-300">
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-[#1c1c1e]/60 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {new Date(p.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                              {new Date(p.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-white block">{p.libraryName || 'Library'}</span>
                            <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">
                              {p.ownerName} {p.ownerEmail ? `(${p.ownerEmail})` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 dark:text-white block">{p.planName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {(() => {
                                const isDecrease = p.adjustmentAction === 'DECREASE' || p.durationMonths < 0 || Boolean(p.daysAdjusted && p.daysAdjusted < 0);
                                const monthsAbs = Math.abs(p.durationMonths || 1);
                                return (
                                  <span className={`text-[10px] font-bold font-mono ${isDecrease ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                    {isDecrease ? '-' : '+'}{monthsAbs} Month{monthsAbs > 1 ? 's' : ''}
                                  </span>
                                );
                              })()}
                              {p.isAutopay && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Autopay
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {p.amount > 0 ? `₹${p.amount.toLocaleString('en-IN')}` : '₹0 (Free)'}
                            </div>
                            {p.discountApplied && p.discountApplied > 0 ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 inline-flex items-center gap-0.5">
                                  <Tag className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                  {p.couponCode ? p.couponCode : 'Coupon'} (-₹{p.discountApplied.toLocaleString('en-IN')})
                                </span>
                                {p.originalAmount && p.originalAmount > p.amount && (
                                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 line-through">
                                    ₹{p.originalAmount.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {p.paymentId ? (
                              <span className="font-mono text-[11px] text-slate-700 dark:text-neutral-300 block select-all font-medium">
                                {p.paymentId}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-neutral-500 text-[11px] italic block">—</span>
                            )}
                            {p.orderId ? (
                              <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono block select-all">
                                Order: {p.orderId}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            {p.isCancelled ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  AUTOPAY CANCELLED
                                </span>
                                {p.cancellationReason && (
                                  <span className="text-[10px] text-slate-500 dark:text-neutral-400 max-w-[220px] truncate text-right" title={p.cancellationReason}>
                                    Reason: {p.cancellationReason}
                                  </span>
                                )}
                              </div>
                            ) : p.status === 'SUCCESS' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                SUCCESS
                              </span>
                            ) : p.status === 'FAILED' ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  REJECTED
                                </span>
                                {p.failureReason && (
                                  <span
                                    className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[200px] truncate text-right font-medium"
                                    title={p.failureReason}
                                  >
                                    {p.failureReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  INITIATED
                                </span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending checkout</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-[#262626] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">System Audit Trail</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Security and administrative actions executed on the platform</p>
            </div>
            {renderTabRefreshButton('audit', 'Refresh Logs')}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#222222] max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-neutral-400">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-[#1c1c1e]/60 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-100 dark:bg-[#1e1e1e] text-slate-800 dark:text-neutral-200">
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-neutral-500">on {log.entityType}</span>
                      {log.libraryName && (
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                          {log.libraryName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-neutral-300">
                      Executed by <span className="font-semibold text-slate-900 dark:text-white">{log.actorName}</span> ({log.actorEmail || 'System'})
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 dark:text-neutral-500 shrink-0">
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: PUSH BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-[#262626]">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Dispatch Push Broadcast</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Send manual push notifications directly to users' devices through the PWA Service Worker.
                </p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="mt-5 space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Notification Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 📢 Important Notice: System Maintenance Tonight"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Notification Message Body
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. We are performing regular server optimizations between 11 PM and 12 AM. Please finalize any pending student fee entries."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs cursor-pointer"
                  >
                    <option value="ALL">All Library Owners (Global)</option>
                    <option value="LIBRARY">Specific Library Branch</option>
                  </select>
                </div>

                {broadcastTarget === 'LIBRARY' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Select Library Branch
                    </label>
                    <select
                      value={broadcastLibraryId}
                      onChange={(e) => setBroadcastLibraryId(e.target.value)}
                      required={broadcastTarget === 'LIBRARY'}
                      className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs cursor-pointer"
                    >
                      <option value="">Select a library...</option>
                      {libraries.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.owner.fullName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Click Action URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /"
                    value={broadcastUrl}
                    onChange={(e) => setBroadcastUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${isBroadcasting ? 'animate-spin' : ''}`} />
                  <span>{isBroadcasting ? 'Dispatching Push...' : 'Send Push Notification Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE COUPON */}
      {isCreateCouponOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-[#262626]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Create Platform Coupon
              </h3>
              <button onClick={() => setIsCreateCouponOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold uppercase text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Discount Type</label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs cursor-pointer"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Value</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="20"
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={couponMaxRedemptions}
                    onChange={(e) => setCouponMaxRedemptions(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={couponValidUntil}
                    onChange={(e) => setCouponValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={couponMinOrderAmount}
                    onChange={(e) => setCouponMinOrderAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={couponMaxDiscountAmount}
                    onChange={(e) => setCouponMaxDiscountAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsCreateCouponOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {couponSubmitting ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COUPON */}
      {isEditCouponOpen && couponToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-[#262626]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Coupon Code</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">{couponToEdit.code}</p>
                </div>
              </div>
              <button onClick={() => setIsEditCouponOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME50"
                  value={editCouponCode}
                  onChange={(e) => setEditCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold uppercase text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Discount Type</label>
                  <select
                    value={editCouponType}
                    onChange={(e) => setEditCouponType(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs cursor-pointer"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Value</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="20"
                    value={editCouponValue}
                    onChange={(e) => setEditCouponValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={editCouponMaxRedemptions}
                    onChange={(e) => setEditCouponMaxRedemptions(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editCouponValidUntil}
                    onChange={(e) => setEditCouponValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={editCouponMinOrderAmount}
                    onChange={(e) => setEditCouponMinOrderAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={editCouponMaxDiscountAmount}
                    onChange={(e) => setEditCouponMaxDiscountAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editCouponActive"
                  checked={editCouponActive}
                  onChange={(e) => setEditCouponActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="editCouponActive" className="text-xs font-semibold text-slate-700 dark:text-neutral-300 cursor-pointer">
                  Coupon is Active & Redeemable
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsEditCouponOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={couponSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {couponSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE COUPON CONFIRMATION */}
      {selectedCouponForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-[#262626]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/40">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-slate-900 dark:text-white">
              Delete Coupon Code?
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 text-center mt-2 leading-relaxed">
              Are you sure you want to permanently delete coupon <span className="font-mono font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-[#1e1e1e] px-1.5 py-0.5 rounded">'{selectedCouponForDelete.code}'</span>? Users will no longer be able to apply this discount.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={isDeletingCoupon}
                onClick={() => setSelectedCouponForDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#2c2c2e] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCoupon}
                onClick={handleDeleteCoupon}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingCoupon ? 'Deleting...' : 'Delete Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PLAN */}
      {isEditPlanModalOpen && planToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-[#262626] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Plan: {planToEdit.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">Code: {planToEdit.code}</p>
                </div>
              </div>
              <button onClick={() => setIsEditPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Plan Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basic, Advance, Pro"
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Duration (Months)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="e.g. 1, 3, 12"
                    value={editPlanDuration}
                    onChange={(e) => setEditPlanDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">1 = 1 Month, 3 = 3 Months, 12 = 1 Year</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Highlight Badge (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Popular, Best Value, Starter"
                    value={editPlanBadge}
                    onChange={(e) => setEditPlanBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Selling / Final Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 1999"
                      value={editPlanPrice}
                      onChange={(e) => setEditPlanPrice(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Amount the user actually pays</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Original Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 2499"
                      value={editPlanOrigPrice}
                      onChange={(e) => setEditPlanOrigPrice(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">Crossed-out original price</p>
                </div>
              </div>

              {parseFloat(editPlanOrigPrice) > parseFloat(editPlanPrice) && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Display Discount:</span>
                  <span className="font-bold">
                    ₹{(parseFloat(editPlanOrigPrice) - parseFloat(editPlanPrice)).toLocaleString('en-IN')} OFF (
                    {Math.round(((parseFloat(editPlanOrigPrice) - parseFloat(editPlanPrice)) / parseFloat(editPlanOrigPrice)) * 100)}% discount)
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Description / Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Complete library access for 3 months with all features included"
                  value={editPlanDesc}
                  onChange={(e) => setEditPlanDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-[#262626] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Active Status</span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">Show this plan to users during checkout</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPlanActive}
                    onChange={(e) => setEditPlanActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsEditPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {planSaving ? 'Saving...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PLAN */}
      {isCreatePlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-[#262626] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Subscription Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">Configure duration, price, and discounts</p>
                </div>
              </div>
              <button onClick={() => setIsCreatePlanModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Unique Plan Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HALF_YEARLY"
                    value={newPlanCode}
                    onChange={(e) => setNewPlanCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold uppercase text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Half-Yearly (6 Months)"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="e.g. 6"
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">Number of months of validity</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Highlight Badge (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Special Offer, Value Pack"
                    value={newPlanBadge}
                    onChange={(e) => setNewPlanBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Selling / Final Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 3499"
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Amount the user pays</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Original Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 4499"
                      value={newPlanOrigPrice}
                      onChange={(e) => setNewPlanOrigPrice(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">Crossed-out original price</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Description / Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. 6 Months access with full platform features included"
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800/50 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>All platform features (students, seats, fee collection, SMS alerts) are automatically enabled for this plan.</span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsCreatePlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {planSaving ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM SUSPEND/ACTIVATE LIBRARY */}
      {selectedLibForToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-[#262626]">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedLibForToggle.isActive ? 'Suspend Library' : 'Activate Library'}
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedLibForToggle.isActive ? 'suspend' : 'activate'}
              </span>{' '}
              the library <span className="font-semibold text-indigo-700 dark:text-indigo-400">"{selectedLibForToggle.name}"</span>?
              {selectedLibForToggle.isActive && (
                <span className="block mt-1 text-xs text-rose-600 dark:text-rose-400">
                  Suspended libraries cannot be accessed by students or staff.
                </span>
              )}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLibForToggle(null)}
                disabled={isTogglingLib}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleLibraryStatus}
                disabled={isTogglingLib}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors shadow-xs cursor-pointer ${
                  selectedLibForToggle.isActive
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isTogglingLib ? 'Updating...' : selectedLibForToggle.isActive ? 'Suspend Library' : 'Activate Library'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE LIBRARY */}
      {selectedLibForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-[#262626]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Library Permanently
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                    Irreversible action: All tenant records will be purged from database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedLibForDelete(null);
                  setDeleteConfirmLibName('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/80 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  Warning: The following data will be permanently wiped:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-neutral-300">
                  <li>
                    <strong>{selectedLibForDelete.counts?.students ?? (selectedLibForDelete as any).studentCount ?? 0} Students</strong> profiles, uploaded photos & KYC documents
                  </li>
                  <li>
                    <strong>{selectedLibForDelete.counts?.seats ?? (selectedLibForDelete as any).seatCount ?? 0} Seats</strong>, rooms & floor arrangements
                  </li>
                  <li>
                    All memberships, active seat allocations & student attendance history
                  </li>
                  <li>
                    All fee transactions, payment receipts & ledger records
                  </li>
                  <li>
                    Subscriptions, push alert tokens & staff branch authorizations
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Type <span className="font-mono text-rose-600 dark:text-rose-400 font-bold select-all">"{selectedLibForDelete.name}"</span> to confirm deletion:
                </label>
                <input
                  type="text"
                  value={deleteConfirmLibName}
                  onChange={(e) => setDeleteConfirmLibName(e.target.value)}
                  placeholder={selectedLibForDelete.name}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 bg-white dark:bg-[#18181b] border border-rose-300 dark:border-rose-900/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs font-medium"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-[#262626]">
              <button
                type="button"
                onClick={() => {
                  setSelectedLibForDelete(null);
                  setDeleteConfirmLibName('');
                }}
                disabled={isDeletingLib}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLibrary}
                disabled={isDeletingLib || deleteConfirmLibName.trim().toLowerCase() !== selectedLibForDelete.name.trim().toLowerCase()}
                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingLib ? 'Purging Everything...' : 'Delete Library & All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST LIBRARY SUBSCRIPTION */}
      {selectedLibForSubAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-[#262626]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#262626]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Adjust Subscription Validity</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 truncate max-w-[240px]">
                    {selectedLibForSubAdjust.name} ({selectedLibForSubAdjust.owner.fullName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLibForSubAdjust(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Sub Status Summary */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-xs space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-neutral-300">
                <span>Current Validity:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedLibForSubAdjust.subscription ? selectedLibForSubAdjust.subscription.validUntil : 'No active subscription'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-neutral-300">
                <span>Autopay Status:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedLibForSubAdjust.subscription?.autoRenew
                    ? 'Active'
                    : selectedLibForSubAdjust.subscription?.autoRenewCancelledAt
                    ? 'Cancelled'
                    : 'Off'}
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubscription} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Adjustment Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAction('INCREASE')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjustAction === 'INCREASE'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-[#18181b] text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-[#2e2e2e]'
                    }`}
                  >
                    <span>➕ Extend / Increase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAction('DECREASE')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjustAction === 'DECREASE'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-500 ring-2 ring-rose-500/20'
                        : 'bg-white dark:bg-[#18181b] text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-[#2e2e2e]'
                    }`}
                  >
                    <span>➖ Reduce / Decrease</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Number of Days
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="3650"
                    placeholder="30"
                    value={adjustDays}
                    onChange={(e) => setAdjustDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">
                    e.g. 30 days = +1 month
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Target Plan Level
                  </label>
                  <select
                    value={adjustPlanCode}
                    onChange={(e) => setAdjustPlanCode(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs cursor-pointer"
                  >
                    <option value="PRO">Pro Plan (Full Features)</option>
                    <option value="ADVANCE">Advance Plan</option>
                    <option value="BASIC">Basic Plan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                  Admin Audit Reason (Logged in history)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Granted promotional extension / Special loyalty bonus"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setSelectedLibForSubAdjust(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingSub}
                  className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    adjustAction === 'INCREASE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isAdjustingSub
                    ? 'Updating...'
                    : adjustAction === 'INCREASE'
                    ? 'Extend Validity'
                    : 'Reduce Validity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Floor Plan Inspect Modal ───────────────────────────────── */}
      {(inspectLoading || inspectLibrary) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#262626] bg-slate-50 dark:bg-[#18181b] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                  <DoorOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    {inspectLibrary ? inspectLibrary.name : 'Loading floor plan…'}
                  </h2>
                  {inspectLibrary && (
                    <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {inspectLibrary.address || inspectLibrary.slug}
                      <span className="mx-1">·</span>
                      Owner: {inspectLibrary.owner.fullName}
                      <span className="mx-1">·</span>
                      {inspectLibrary.totalSeats} seats · {inspectLibrary.totalStudents} students
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setInspectLibrary(null); setInspectLoading(false); }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectLoading && (
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-neutral-500">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="text-sm">Loading floor plan…</span>
                </div>
              </div>
            )}

            {inspectLibrary && !inspectLoading && (
              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar – room list */}
                <div className="w-52 shrink-0 border-r border-slate-100 dark:border-[#262626] bg-slate-50 dark:bg-[#161618] overflow-y-auto p-3 flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider px-2 pb-1">Rooms</p>
                  {inspectLibrary.rooms.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-neutral-500 px-2 py-3">No rooms configured yet.</p>
                  )}
                  {inspectLibrary.rooms.map((room) => {
                    const totalSeats = room.rows.reduce((s, r) => s + r.seats.length, 0);
                    const occupiedSeats = room.rows.reduce(
                      (s, r) => s + r.seats.filter((st) => st.studentName).length,
                      0
                    );
                    return (
                      <button
                        key={room.id}
                        onClick={() => setInspectRoomId(room.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          inspectRoomId === room.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-[#222224] hover:shadow-xs'
                        }`}
                      >
                        <span className="truncate">{room.name}</span>
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          inspectRoomId === room.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#2a2a2a] text-slate-500 dark:text-neutral-400'
                        }`}>
                          {occupiedSeats}/{totalSeats}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Main – seat grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#121212]">
                  {(() => {
                    const room = inspectLibrary.rooms.find((r) => r.id === inspectRoomId);
                    if (!room) return (
                      <div className="flex items-center justify-center h-full text-slate-400 dark:text-neutral-500 text-sm">
                        Select a room to view its seat layout.
                      </div>
                    );

                    const allSeats = room.rows.flatMap((r) => r.seats);
                    const occupied = allSeats.filter((s) => s.studentName).length;
                    const available = allSeats.filter((s) => !s.studentName && s.status === 'AVAILABLE').length;

                    return (
                      <div>
                        {/* Room stats */}
                        <div className="flex items-center gap-4 mb-5">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{room.name}</h3>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                              <span className="text-slate-600 dark:text-neutral-400">Occupied ({occupied})</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-[#2a2a2a] inline-block"></span>
                              <span className="text-slate-600 dark:text-neutral-400">Available ({available})</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block"></span>
                              <span className="text-slate-600 dark:text-neutral-400">Maintenance ({allSeats.filter(s => s.status === 'MAINTENANCE').length})</span>
                            </span>
                          </div>
                        </div>

                        {/* Rows */}
                        <div className="space-y-5">
                          {room.rows.map((row) => (
                            <div key={row.id}>
                              <div className="flex items-center gap-2 mb-2">
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">{row.name}</span>
                                <span className="text-[10px] text-slate-400 dark:text-neutral-500">({row.seats.length} seats)</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {row.seats.map((seat) => {
                                  const isOccupied = Boolean(seat.studentName);
                                  const isMaint = seat.status === 'MAINTENANCE';
                                  return (
                                    <div
                                      key={seat.id}
                                      title={isOccupied ? `${seat.seatNumber} – ${seat.studentName}` : `${seat.seatNumber} – Available`}
                                      className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border transition-all cursor-default ${
                                        isMaint
                                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
                                          : isOccupied
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-slate-50 dark:bg-[#1c1c1e] border-slate-200 dark:border-[#2a2a2a] text-slate-400 dark:text-neutral-400'
                                      }`}
                                    >
                                      <span>{seat.seatNumber}</span>
                                      {isOccupied && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5"></span>
                                      )}
                                    </div>
                                  );
                                })}
                                {row.seats.length === 0 && (
                                  <span className="text-xs text-slate-400 dark:text-neutral-500 italic">No seats in this row</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {room.rows.length === 0 && (
                            <p className="text-slate-400 dark:text-neutral-500 text-sm text-center py-10">This room has no rows or seats yet.</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: INSPECT STUDENT PROFILE WITH 4 TABS (Profile, Enrollment Timeline, Fees, KYC) */}
      {isInspectStudentModalOpen && selectedStudentForInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-[#262626] flex items-center justify-between bg-slate-50/70 dark:bg-[#18181b]/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedStudentForInspect.fullName}</span>
                    {selectedStudentForInspect.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-[#2a2a2a] text-slate-600 dark:text-neutral-400">
                        INACTIVE
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Enrolled at <span className="font-semibold text-slate-700 dark:text-neutral-300">{selectedStudentForInspect.libraryName}</span> (/{selectedStudentForInspect.librarySlug})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsInspectStudentModalOpen(false);
                  setSelectedStudentForInspect(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation Pill Bar */}
            <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-[#262626] bg-slate-50/40 dark:bg-[#151518]">
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 dark:bg-[#1c1c1e] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setInspectStudentTab('profile')}
                  className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    inspectStudentTab === 'profile'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectStudentTab('enrollmentTimeline')}
                  className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    inspectStudentTab === 'enrollmentTimeline'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">Enrollment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectStudentTab('feeHistory')}
                  className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    inspectStudentTab === 'feeHistory'
                      ? 'bg-white dark:bg-[#262626] text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Fees</span>
                  {((selectedStudentForInspect.transactions || selectedStudentForInspect.feeTransactions || []).length > 0) && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-bold shrink-0 ${
                        inspectStudentTab === 'feeHistory'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                          : 'bg-slate-300 dark:bg-[#363636] text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      {(selectedStudentForInspect.transactions || selectedStudentForInspect.feeTransactions || []).length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectStudentTab('kyc')}
                  className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    inspectStudentTab === 'kyc'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">KYC</span>
                  {selectedStudentForInspect.kycPhotoUrl && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* TAB 1: PROFILE & DETAILS */}
              {inspectStudentTab === 'profile' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Primary Info card */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-100 dark:border-[#262626]">
                    {selectedStudentForInspect.photoUrl ? (
                      <img
                        src={selectedStudentForInspect.photoUrl}
                        alt={selectedStudentForInspect.fullName}
                        onClick={() => setAdminPreviewingImage(selectedStudentForInspect.photoUrl || null)}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-[#333] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        title="Click to view full profile photo"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                        {selectedStudentForInspect.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                          {selectedStudentForInspect.fullName}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-neutral-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">{selectedStudentForInspect.phone}</span>
                        </div>
                        {selectedStudentForInspect.email && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-neutral-300 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{selectedStudentForInspect.email}</span>
                          </div>
                        )}
                        {selectedStudentForInspect.fatherName && (
                          <div className="text-slate-600 dark:text-neutral-300">
                            <span className="text-slate-400 dark:text-neutral-500">Father:</span> {selectedStudentForInspect.fatherName}
                          </div>
                        )}
                        {selectedStudentForInspect.studyPurpose && (
                          <div className="text-slate-600 dark:text-neutral-300">
                            <span className="text-slate-400 dark:text-neutral-500">Goal:</span> {selectedStudentForInspect.studyPurpose}
                          </div>
                        )}
                        {selectedStudentForInspect.address && (
                          <div className="text-slate-600 dark:text-neutral-300 col-span-1 sm:col-span-2">
                            <span className="text-slate-400 dark:text-neutral-500">Address:</span> {selectedStudentForInspect.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detail Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Seat & Shift Details */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#121212] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#262626] pb-2">
                        <Armchair className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Seat & Shift Allocation</span>
                      </div>
                      {selectedStudentForInspect.seat ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-neutral-400">Seat Number:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
                              Seat {selectedStudentForInspect.seat.seatNumber}
                            </span>
                          </div>
                          {selectedStudentForInspect.seat.roomName && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-neutral-400">Room / Hall:</span>
                              <span className="font-semibold text-slate-800 dark:text-neutral-200">
                                {selectedStudentForInspect.seat.roomName}
                              </span>
                            </div>
                          )}
                          {selectedStudentForInspect.seat.rowName && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-neutral-400">Row:</span>
                              <span className="font-semibold text-slate-800 dark:text-neutral-200">
                                {selectedStudentForInspect.seat.rowName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-neutral-400">Shift Type:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {selectedStudentForInspect.seat.shift === 'MORNING'
                                ? 'Morning Shift'
                                : selectedStudentForInspect.seat.shift === 'EVENING'
                                ? 'Evening Shift'
                                : selectedStudentForInspect.seat.shift === 'NIGHT'
                                ? 'Night Shift'
                                : 'Full Day'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 dark:text-neutral-500 italic pt-2">No seat currently assigned</p>
                      )}
                    </div>

                    {/* Membership & Due Details */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#121212] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#262626] pb-2">
                        <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Membership & Fees</span>
                      </div>
                      {selectedStudentForInspect.membership ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-neutral-400">Status:</span>
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase ${
                              selectedStudentForInspect.membership.status === 'ACTIVE'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : selectedStudentForInspect.membership.status === 'EXPIRED'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                : 'bg-slate-100 dark:bg-[#222] text-slate-700 dark:text-neutral-300'
                            }`}>
                              {selectedStudentForInspect.membership.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-neutral-400">Monthly Fee:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              ₹{(selectedStudentForInspect.membership.feeAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-neutral-400">Outstanding Due:</span>
                            <span className={`font-bold ${
                              selectedStudentForInspect.remainingDue && selectedStudentForInspect.remainingDue > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {selectedStudentForInspect.remainingDue && selectedStudentForInspect.remainingDue > 0
                                ? `₹${selectedStudentForInspect.remainingDue.toLocaleString('en-IN')}`
                                : '₹0 (Paid)'}
                            </span>
                          </div>
                          {selectedStudentForInspect.membership.endDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-neutral-400">Valid Until:</span>
                              <span className="font-mono text-slate-700 dark:text-neutral-300">
                                {formatFriendlyDate(selectedStudentForInspect.membership.endDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 dark:text-neutral-500 italic pt-2">No active membership plan</p>
                      )}
                    </div>

                    {/* Library Branch Owner Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-[#262626] bg-white dark:bg-[#121212] space-y-2 col-span-1 sm:col-span-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#262626] pb-2">
                        <Building2 className="w-4 h-4 text-slate-600 dark:text-neutral-400" />
                        <span>Library & Branch Details</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div>
                          <span className="text-slate-500 dark:text-neutral-400 block">Library Name:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {selectedStudentForInspect.libraryName}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-neutral-400 block">Route / Slug:</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">
                            /{selectedStudentForInspect.librarySlug}
                          </span>
                        </div>
                        {selectedStudentForInspect.ownerName && (
                          <div>
                            <span className="text-slate-500 dark:text-neutral-400 block">Owner:</span>
                            <span className="font-semibold text-slate-800 dark:text-neutral-200">
                              {selectedStudentForInspect.ownerName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MONTHLY ENROLLMENT TIMELINE (Matches screenshot 2) */}
              {inspectStudentTab === 'enrollmentTimeline' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Header & Year Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100 dark:border-[#262626]">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Monthly Enrollment Status</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Enrollment and attendance matrix for {selectedStudentForInspect.fullName}
                      </p>
                    </div>

                    {/* Year Dropdown */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#333] px-2.5 py-1 rounded-xl shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <select
                          value={inspectTimelineYear}
                          onChange={(e) => setInspectTimelineYear(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                        >
                          {availableInspectFeeYears.map((yr) => (
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
                    {inspectMonthlyEnrollmentList.map((m) => {
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

                            {/* Period Date Span */}
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
                                Paid: ₹{m.totalPaid.toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>

                          {/* Action Link to Fee Receipts */}
                          {m.matchingTxs.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#2a2a2d] flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectFeeYear(m.year.toString());
                                  setInspectFeeMonth(m.monthName);
                                  setInspectStudentTab('feeHistory');
                                }}
                                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>View Receipts ({m.matchingTxs.length})</span>
                                <ArrowUpRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Annual Enrollment Summary Card */}
                  <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-[#262626] rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-slate-700 dark:text-neutral-300">
                        <strong>{selectedStudentForInspect.fullName}</strong> was enrolled/active in{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {inspectMonthlyEnrollmentList.filter((m) => m.statusType === 'ACTIVE').length} / 12
                        </strong>{' '}
                        months in {inspectTimelineYear}.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FEES & TRANSACTIONS */}
              {inspectStudentTab === 'feeHistory' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Header & Filter Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100 dark:border-[#262626]">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Fee & Payment Records</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Historical fee transactions recorded for {selectedStudentForInspect.fullName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Year Filter */}
                      <div className="flex items-center gap-1 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-lg px-2 py-1 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <select
                          value={inspectFeeYear}
                          onChange={(e) => setInspectFeeYear(e.target.value)}
                          className="bg-transparent text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
                        >
                          <option value="ALL">All Years</option>
                          {availableInspectFeeYears.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Month Filter */}
                      <div className="flex items-center gap-1 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-lg px-2 py-1 shadow-2xs">
                        <select
                          value={inspectFeeMonth}
                          onChange={(e) => setInspectFeeMonth(e.target.value)}
                          className="bg-transparent text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
                        >
                          <option value="ALL">All Months</option>
                          {MONTH_NAMES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(inspectFeeYear !== 'ALL' || inspectFeeMonth !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setInspectFeeYear('ALL');
                            setInspectFeeMonth('ALL');
                          }}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Transactions List */}
                  {inspectFilteredTxs.length > 0 ? (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                      {inspectFilteredTxs.map((tx: any) => {
                        const d = new Date(tx.paymentDate);
                        const formattedD = d.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        return (
                          <div
                            key={tx.id}
                            className="bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl p-3 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40 font-bold shrink-0">
                                  <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block">
                                    {tx.paidForMonth || 'Fee Payment'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">
                                    {formattedD}
                                  </span>
                                  {tx.validFrom && tx.validTo && (
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
                                      {formatFriendlyPeriod(tx.validFrom, tx.validTo)}
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

                            {/* Metadata */}
                            <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                              <div>
                                Mode: <strong className="text-slate-700 dark:text-neutral-200">{tx.paymentMode || 'CASH'}</strong>
                              </div>
                              {tx.receiptNumber && (
                                <span className="font-mono text-[10px] text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-[#262626] px-2 py-0.5 rounded-md">
                                  #{tx.receiptNumber}
                                </span>
                              )}
                            </div>

                            {tx.notes && (
                              <div className="text-[10px] bg-white dark:bg-[#121212] p-2 rounded-lg text-slate-600 dark:text-neutral-400 italic border border-slate-100 dark:border-[#262626]">
                                &quot;{tx.notes}&quot;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-[#1c1c1e] border border-dashed border-slate-200 dark:border-[#262626] rounded-2xl p-6 text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                        No Fee Payment Records Found
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                        {inspectFeeYear !== 'ALL' || inspectFeeMonth !== 'ALL'
                          ? 'No payments found under selected year/month filter.'
                          : 'No fee transactions have been recorded for this student yet.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: KYC & DOCUMENT VERIFICATION (Matches screenshot 1) */}
              {inspectStudentTab === 'kyc' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>KYC & Document Verification</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Identity verification records for {selectedStudentForInspect.fullName}
                      </p>
                    </div>

                    {selectedStudentForInspect.kycPhotoUrl ? (
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
                        {selectedStudentForInspect.kycDocType === 'AADHAAR'
                          ? 'Aadhaar Card'
                          : selectedStudentForInspect.kycDocType || 'Aadhaar Card'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400 pb-2 border-b border-slate-200/60 dark:border-[#262626]">
                      <span>Card Reference Number:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">
                        {selectedStudentForInspect.kycDocId || 'Not provided'}
                      </span>
                    </div>

                    {/* Uploaded Document Image Thumbnail + Stored in Cloudinary (WebP) Badge */}
                    <div>
                      <span className="block text-slate-600 dark:text-neutral-400 font-medium mb-1.5">
                        Uploaded Document Image:
                      </span>
                      {selectedStudentForInspect.kycPhotoUrl ? (
                        <div className="p-3 bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={selectedStudentForInspect.kycPhotoUrl}
                              alt="Aadhaar Card Document"
                              onClick={() => setAdminPreviewingImage(selectedStudentForInspect.kycPhotoUrl || null)}
                              className="w-16 h-12 object-cover rounded-lg border border-slate-200 dark:border-[#363636] shadow-2xs cursor-pointer hover:opacity-90 hover:border-indigo-500 transition-all"
                              title="Click to view full image"
                            />
                            <div>
                              <span className="block font-bold text-slate-800 dark:text-neutral-200 text-xs">
                                {selectedStudentForInspect.kycDocType === 'AADHAAR' ? 'Aadhaar Card Photo' : 'ID Document Photo'}
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Stored in Cloudinary (WebP)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAdminPreviewingImage(selectedStudentForInspect.kycPhotoUrl || null)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/50 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Full</span>
                            </button>
                            <a
                              href={selectedStudentForInspect.kycPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 border border-slate-200 dark:border-[#262626] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1c1c1e] transition-colors"
                              title="Open original in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white dark:bg-[#121212] border border-dashed border-slate-300 dark:border-[#363636] rounded-xl text-center space-y-1">
                          <p className="text-[11px] text-slate-400 dark:text-neutral-500 italic">
                            No document photo uploaded yet for this student.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#262626] bg-slate-50/50 dark:bg-[#18181b]/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsInspectStudentModalOpen(false);
                  setSelectedStudentForInspect(null);
                }}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Image Lightbox Modal for Admin */}
      {adminPreviewingImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setAdminPreviewingImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-2xl p-3 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <a
                href={adminPreviewingImage}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-full bg-black/60 hover:bg-black text-white cursor-pointer transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setAdminPreviewingImage(null)}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={adminPreviewingImage}
              alt="Full Preview"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
