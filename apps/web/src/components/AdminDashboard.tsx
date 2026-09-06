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
} from 'lucide-react';

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
  maxRedemptions?: number | null;
  perUserLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  usageCount: number;
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

interface AdminDashboardProps {
  currentUser: { fullName: string; email: string; phone: string; role: string };
  onSwitchToLibraryView?: (libraryId?: string) => void;
}

export function AdminDashboard({ currentUser, onSwitchToLibraryView }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'coupons' | 'users' | 'audit'>('overview');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [libraries, setLibraries] = useState<AdminLibrary[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'active' | 'suspended'>('all');

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

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = { 'x-admin-email': currentUser.email };

      const [metricsRes, libsRes, couponsRes, usersRes, auditRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/libraries', { headers }),
        fetch('/api/admin/coupons', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs?limit=30', { headers }),
      ]);

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        if (m.data) setMetrics(m.data);
      }
      if (libsRes.ok) {
        const l = await libsRes.json();
        if (l.libraries) setLibraries(l.libraries);
      }
      if (couponsRes.ok) {
        const c = await couponsRes.json();
        if (c.coupons) setCoupons(c.coupons);
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        if (u.users) setUsers(u.users);
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

  return (
    <div className="space-y-6 pb-20">
      {/* Super Admin Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Super Admin Portal</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Root Admin
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Platform governance, multi-tenant libraries, users, coupons & audit logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {onSwitchToLibraryView && (
              <button
                onClick={() => onSwitchToLibraryView()}
                className="px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                Switch to Library View
              </button>
            )}
          </div>
        </div>

        {/* Global Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Libraries</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics?.totalLibraries ?? libraries.length}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              {metrics?.activeLibraries ?? libraries.filter((l) => l.isActive).length} active
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Students</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics?.totalStudents ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Platform wide</div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Seats</span>
              <Armchair className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics?.totalSeats ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Physical capacity</div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Users</span>
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics?.totalUsers ?? users.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Registered</div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Subscriptions</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics?.activeSubscriptions ?? 0}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-0.5">Active plans</div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Revenue</span>
              <IndianRupee className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              ₹{(metrics?.totalRevenue ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">Total collected</div>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Libraries ({libraries.length})
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'coupons'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Coupons & Offers ({coupons.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Platform Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
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
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
                <button
                  onClick={() => setLibraryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    libraryFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500'
                  }`}
                >
                  All ({libraries.length})
                </button>
                <button
                  onClick={() => setLibraryFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    libraryFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-500'
                  }`}
                >
                  Active ({libraries.filter((l) => l.isActive).length})
                </button>
                <button
                  onClick={() => setLibraryFilter('suspended')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    libraryFilter === 'suspended' ? 'bg-white text-rose-700 shadow-sm font-semibold' : 'text-slate-500'
                  }`}
                >
                  Suspended ({libraries.filter((l) => !l.isActive).length})
                </button>
              </div>
            </div>
          </div>

          {filteredLibraries.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No libraries found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery ? 'Try adjusting your search terms or filters.' : 'No libraries registered on the platform yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Library</th>
                      <th className="px-5 py-3.5">Owner</th>
                      <th className="px-5 py-3.5">Stats</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Created</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLibraries.map((lib) => (
                      <tr key={lib.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{lib.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{lib.address || 'Address not set'}</span>
                            <span>·</span>
                            <span className="font-mono text-[11px] text-slate-400">/{lib.slug}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">{lib.owner?.fullName || 'Owner'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{lib.owner?.email}</span>
                          </div>
                          {lib.contactPhone && (
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                              <Phone className="w-3 h-3" />
                              <span>{lib.contactPhone}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                              {lib.counts.seats} Seats
                            </span>
                            <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-medium">
                              {lib.counts.students} Students
                            </span>
                            <span className="text-slate-400">{lib.counts.rooms} Rooms</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {lib.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Suspended
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {new Date(lib.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onSwitchToLibraryView && (
                              <button
                                onClick={() => onSwitchToLibraryView(lib.id)}
                                title="Inspect library floor plan"
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedLibForToggle(lib)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                                lib.isActive
                                  ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
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

      {/* TAB 2: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Platform Promotion Coupons</h2>
              <p className="text-xs text-slate-500">Manage promotional discounts for SaaS subscriptions</p>
            </div>
            <button
              onClick={() => setIsCreateCouponOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-lg font-extrabold tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      {coupon.code}
                    </div>
                    <button
                      onClick={() => handleToggleCoupon(coupon.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${
                        coupon.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="text-2xl font-black text-slate-900">
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue} OFF`}
                    </div>
                    <div className="text-xs text-slate-500">
                      Redeemed: <span className="font-semibold text-slate-800">{coupon.usageCount}</span>
                      {coupon.maxRedemptions && ` / ${coupon.maxRedemptions} max`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Registered Platform Users</h2>
            <p className="text-xs text-slate-500">All registered library owners, staff, and super administrators</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Global Role</th>
                  <th className="px-5 py-3">Libraries</th>
                  <th className="px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/75">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{u.fullName}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {u.phone || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          SUPER_ADMIN
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                          USER
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                      {u.librariesCount} {u.librariesCount === 1 ? 'branch' : 'branches'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">System Audit Trail</h2>
            <p className="text-xs text-slate-500">Security and administrative actions executed on the platform</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-400">on {log.entityType}</span>
                      {log.libraryName && (
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {log.libraryName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      Executed by <span className="font-semibold text-slate-900">{log.actorName}</span> ({log.actorEmail || 'System'})
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 shrink-0">
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

      {/* MODAL: CREATE COUPON */}
      {isCreateCouponOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                Create Platform Coupon
              </h3>
              <button onClick={() => setIsCreateCouponOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="20"
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Redemptions</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={couponMaxRedemptions}
                  onChange={(e) => setCouponMaxRedemptions(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCouponOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {couponSubmitting ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM SUSPEND/ACTIVATE LIBRARY */}
      {selectedLibForToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                {selectedLibForToggle.isActive ? 'Suspend Library' : 'Activate Library'}
              </h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to{' '}
              <span className="font-semibold text-slate-900">
                {selectedLibForToggle.isActive ? 'suspend' : 'activate'}
              </span>{' '}
              the library <span className="font-semibold text-indigo-700">"{selectedLibForToggle.name}"</span>?
              {selectedLibForToggle.isActive && (
                <span className="block mt-1 text-xs text-rose-600">
                  Suspended libraries cannot be accessed by students or staff.
                </span>
              )}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLibForToggle(null)}
                disabled={isTogglingLib}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleLibraryStatus}
                disabled={isTogglingLib}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors shadow-sm ${
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
    </div>
  );
}
