'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { AdminSkeleton } from './Skeleton';

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
  currency: string;
  status: string;
  provider: string;
  paymentId: string;
  orderId?: string;
  createdAt: string;
  planCode: string;
  planName: string;
  durationMonths: number;
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
  counts: {
    rooms: number;
    seats: number;
    students: number;
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
  currentUser: { fullName: string; email: string; phone: string; role: string };
  onSwitchToLibraryView?: (libraryId?: string) => void;
}

export function AdminDashboard({ currentUser, onSwitchToLibraryView }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'coupons' | 'users' | 'audit' | 'payments' | 'broadcast'>('overview');
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [adminPaymentFilter, setAdminPaymentFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED_AUTOPAY'>('ALL');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [libraries, setLibraries] = useState<AdminLibrary[]>([]);
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  
  // Push Broadcast States
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | 'LIBRARY'>('ALL');
  const [broadcastLibraryId, setBroadcastLibraryId] = useState('');
  const [broadcastUrl, setBroadcastUrl] = useState('/');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
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

  // Modal States
  const [isCreateCouponOpen, setIsCreateCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [couponValue, setCouponValue] = useState('20');
  const [couponMaxRedemptions, setCouponMaxRedemptions] = useState('100');
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  // Library Toggle Confirmation
  const [selectedLibForToggle, setSelectedLibForToggle] = useState<AdminLibrary | null>(null);
  const [isTogglingLib, setIsTogglingLib] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setStatusMessage({ type: 'error', text: 'Title and message body are required' });
      return;
    }

    setIsBroadcasting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
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

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = { 'x-admin-email': currentUser.email };

      const [metricsRes, libsRes, plansRes, couponsRes, usersRes, auditRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/libraries', { headers }),
        fetch('/api/admin/plans', { headers }),
        fetch('/api/admin/coupons', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs?limit=30', { headers }),
        fetch('/api/admin/payments', { headers }),
      ]);

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        if (m.data) setMetrics(m.data);
      }
      if (libsRes.ok) {
        const l = await libsRes.json();
        if (l.libraries) setLibraries(l.libraries);
      }
      if (plansRes.ok) {
        const p = await plansRes.json();
        if (p.plans) setPlans(p.plans);
      }
      if (couponsRes.ok) {
        const c = await couponsRes.json();
        if (c.coupons) setCoupons(c.coupons);
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        if (u.users) setUsers(u.users);
      }
      if (paymentsRes && paymentsRes.ok) {
        const pData = await paymentsRes.json();
        if (pData.payments) setPayments(pData.payments);
      }
      if (auditRes.ok) {
        const a = await auditRes.json();
        if (a.logs) setAuditLogs(a.logs);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
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
      const res = await fetch(`/api/admin/plans/${planToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({
          name: editPlanName.trim(),
          durationMonths: parseInt(editPlanDuration, 10),
          priceMonthly: parseFloat(editPlanPrice),
          priceYearly: parseFloat(editPlanOrigPrice),
          badge: editPlanBadge.trim(),
          description: editPlanDesc.trim(),
          isActive: editPlanActive,
        }),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Plan '${editPlanName}' updated successfully!` });
        setIsEditPlanModalOpen(false);
        setPlanToEdit(null);
        const pRes = await fetch('/api/admin/plans', { headers: { 'x-admin-email': currentUser.email } });
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
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({
          code: newPlanCode.trim().toUpperCase(),
          name: newPlanName.trim(),
          durationMonths: parseInt(newPlanDuration, 10),
          priceMonthly: parseFloat(newPlanPrice),
          priceYearly: parseFloat(newPlanOrigPrice),
          badge: newPlanBadge.trim(),
          description: newPlanDesc.trim(),
        }),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Plan '${newPlanName}' created successfully!` });
        setIsCreatePlanModalOpen(false);
        setNewPlanCode('');
        setNewPlanName('');
        const pRes = await fetch('/api/admin/plans', { headers: { 'x-admin-email': currentUser.email } });
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
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
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
    fetchAllData();
  }, [currentUser.email]);

  const handleToggleLibraryStatus = async () => {
    if (!selectedLibForToggle) return;
    setIsTogglingLib(true);
    const newStatus = !selectedLibForToggle.isActive;

    try {
      const res = await fetch(`/api/admin/libraries/${selectedLibForToggle.id}/status`, {
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

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !couponValue) return;
    setCouponSubmitting(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': currentUser.email },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          discountType: couponType,
          discountValue: parseFloat(couponValue),
          maxRedemptions: couponMaxRedemptions ? parseInt(couponMaxRedemptions, 10) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage({ type: 'success', text: `Coupon code '${data.coupon.code}' created successfully!` });
        setIsCreateCouponOpen(false);
        setCouponCode('');
        const cRes = await fetch('/api/admin/coupons', { headers: { 'x-admin-email': currentUser.email } });
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

  const handleToggleCoupon = async (couponId: string) => {
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}/toggle`, {
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

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#2c2c2e] rounded-xl transition-colors flex items-center gap-2 border border-slate-200 dark:border-[#2a2a2a] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {onSwitchToLibraryView && (
              <button
                onClick={() => onSwitchToLibraryView()}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Switch to Library View
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

          <div className="bg-slate-50 dark:bg-[#18181b] rounded-xl p-3.5 border border-slate-200 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Students</span>
              <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {metrics?.totalStudents ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Platform wide</div>
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
                              {lib.counts.seats} Seats
                            </span>
                            <span className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                              {lib.counts.students} Students
                            </span>
                            <span className="text-slate-400 dark:text-neutral-500">{lib.counts.rooms} Rooms</span>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openInspectModal(lib.id)}
                              title="Inspect library floor plan"
                              className="p-2 text-slate-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedLibForToggle(lib)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                                lib.isActive
                                  ? 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                  : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              {lib.isActive ? 'Suspend' : 'Activate'}
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
            <button
              onClick={() => setIsCreatePlanModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Plan
            </button>
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
                      {plan.description || 'Full student admission, fee collection, seats, and attendance.'}
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
            <button
              onClick={() => setIsCreateCouponOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-white dark:bg-[#121212] rounded-2xl p-5 border border-slate-200 dark:border-[#262626] shadow-xs relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-lg font-extrabold tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                      {coupon.code}
                    </div>
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
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-[11px] text-slate-400 dark:text-neutral-500">
                  <span>Expires {new Date(coupon.validUntil).toLocaleDateString('en-IN')}</span>
                  <span>Limit: {coupon.perUserLimit}/user</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-[#262626]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Registered Platform Users</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">All registered library owners, staff, and super administrators</p>
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
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
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

            {/* Filter Pills */}
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
                            <span className="font-bold text-slate-900 dark:text-white block">{p.libraryName}</span>
                            <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">{p.ownerName} ({p.ownerEmail || 'No email'})</span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 dark:text-white block">{p.planName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                {p.durationMonths} Month{p.durationMonths > 1 ? 's' : ''}
                              </span>
                              {p.isAutopay && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Autopay
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            {p.amount > 0 ? `₹${p.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] text-slate-700 dark:text-neutral-300 block">{p.paymentId}</span>
                            {p.orderId && (
                              <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono block">Order: {p.orderId}</span>
                            )}
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
          <div className="p-4 border-b border-slate-100 dark:border-[#262626]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">System Audit Trail</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">Security and administrative actions executed on the platform</p>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">Max Redemptions (Optional)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100 (leave empty for unlimited)"
                  value={couponMaxRedemptions}
                  onChange={(e) => setCouponMaxRedemptions(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#2e2e2e] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
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
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isTogglingLib ? 'Updating...' : selectedLibForToggle.isActive ? 'Suspend Library' : 'Activate Library'}
              </button>
            </div>
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
    </div>
  );
}
