'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
  LayoutDashboard,
  Armchair,
  Users,
  MoreHorizontal,
  Bell,
  Clock,
  ChevronRight,
  Plus,
  Layers,
  Building2,
  Sparkles,
  LogIn,
  LogOut,
  Check,
  Zap,
  ChevronDown,
  ShieldCheck,
  MapPin,
  Phone,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  Trash2,
  Pencil,
  IndianRupee,
  ReceiptText,
  Crown,
  Sun,
  Moon,
  FlaskConical,
  TrendingUp,
} from 'lucide-react';
import type { SeatStatus } from '@library/types';
import dynamic from 'next/dynamic';
import { useTheme } from '../components/ThemeProvider';
import type { VisualSeatItem } from '../components/SeatGrid';
import type { StudentItem, StudentFeeRecord, StudentFilterTab } from '../components/StudentList';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { QuickCheckHero } from '../components/QuickCheckHero';
import {
  DashboardSkeleton,
  DashboardChartSkeleton,
  SeatGridSkeleton,
  StudentListSkeleton,
  TransactionsSkeleton,
  KanbanSkeleton,
  SubscriptionSkeleton,
  AdminSkeleton,
} from '../components/Skeleton';

// Dynamically imported heavy views with skeleton fallbacks
const DashboardChart = dynamic(
  () => import('../components/DashboardChart').then((m) => m.DashboardChart),
  { loading: () => <DashboardChartSkeleton /> }
);

const SeatGrid = dynamic(
  () => import('../components/SeatGrid').then((m) => m.SeatGrid),
  { loading: () => <SeatGridSkeleton /> }
);

const StudentList = dynamic(
  () => import('../components/StudentList').then((m) => m.StudentList),
  { loading: () => <StudentListSkeleton /> }
);

const KanbanBoard = dynamic(
  () => import('../components/KanbanBoard').then((m) => m.KanbanBoard),
  { loading: () => <KanbanSkeleton /> }
);

const TransactionsView = dynamic(
  () => import('../components/TransactionsView').then((m) => m.TransactionsView),
  { loading: () => <TransactionsSkeleton /> }
);

const SubscriptionCard = dynamic(
  () => import('../components/SubscriptionCard').then((m) => m.SubscriptionCard),
  { loading: () => <SubscriptionSkeleton /> }
);

const AdminDashboard = dynamic(
  () => import('../components/AdminDashboard').then((m) => m.AdminDashboard),
  { loading: () => <AdminSkeleton />, ssr: false }
);

const PublicLandingPage = dynamic(
  () => import('../components/PublicLandingPage').then((m) => m.PublicLandingPage),
  { ssr: false }
);

// Dynamically imported on-demand modals (only loaded when active/triggered)
const AuthModal = dynamic(
  () => import('../components/AuthModal').then((m) => m.AuthModal),
  { ssr: false }
);

const CreateLibraryModal = dynamic(
  () => import('../components/CreateLibraryModal').then((m) => m.CreateLibraryModal),
  { ssr: false }
);

const EditLibraryModal = dynamic(
  () => import('../components/EditLibraryModal').then((m) => m.EditLibraryModal),
  { ssr: false }
);

const RoomRowModal = dynamic(
  () => import('../components/RoomRowModal').then((m) => m.RoomRowModal),
  { ssr: false }
);

const EditRoomModal = dynamic(
  () => import('../components/EditRoomModal').then((m) => m.EditRoomModal),
  { ssr: false }
);

const AddRowModal = dynamic(
  () => import('../components/AddRowModal').then((m) => m.AddRowModal),
  { ssr: false }
);

const StudentModal = dynamic(
  () => import('../components/StudentModal').then((m) => m.StudentModal),
  { ssr: false }
);

const StudentProfileModal = dynamic(
  () => import('../components/StudentProfileModal').then((m) => m.StudentProfileModal),
  { ssr: false }
);

const CollectFeeModal = dynamic(
  () => import('../components/CollectFeeModal').then((m) => m.CollectFeeModal),
  { ssr: false }
);

const FeeReceiptModal = dynamic(
  () => import('../components/FeeReceiptModal').then((m) => m.FeeReceiptModal),
  { ssr: false }
);

const AssignSeatModal = dynamic(
  () => import('../components/AssignSeatModal').then((m) => m.AssignSeatModal),
  { ssr: false }
);

const SubscriptionRequiredModal = dynamic(
  () => import('../components/SubscriptionRequiredModal').then((m) => m.SubscriptionRequiredModal),
  { ssr: false }
);

const NotificationCenterModal = dynamic(
  () => import('../components/NotificationCenterModal').then((m) => m.NotificationCenterModal),
  { ssr: false }
);

const PWACompanion = dynamic(
  () => import('../components/PWACompanion').then((m) => m.PWACompanion),
  { ssr: false }
);

export interface LibraryBranch {
  id: string;
  name: string;
  contactPhone: string;
  address?: string;
  rooms: { id: string; name: string; rows: string[] }[];
  seats: VisualSeatItem[];
  students: StudentItem[];
  feeTransactions?: StudentFeeRecord[];
  createdAt: string;
  hasActiveSubscription?: boolean;
  subscription?: {
    id: string;
    planCode: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
  } | null;
}

export default function MobileDashboard() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'seats' | 'students' | 'transactions' | 'more'>('home');
  const [studentSubTab, setStudentSubTab] = useState<'directory' | 'pipeline'>('directory');
  const [studentFilterTab, setStudentFilterTab] = useState<StudentFilterTab>('ALL');
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [studentForFeeCollection, setStudentForFeeCollection] = useState<StudentItem | null>(null);
  const [preselectedSeatNumberForFeeCollection, setPreselectedSeatNumberForFeeCollection] = useState<string | null>(null);
  const [returnToStudentProfileId, setReturnToStudentProfileId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'feeHistory' | 'kyc' | 'enrollmentTimeline'>('profile');

  // User Authentication State - ZERO dummy user initially
  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    email: string;
    phone: string;
    role: string;
    avatar?: string;
  } | null>(null);

  // Multi-Library State - ZERO dummy data initially
  const [libraries, setLibraries] = useState<LibraryBranch[]>([]);
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isTestMode = Boolean(
    currentUser && (
      currentUser.email?.toLowerCase().trim() === 'rahul.owner@seelibrary.io' ||
      currentUser.email?.toLowerCase().trim().endsWith('@seelibrary.io') ||
      currentUser.email?.toLowerCase().includes('demo') ||
      currentUser.email?.toLowerCase().includes('test') ||
      (currentUser as any).isTestMode
    )
  );
  const [isAdminPortalView, setIsAdminPortalView] = useState(false);

  // Check if admin explicitly wants library view (user dashboard view)
  const isLibraryViewPreferred = () => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return (
      urlParams.get('view') === 'library' ||
      sessionStorage.getItem('seelibrary_view_mode') === 'library'
    );
  };

  useEffect(() => {
    if (isSuperAdmin && !isLibraryViewPreferred()) {
      setIsAdminPortalView(true);
    } else {
      setIsAdminPortalView(false);
    }
  }, [isSuperAdmin]);

  // Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isEditLibraryModalOpen, setIsEditLibraryModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isSubscriptionRequiredModalOpen, setIsSubscriptionRequiredModalOpen] = useState(false);
  const [subscriptionGateAction, setSubscriptionGateAction] = useState<string>('Enroll Students');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentItem | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<StudentFeeRecord | null>(null);
  const [selectedSeatForAssignment, setSelectedSeatForAssignment] = useState<VisualSeatItem | null>(null);
  const [preselectedShiftForAssignment, setPreselectedShiftForAssignment] = useState<string | undefined>(undefined);
  const [preselectedSeatNumberForNewStudent, setPreselectedSeatNumberForNewStudent] = useState<string | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Selected Room for Room-First Hierarchy
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<{ id: string; name: string } | null>(null);
  const [activeRoomMenuId, setActiveRoomMenuId] = useState<string | null>(null);

  // Sync and fetch libraries from PostgreSQL
  const loadUserLibrariesFromDb = async (
    userEmail: string,
    localFallbackLibs?: LibraryBranch[],
    options?: { skipAuthSync?: boolean }
  ) => {
    setIsSyncingData(true);
    try {
      if (!options?.skipAuthSync) {
        let authData: any = null;
        try {
          const authController = new AbortController();
          const authTimeout = setTimeout(() => authController.abort(), 4000);
          const authRes = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, fullName: currentUser?.fullName || '' }),
            signal: authController.signal,
          });
          clearTimeout(authTimeout);
          if (authRes.ok) {
            authData = await authRes.json();
          }
        } catch (e) {
          console.warn('Next.js /api/auth/sync call failed:', e);
        }

        // Only fallback to Render if local auth sync completely failed to return a user
        if (!authData?.user && !userEmail.includes('demo') && !userEmail.includes('test')) {
          try {
            const directController = new AbortController();
            const directTimeout = setTimeout(() => directController.abort(), 3000);
            const directRes = await fetch('https://seelibrarybackend.onrender.com/api/v1/auth/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail, fullName: currentUser?.fullName || '' }),
              signal: directController.signal,
            });
            clearTimeout(directTimeout);
            if (directRes.ok) {
              const renderData = await directRes.json();
              if (renderData?.user) {
                authData = renderData;
              }
            }
          } catch (e) {
            console.warn('Render direct sync fallback failed:', e);
          }
        }

        if (authData?.user) {
          const canonicalUser = {
            fullName: authData.user.fullName || currentUser?.fullName || '',
            email: authData.user.email,
            phone: authData.user.phone || '',
            role: authData.user.role || 'USER',
            avatar: authData.user.avatar || undefined,
          };
          setCurrentUser(canonicalUser);
          try {
            localStorage.setItem('seelibrary_user', JSON.stringify(canonicalUser));
            document.cookie = `seelibrary_role=${canonicalUser.role}; path=/; max-age=604800`;
          } catch {}

          // If SUPER_ADMIN — go to dedicated /admin page unless user explicitly chose library view
          if (authData.user.role === 'SUPER_ADMIN') {
            if (!isLibraryViewPreferred()) {
              setIsAdminPortalView(true);
              router.replace('/admin');
              return;
            } else {
              setIsAdminPortalView(false);
            }
          }
        }
      }

      // 2. Sync and fetch all libraries for this user from DB with timeout
      const syncController = new AbortController();
      const syncTimeout = setTimeout(() => syncController.abort(), 8000);
      const res = await fetch('/api/libraries/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, localLibraries: localFallbackLibs || [] }),
        signal: syncController.signal,
      });
      clearTimeout(syncTimeout);

      if (res.ok) {
        const data = await res.json();
        if (data.libraries && Array.isArray(data.libraries)) {
          setLibraries(data.libraries);
          try {
            localStorage.setItem('seelibrary_libraries', JSON.stringify(data.libraries));
          } catch {}

          if (data.libraries.length > 0) {
            setActiveLibraryId((prev) => {
              if (prev && data.libraries.some((l: any) => l.id === prev)) return prev;
              return data.libraries[0].id;
            });
          } else {
            setActiveLibraryId(null);
          }
        }
      }
    } catch (err) {
      console.warn('Database sync encountered an issue, using local cache:', err);
    } finally {
      setIsSyncingData(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    try {
      const savedUser = localStorage.getItem('seelibrary_user') || localStorage.getItem('quickcheck_user');
      const savedLibs = localStorage.getItem('seelibrary_libraries') || localStorage.getItem('quickcheck_libraries');
      const savedActiveId = localStorage.getItem('seelibrary_active_lib_id') || localStorage.getItem('quickcheck_active_lib_id');

      let parsedUser = null;
      let parsedLibs: LibraryBranch[] = [];

      if (savedUser) {
        parsedUser = JSON.parse(savedUser);
        if (parsedUser.role === 'SUPER_ADMIN') {
          if (!isLibraryViewPreferred()) {
            setIsAdminPortalView(true);
            router.replace('/admin');
          } else {
            setIsAdminPortalView(false);
          }
        }
        setCurrentUser(parsedUser);
      }

      if (savedLibs) {
        parsedLibs = JSON.parse(savedLibs);
        setLibraries(parsedLibs);
        if (savedActiveId) {
          setActiveLibraryId(savedActiveId);
        } else if (parsedLibs.length > 0) {
          setActiveLibraryId(parsedLibs[0].id);
        }
      }

      // Automatically sync with PostgreSQL database if user is logged in
      if (parsedUser?.email) {
        loadUserLibrariesFromDb(parsedUser.email, parsedLibs);
      }
    } catch {
      // Ignore localStorage errors in private browsing
    }
  }, []);

  // Sync state changes to localStorage and database
  const handleUserLogin = (user: { fullName: string; email: string; phone: string; role: string; avatar?: string }) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('seelibrary_user', JSON.stringify(user));
    } catch {}

    // Load libraries for this user from database
    if (user.email) {
      loadUserLibrariesFromDb(user.email, libraries);
    }

    if (user.role === 'SUPER_ADMIN') {
      if (!isLibraryViewPreferred()) {
        setIsAdminPortalView(true);
        router.replace('/admin');
        return;
      } else {
        setIsAdminPortalView(false);
      }
    }
  };

  const handleLaunchDemo = () => {
    handleUserLogin({
      fullName: 'Rahul Sharma',
      email: 'rahul.owner@seelibrary.io',
      phone: '9876543210',
      role: 'OWNER',
      avatar: 'https://ui-avatars.com/api/?name=Rahul+Sharma&background=4f46e5&color=fff',
    });
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    setLibraries([]);
    setActiveLibraryId(null);
    setIsAuthModalOpen(false);
    setIsAdminPortalView(false);
    try {
      localStorage.removeItem('seelibrary_user');
      localStorage.removeItem('quickcheck_user');
      localStorage.removeItem('seelibrary_libraries');
      localStorage.removeItem('seelibrary_active_lib_id');
      sessionStorage.clear();
    } catch {}
    // Clear role cookie so middleware doesn't redirect to /admin on next visit
    document.cookie = 'seelibrary_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  };

  // Find active library
  const activeLibrary = libraries.find((l) => l.id === activeLibraryId) || libraries[0] || null;

  // Fetch unread push notifications count
  const fetchUnreadNotifications = async () => {
    if (!currentUser?.email) return;
    try {
      const params = new URLSearchParams();
      if (activeLibrary?.id) params.append('libraryId', activeLibrary.id);
      params.append('userEmail', currentUser.email);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUnreadNotificationCount(data.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 45000);
    return () => clearInterval(interval);
  }, [currentUser?.email, activeLibrary?.id]);

  // Subscription Guard Helper: Checks if active library has valid subscription or user is super admin
  const hasActiveSubscription = Boolean(
    isSuperAdmin ||
    activeLibrary?.hasActiveSubscription ||
    (activeLibrary?.subscription &&
      (activeLibrary.subscription.status === 'ACTIVE' || (activeLibrary.subscription.status as any) === 'MANUAL') &&
      ((activeLibrary.subscription.daysRemaining ?? 0) > 0 ||
        new Date(activeLibrary.subscription.endDate).getTime() > Date.now()))
  );

  const requireSubscription = (actionTitle: string, actionFn: () => void) => {
    if (hasActiveSubscription) {
      actionFn();
    } else {
      setSubscriptionGateAction(actionTitle);
      setIsSubscriptionRequiredModalOpen(true);
    }
  };

  // Keep fee ledger transactions freshly synced when switching to fee history tab
  useEffect(() => {
    if (activeTab === 'transactions' && activeLibrary?.id && hasActiveSubscription) {
      fetch(`/api/libraries/${activeLibrary.id}/transactions`, {
        headers: currentUser?.email ? { 'x-user-email': currentUser.email } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.transactions)) {
            updateActiveLibrary((prev) => ({
              ...prev,
              feeTransactions: data.transactions,
            }));
          }
        })
        .catch((err) => console.error('Failed to sync fee transactions:', err));
    }
  }, [activeTab, activeLibrary?.id, hasActiveSubscription]);

  // Active library child entities
  const rawSeats = activeLibrary ? activeLibrary.seats : [];
  const seats = [...rawSeats].sort((a, b) =>
    a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
  );
  const rawStudents = activeLibrary ? activeLibrary.students : [];
  const students = rawStudents.map((std) => {
    const seatObj = std.seatNumber ? rawSeats.find((s) => s.seatNumber === std.seatNumber) : null;
    return {
      ...std,
      hasLocker: Boolean(std.hasLocker || seatObj?.hasLocker),
    };
  });
  const rooms = activeLibrary ? activeLibrary.rooms : [];

  // Display rooms with fallback for libraries with seats but unconfigured rooms
  const displayRooms = (rooms && rooms.length > 0)
    ? rooms
    : seats.length > 0
      ? [{ id: 'room-default', name: 'Main Study Hall', rows: Array.from(new Set(seats.map((s) => s.rowName || 'Row A'))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })) }]
      : [];

  const getSeatsForRoom = (room: { id: string; name: string; rows: string[] }) => {
    return seats
      .filter((s) => {
        if (s.roomId) {
          return s.roomId === room.id;
        }
        if (room.rows && room.rows.some((r) => r.toLowerCase().trim() === (s.rowName || '').toLowerCase().trim())) {
          return true;
        }
        const otherRooms = displayRooms.filter((r) => r.id !== room.id);
        const matchesOther = otherRooms.some(
          (or) => or.rows && or.rows.some((r) => r.toLowerCase().trim() === (s.rowName || '').toLowerCase().trim())
        );
        if (!matchesOther && displayRooms[0]?.id === room.id) {
          return true;
        }
        return false;
      })
      .sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
      );
  };

  const currentSelectedRoom = displayRooms.find((r) => r.id === selectedRoomId) || null;
  const currentRoomSeats = currentSelectedRoom ? getSeatsForRoom(currentSelectedRoom) : [];
  const currentRoomOccupied = currentRoomSeats.filter((s) => s.status === 'OCCUPIED').length;

  // Metrics computed purely on real data
  const totalSeats = seats.length;
  const occupiedCount = seats.filter((s) => s.status === 'OCCUPIED').length;
  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;
  const occupancyPercentage = totalSeats > 0 ? Math.round((occupiedCount / totalSeats) * 100) : 0;
  const expiringSoonCount = students.filter((s) => Boolean(s.seatNumber) && s.membershipEndsInDays <= 5 && s.status === 'ACTIVE').length;

  // Financial and Operational metrics for Home Tab
  const thisMonthFeeCollected = useMemo(() => {
    if (!activeLibrary?.feeTransactions) return 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return activeLibrary.feeTransactions.reduce((acc, tx) => {
      let isThisMonth = false;
      if (tx.paymentDate) {
        const txDate = new Date(tx.paymentDate);
        if (!isNaN(txDate.getTime())) {
          isThisMonth =
            txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear;
        }
      }
      return isThisMonth ? acc + (Number(tx.amount) || 0) : acc;
    }, 0);
  }, [activeLibrary?.feeTransactions]);

  const totalPendingDuesAmount = useMemo(() => {
    return students.reduce((acc, s) => acc + (Number(s.remainingFee) || 0), 0);
  }, [students]);

  const studentsWithDuesList = useMemo(() => {
    return students
      .filter((s) => (Number(s.remainingFee) || 0) > 0 || (s.membershipEndsInDays <= 5 && s.status === 'ACTIVE'))
      .sort((a, b) => (Number(b.remainingFee) || 0) - (Number(a.remainingFee) || 0));
  }, [students]);

  // Mutators for active library
  const updateActiveLibrary = (updater: (prevLib: LibraryBranch) => LibraryBranch) => {
    if (!activeLibrary) return;
    setLibraries((prev) => {
      const updated = prev.map((lib) => {
        if (lib.id === activeLibrary.id) {
          const res = updater(lib);
          if (res.seats && Array.isArray(res.seats)) {
            res.seats = [...res.seats].sort((a, b) =>
              a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
            );
          }
          return res;
        }
        return lib;
      });
      try {
        localStorage.setItem('seelibrary_libraries', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleCreateLibrary = async (data: { name: string; contactPhone: string; address?: string }) => {
    try {
      const res = await fetch('/api/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser?.email || 'admin@seelibrary.com',
          name: data.name,
          contactPhone: data.contactPhone,
          address: data.address,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const newLib = result.library;
        setLibraries((prev) => {
          const updated = [...prev, newLib];
          try {
            localStorage.setItem('seelibrary_libraries', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setActiveLibraryId(newLib.id);
        setIsBranchDropdownOpen(false);
        setIsLibraryModalOpen(false);
        return;
      }
    } catch (e) {
      console.error('Database create library error:', e);
    }

    // Fallback if network offline
    const newLib: LibraryBranch = {
      id: `lib-${Date.now()}`,
      name: data.name,
      contactPhone: data.contactPhone,
      address: data.address,
      rooms: [{ id: `r-${Date.now()}`, name: 'Main Hall', rows: ['Row A', 'Row B'] }],
      seats: [],
      students: [],
      createdAt: new Date().toISOString(),
    };

    setLibraries((prev) => {
      const updated = [...prev, newLib];
      try {
        localStorage.setItem('seelibrary_libraries', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveLibraryId(newLib.id);
    try {
      localStorage.setItem('seelibrary_active_lib_id', newLib.id);
    } catch {}
    setIsBranchDropdownOpen(false);
    setIsLibraryModalOpen(false);
  };

  const handleEditLibrary = async (data: { name: string; contactPhone: string; address?: string }) => {
    if (!activeLibrary) return;

    // Optimistically update active library in local state & localStorage
    updateActiveLibrary((prevLib) => ({
      ...prevLib,
      name: data.name,
      contactPhone: data.contactPhone,
      address: data.address,
    }));

    // Persist to database via API
    try {
      const res = await fetch(`/api/libraries/${activeLibrary.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          contactPhone: data.contactPhone,
          address: data.address,
        }),
      });

      if (!res.ok) {
        console.warn('Backend library update returned non-OK status');
      }
    } catch (e) {
      console.error('Database update library error:', e);
    }
  };

  const handleStatusChange = async (seatId: string, newStatus: SeatStatus) => {
    if (activeLibrary) {
      try {
        await fetch(`/api/libraries/${activeLibrary.id}/seats`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seatId, status: newStatus }),
        });
      } catch (e) {
        console.error('Failed to update seat status in DB:', e);
      }
    }

    updateActiveLibrary((lib) => ({
      ...lib,
      seats: lib.seats.map((s) =>
        s.id === seatId
          ? {
              ...s,
              status: newStatus,
              studentName: newStatus === 'AVAILABLE' ? null : s.studentName,
            }
          : s
      ),
    }));
  };

  const handleRoomCreated = async (data: {
    roomName: string;
    rowNames: string[];
    rowConfigs?: Array<{ name: string; hasLocker: boolean }>;
    seatsPerRow?: number;
    startNumber?: number;
  }) => {
    if (activeLibrary) {
      try {
        const res = await fetch(`/api/libraries/${activeLibrary.id}/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          const result = await res.json();
          const createdRoom = result.room;
          const createdSeats = result.seats || [];

          updateActiveLibrary((lib) => {
            const existingRooms = (lib.rooms || []).filter(
              (r) => r.name !== 'Main Hall' || lib.seats.length > 0
            );
            return {
              ...lib,
              rooms: [...existingRooms, createdRoom],
              seats: [...lib.seats, ...createdSeats],
            };
          });

          setSelectedRoomId(createdRoom.id);
          return;
        }
      } catch (e) {
        console.error('Database create room error:', e);
      }
    }

    // Fallback if offline
    const finalRoomName = data.roomName.trim() || 'Ground Floor - Silent Hall';
    const validRows = data.rowNames.filter((r) => r.trim().length > 0);
    const finalRows = validRows.length > 0 ? validRows : ['Row A', 'Row B'];

    const newRoomId = `r-${Date.now()}`;
    const newRoom = { id: newRoomId, name: finalRoomName, rows: finalRows };
    const seatsPerRow = data.seatsPerRow ?? 10;
    const newSeats: VisualSeatItem[] = [];

    const lockerMap = new Map<string, boolean>();
    (data.rowConfigs || []).forEach((rc) => {
      lockerMap.set(rc.name.trim().toLowerCase(), rc.hasLocker);
    });

    if (seatsPerRow > 0) {
      let currentNum = Math.max(1, data.startNumber || 1);
      finalRows.forEach((rowName, rIdx) => {
        const rowMatch = rowName.match(/([A-Za-z0-9]+)$/);
        const prefix = rowMatch ? `${rowMatch[1].toUpperCase()}-` : `R${rIdx + 1}-`;
        const hasLocker = lockerMap.get(rowName.trim().toLowerCase()) ?? false;

        for (let i = 0; i < seatsPerRow; i++) {
          const num = currentNum < 10 ? `0${currentNum}` : `${currentNum}`;
          newSeats.push({
            id: `seat-${Date.now()}-${rIdx}-${currentNum}`,
            seatNumber: `${prefix}${num}`,
            rowName: rowName,
            status: 'AVAILABLE',
            studentName: null,
            roomId: newRoomId,
            hasLocker,
          });
          currentNum++;
        }
      });
    }

    updateActiveLibrary((lib) => {
      const existingRooms = (lib.rooms || []).filter(
        (r) => r.name !== 'Main Hall' || lib.seats.length > 0
      );
      return {
        ...lib,
        rooms: [...existingRooms, newRoom],
        seats: [...lib.seats, ...newSeats],
      };
    });

    setSelectedRoomId(newRoomId);
  };

  const handleAddRowsToRoom = async (data: {
    rowNames: string[];
    rowConfigs?: Array<{ name: string; hasLocker: boolean }>;
    seatsPerRow: number;
    startNumber?: number;
  }) => {
    if (!currentSelectedRoom || !activeLibrary) return;
    const roomId = currentSelectedRoom.id;

    try {
      const res = await fetch(`/api/libraries/${activeLibrary.id}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          rowNames: data.rowNames,
          rowConfigs: data.rowConfigs,
          seatsPerRow: data.seatsPerRow,
          startNumber: data.startNumber,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        updateActiveLibrary((lib) => ({
          ...lib,
          rooms: (lib.rooms || []).map((r) =>
            r.id === roomId
              ? { ...r, rows: Array.from(new Set([...r.rows, ...data.rowNames])) }
              : r
          ),
          seats: [...lib.seats, ...(result.seats || [])],
        }));
        setIsAddRowModalOpen(false);
        return;
      }
    } catch (e) {
      console.error('Failed to add rows to room in DB:', e);
    }

    // Fallback if offline
    const fallbackSeats: VisualSeatItem[] = [];
    let currentNum = Math.max(1, data.startNumber || 1);
    const lockerMap = new Map<string, boolean>();
    (data.rowConfigs || []).forEach((rc) => {
      lockerMap.set(rc.name.trim().toLowerCase(), rc.hasLocker);
    });

    data.rowNames.forEach((rName) => {
      const hasLocker = lockerMap.get(rName.trim().toLowerCase()) ?? false;
      for (let i = 0; i < data.seatsPerRow; i++) {
        const num = currentNum < 10 ? `0${currentNum}` : `${currentNum}`;
        fallbackSeats.push({
          id: `seat-${Date.now()}-${rName}-${currentNum}`,
          seatNumber: `${num}`,
          rowName: rName,
          status: 'AVAILABLE',
          studentName: null,
          roomId,
          hasLocker,
        });
        currentNum++;
      }
    });

    updateActiveLibrary((lib) => ({
      ...lib,
      rooms: (lib.rooms || []).map((r) =>
        r.id === roomId
          ? { ...r, rows: Array.from(new Set([...r.rows, ...data.rowNames])) }
          : r
      ),
      seats: [...lib.seats, ...fallbackSeats],
    }));
    setIsAddRowModalOpen(false);
  };

  const handleSaveRoomName = async (newName: string) => {
    if (!editingRoom || !activeLibrary) return;

    try {
      await fetch(`/api/libraries/${activeLibrary.id}/rooms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: editingRoom.id, newName }),
      });
    } catch (e) {
      console.error('Failed to rename room in DB:', e);
    }

    updateActiveLibrary((lib) => ({
      ...lib,
      rooms: (lib.rooms || []).map((r) =>
        r.id === editingRoom.id ? { ...r, name: newName } : r
      ),
    }));
    setEditingRoom(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    const targetRoom = displayRooms.find((r) => r.id === roomId);
    if (!targetRoom || !activeLibrary) return;

    if (
      !window.confirm(
        `Are you sure you want to delete room "${targetRoom.name}"?\nAll rows and seats in this room will be permanently deleted from the database.`
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/libraries/${activeLibrary.id}/rooms?roomId=${roomId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete room in DB:', e);
    }

    const roomSeats = getSeatsForRoom(targetRoom);
    const roomSeatIds = new Set(roomSeats.map((s) => s.id));

    updateActiveLibrary((lib) => ({
      ...lib,
      rooms: (lib.rooms || []).filter((r) => r.id !== roomId),
      seats: (lib.seats || []).filter((s) => !roomSeatIds.has(s.id)),
    }));

    if (selectedRoomId === roomId) {
      setSelectedRoomId(null);
    }
    setActiveRoomMenuId(null);
  };

  const handleDeleteRow = async (rowName: string) => {
    if (!currentSelectedRoom || !activeLibrary) return;

    try {
      const res = await fetch(
        `/api/libraries/${activeLibrary.id}/rows?rowName=${encodeURIComponent(rowName)}&roomId=${currentSelectedRoom.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        console.error('Failed to delete row in DB:', await res.text());
      }
    } catch (e) {
      console.error('Failed to delete row in DB:', e);
    }

    updateActiveLibrary((lib) => {
      const deletedSeatNumbers = (lib.seats || [])
        .filter((s) => {
          const isThisRoom =
            s.roomId === currentSelectedRoom.id ||
            (!s.roomId && displayRooms[0]?.id === currentSelectedRoom.id);
          return isThisRoom && (s.rowName || 'Row A').toLowerCase() === rowName.toLowerCase();
        })
        .map((s) => s.seatNumber);

      return {
        ...lib,
        rooms: (lib.rooms || []).map((r) =>
          r.id === currentSelectedRoom.id
            ? { ...r, rows: r.rows.filter((rw) => rw.toLowerCase() !== rowName.toLowerCase()) }
            : r
        ),
        seats: (lib.seats || []).filter((s) => !deletedSeatNumbers.includes(s.seatNumber)),
        students: (lib.students || []).map((std) =>
          std.seatNumber && deletedSeatNumbers.includes(std.seatNumber)
            ? { ...std, seatNumber: null }
            : std
        ),
      };
    });
  };

  const handleDeleteSeat = async (seatId: string) => {
    if (activeLibrary) {
      try {
        await fetch(`/api/libraries/${activeLibrary.id}/seats?seatId=${seatId}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.error('Failed to delete seat in DB:', e);
      }
    }

    updateActiveLibrary((lib) => ({
      ...lib,
      seats: (lib.seats || []).filter((s) => s.id !== seatId),
    }));
  };

  const handleStudentCreated = async (data: {
    fullName: string;
    phone: string;
    studyPurpose?: string;
    shift?: string;
    durationMonths?: number;
    feeAmount?: number;
    seatNumber?: string | null;
    photoUrl?: string | null;
    kycPhotoUrl?: string | null;
    kycDocId?: string;
    kycType?: string;
  }) => {
    if (!activeLibrary) return;

    const chosenSeatNumber = data.seatNumber || null;

    try {
      const res = await fetch(`/api/libraries/${activeLibrary.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          seatNumber: chosenSeatNumber,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const newStudent = result.student;
        const initialTx = result.transaction;

        updateActiveLibrary((lib) => ({
          ...lib,
          students: [newStudent, ...lib.students],
          feeTransactions: initialTx ? [initialTx, ...(lib.feeTransactions || [])] : (lib.feeTransactions || []),
          seats: chosenSeatNumber
            ? lib.seats.map((s) =>
                s.seatNumber === chosenSeatNumber
                  ? { ...s, status: 'OCCUPIED' as const, studentName: data.fullName, shift: data.shift || 'FULL_DAY' }
                  : s
              )
            : lib.seats,
        }));
        setIsStudentModalOpen(false);
        setPreselectedSeatNumberForNewStudent(null);
        return;
      }
    } catch (e) {
      console.error('Failed to create student in DB:', e);
    }

    // Fallback if offline
    const fallbackStdId = `std-${Date.now()}`;
    const fallbackAmount = data.feeAmount ? Number(data.feeAmount) : 0;
    let fallbackTx: StudentFeeRecord | null = null;
    if (fallbackAmount > 0) {
      const fallbackMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      fallbackTx = {
        id: `tx-${Date.now()}`,
        studentId: fallbackStdId,
        studentName: data.fullName,
        studentPhone: data.phone,
        seatNumber: chosenSeatNumber,
        amount: fallbackAmount,
        paidForMonth: fallbackMonth,
        paymentDate: new Date().toISOString(),
        paymentMode: 'UPI',
        status: 'PAID',
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
        notes: 'Initial registration fee',
      };
    }

    const newStudent: StudentItem = {
      id: fallbackStdId,
      fullName: data.fullName,
      phone: data.phone,
      studyPurpose: data.studyPurpose,
      shift: data.shift || '',
      seatNumber: chosenSeatNumber || null,
      status: chosenSeatNumber ? 'ACTIVE' : 'INACTIVE',
      membershipEndsInDays: chosenSeatNumber && fallbackAmount > 0 ? (data.durationMonths || 1) * 30 : 0,
      photoUrl: data.photoUrl || undefined,
      kycPhotoUrl: data.kycPhotoUrl || undefined,
      kycDocId: data.kycDocId || undefined,
      kycType: data.kycType || 'AADHAAR',
      monthlyFee: fallbackAmount,
      transactions: fallbackTx ? [fallbackTx] : [],
    };

    updateActiveLibrary((lib) => ({
      ...lib,
      students: [newStudent, ...lib.students],
      feeTransactions: fallbackTx ? [fallbackTx, ...(lib.feeTransactions || [])] : (lib.feeTransactions || []),
      seats: chosenSeatNumber && fallbackAmount > 0
        ? lib.seats.map((s) =>
            s.seatNumber === chosenSeatNumber
              ? { ...s, status: 'OCCUPIED' as const, studentName: data.fullName, shift: data.shift }
              : s
          )
        : lib.seats,
    }));
    setIsStudentModalOpen(false);
    setPreselectedSeatNumberForNewStudent(null);
  };

  const handleAssignSeat = async (
    studentId: string,
    seatNumber: string | null,
    shift?: string,
    isReserved?: boolean
  ) => {
    if (!activeLibrary) return;
    const student = activeLibrary.students.find((s) => s.id === studentId);
    const oldSeatNumber = student?.seatNumber;

    // 1. Optimistic UI update
    updateActiveLibrary((lib) => {
      const updatedStudents = lib.students.map((std) => {
        if (std.id === studentId) {
          const now = new Date();
          const txs = std.transactions || [];
          let activeDaysFromTx = 0;
          for (const tx of txs) {
            if (tx.validTo) {
              const dTo = new Date(tx.validTo);
              if (!isNaN(dTo.getTime()) && dTo > now) {
                const diff = Math.max(0, Math.ceil((dTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                if (diff > activeDaysFromTx) activeDaysFromTx = diff;
              }
            }
          }
          const preservedDays = activeDaysFromTx > 0 ? activeDaysFromTx : (std.membershipEndsInDays > 0 ? std.membershipEndsInDays : 0);
          const hasValidMembership = preservedDays > 0 && std.status !== 'EXPIRED';

          return {
            ...std,
            seatNumber,
            previousSeatNumber: seatNumber ? null : (oldSeatNumber || std.previousSeatNumber || null),
            inactiveDays: seatNumber ? 0 : (std.inactiveDays || 0),
            shift: shift || std.shift,
            status: (hasValidMembership ? 'ACTIVE' : (seatNumber ? 'ACTIVE' : 'INACTIVE')) as any,
            membershipEndsInDays: preservedDays,
          };
        }
        return std;
      });

      const updatedSeats = lib.seats.map((seat) => {
        // Free old seat if previously occupied by this student
        if (oldSeatNumber && seat.seatNumber === oldSeatNumber) {
          const remainingOccupants = (seat.occupants || []).filter((o) => o.studentId !== studentId);
          if (remainingOccupants.length === 0) {
            return {
              ...seat,
              status: 'AVAILABLE' as const,
              studentName: null,
              shift: undefined,
              occupants: [],
            };
          } else {
            const mainName =
              remainingOccupants.length === 1
                ? remainingOccupants[0].studentName
                : remainingOccupants.map((o) => `${o.studentName} (${(o.shift || 'F').charAt(0)})`).join(' • ');
            return {
              ...seat,
              studentName: mainName,
              shift: remainingOccupants.length === 1 ? remainingOccupants[0].shift : 'SHARED',
              occupants: remainingOccupants,
            };
          }
        }
        // Occupy or reserve new seat
        if (seatNumber && seat.seatNumber === seatNumber) {
          const targetShift = (shift || student?.shift || 'FULL_DAY').toUpperCase();
          const isTargetMorning = targetShift === 'MORNING' || targetShift === 'FOUR_HOURS' || targetShift === 'HALF_DAY';
          const isTargetEvening = targetShift === 'EVENING';

          const currentOccupants = (seat.occupants || []).filter((o) => o.studentId !== studentId);
          let newOccupants: any[] = [];

          if (targetShift === 'FULL_DAY') {
            newOccupants = [
              {
                studentId,
                studentName: student?.fullName || 'Student',
                phone: student?.phone,
                shift: 'FULL_DAY',
              },
            ];
          } else {
            const keptOccupants = currentOccupants.filter((o) => {
              const oShift = (o.shift || 'FULL_DAY').toUpperCase();
              const oIsMorning = oShift === 'MORNING' || oShift === 'FOUR_HOURS' || oShift === 'HALF_DAY';
              const oIsEvening = oShift === 'EVENING';
              if (oShift === 'FULL_DAY') return false;
              if (isTargetMorning && oIsMorning) return false;
              if (isTargetEvening && oIsEvening) return false;
              return true;
            });

            newOccupants = [
              ...keptOccupants,
              {
                studentId,
                studentName: student?.fullName || 'Student',
                phone: student?.phone,
                shift: targetShift,
              },
            ];
          }

          const mainName =
            newOccupants.length === 1
              ? newOccupants[0].studentName
              : newOccupants.map((o) => `${o.studentName} (${(o.shift || 'F').charAt(0)})`).join(' • ');
          const mainShift = newOccupants.length === 1 ? newOccupants[0].shift : 'SHARED';

          return {
            ...seat,
            status: isReserved ? ('RESERVED' as const) : ('OCCUPIED' as const),
            studentName: mainName,
            shift: mainShift,
            occupants: newOccupants,
          };
        }
        return seat;
      });

      return { ...lib, students: updatedStudents, seats: updatedSeats };
    });

    // Update active modal student state
    setSelectedStudentForProfile((prev) => {
      if (!prev || prev.id !== studentId) return prev;
      const now = new Date();
      const txs = prev.transactions || [];
      let activeDaysFromTx = 0;
      for (const tx of txs) {
        if (tx.validTo) {
          const dTo = new Date(tx.validTo);
          if (!isNaN(dTo.getTime()) && dTo > now) {
            const diff = Math.max(0, Math.ceil((dTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            if (diff > activeDaysFromTx) activeDaysFromTx = diff;
          }
        }
      }
      const preservedDays = activeDaysFromTx > 0 ? activeDaysFromTx : (prev.membershipEndsInDays > 0 ? prev.membershipEndsInDays : 0);
      const hasValidMembership = preservedDays > 0 && prev.status !== 'EXPIRED';

      return {
        ...prev,
        seatNumber,
        previousSeatNumber: seatNumber ? null : (oldSeatNumber || prev.previousSeatNumber || null),
        inactiveDays: seatNumber ? 0 : (prev.inactiveDays || 0),
        shift: shift || prev.shift,
        status: (hasValidMembership ? 'ACTIVE' : (seatNumber ? 'ACTIVE' : 'INACTIVE')) as any,
        membershipEndsInDays: preservedDays,
      };
    });

    // 2. Sync with database
    try {
      const res = await fetch(`/api/libraries/${activeLibrary.id}/seats/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, seatNumber, shift, reserveSeat: isReserved }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Failed to sync seat assignment with DB:', errText);
      }
    } catch (e) {
      console.error('Failed to sync seat assignment with DB:', e);
    }
  };

  const handleUpdateStudent = async (studentId: string, data: Partial<StudentItem>) => {
    if (!activeLibrary) return;

    // 1. Optimistic UI update
    updateActiveLibrary((lib) => {
      const updatedStudents = lib.students.map((s) =>
        s.id === studentId ? { ...s, ...data } : s
      );

      // If name or shift changed, also update any seat assigned to this student
      const updatedSeats = lib.seats.map((seat) => {
        const student = lib.students.find((s) => s.id === studentId);
        if (student && student.seatNumber && seat.seatNumber === student.seatNumber) {
          return {
            ...seat,
            studentName: data.fullName ?? seat.studentName,
            shift: data.shift ?? seat.shift,
          };
        }
        return seat;
      });

      return { ...lib, students: updatedStudents, seats: updatedSeats };
    });

    // Update active modal student state
    setSelectedStudentForProfile((prev) =>
      prev && prev.id === studentId ? { ...prev, ...data } : prev
    );

    // 2. Persist to PostgreSQL database
    try {
      await fetch(`/api/libraries/${activeLibrary.id}/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error('Failed to update student in DB:', e);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!activeLibrary) return;
    const student = activeLibrary.students.find((s) => s.id === studentId);
    const assignedSeat = student?.seatNumber;

    // 1. Optimistic UI update
    updateActiveLibrary((lib) => {
      const remainingStudents = lib.students.filter((s) => s.id !== studentId);
      const updatedSeats = lib.seats.map((seat) => {
        if (assignedSeat && seat.seatNumber === assignedSeat) {
          return {
            ...seat,
            status: 'AVAILABLE' as const,
            studentName: null,
            shift: undefined,
          };
        }
        return seat;
      });

      return { ...lib, students: remainingStudents, seats: updatedSeats };
    });

    setSelectedStudentForProfile(null);

    // 2. Persist delete to PostgreSQL backend
    try {
      await fetch(`/api/libraries/${activeLibrary.id}/students/${studentId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete student in DB:', e);
    }
  };

  const handleRecordFeePayment = async (paymentData: {
    studentId: string;
    amount: number;
    totalFee?: number;
    remainingFee?: number;
    validFrom?: string;
    validTo?: string;
    paidForMonth: string;
    paymentMode: string;
    paymentDate: string;
    notes?: string;
    extendDays: number;
    shift?: string;
    stayDuration?: string;
    isSettlingDue?: boolean;
    assignedSeatNumber?: string;
  }) => {
    if (!activeLibrary) return;

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const student = activeLibrary.students.find((s) => s.id === paymentData.studentId);

    const isPartial = paymentData.remainingFee !== undefined && paymentData.remainingFee > 0;
    const newTx: StudentFeeRecord = {
      id: `tx-${Date.now()}`,
      studentId: paymentData.studentId,
      studentName: student?.fullName || 'Student',
      studentPhone: student?.phone || '',
      seatNumber: student?.seatNumber || null,
      amount: paymentData.amount,
      totalFee: paymentData.totalFee ?? paymentData.amount,
      remainingFee: paymentData.remainingFee ?? 0,
      validFrom: paymentData.validFrom,
      validTo: paymentData.validTo,
      paidForMonth: paymentData.paidForMonth,
      paymentDate: paymentData.paymentDate,
      paymentMode: paymentData.paymentMode,
      status: isPartial ? 'PARTIAL' : 'PAID',
      receiptNumber,
      notes: paymentData.notes,
      shift: paymentData.shift,
      stayDuration: paymentData.stayDuration,
    };

    // 1. Optimistic UI update
    updateActiveLibrary((lib) => {
      const updatedStudents = lib.students.map((s) => {
        if (s.id === paymentData.studentId) {
          const currentDays = Math.max(0, s.membershipEndsInDays || 0);
          const updatedMonthlyFee = paymentData.totalFee !== undefined && Number(paymentData.totalFee) > 0
            ? Number(paymentData.totalFee)
            : paymentData.amount > 0
            ? Number(paymentData.amount)
            : (s.monthlyFee || s.totalFee || 0);

          // Update prior partial transactions for this student/month
          const updatedOldTxs = (s.transactions || []).map((t) => {
            const matchesMonth = t.paidForMonth?.trim().toLowerCase() === paymentData.paidForMonth?.trim().toLowerCase();
            if ((matchesMonth || paymentData.isSettlingDue) && t.remainingFee && t.remainingFee > 0) {
              const newRem = paymentData.remainingFee !== undefined ? paymentData.remainingFee : Math.max(0, t.remainingFee - paymentData.amount);
              return {
                ...t,
                remainingFee: newRem,
                status: newRem === 0 ? ('PAID' as const) : ('PARTIAL' as const),
              };
            }
            return t;
          });

          const assignedSeat = paymentData.assignedSeatNumber !== undefined
            ? (paymentData.assignedSeatNumber || null)
            : s.seatNumber;

          return {
            ...s,
            seatNumber: assignedSeat,
            previousSeatNumber: assignedSeat ? null : s.previousSeatNumber,
            shift: paymentData.shift || s.shift,
            stayDuration: paymentData.stayDuration || s.stayDuration,
            monthlyFee: updatedMonthlyFee,
            totalFee: updatedMonthlyFee,
            remainingFee: paymentData.remainingFee ?? 0,
            status: 'ACTIVE' as const,
            membershipEndsInDays:
              paymentData.extendDays > 0
                ? paymentData.validTo
                  ? Math.max(0, Math.ceil((new Date(paymentData.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : currentDays <= 0
                  ? paymentData.extendDays
                  : currentDays + paymentData.extendDays
                : currentDays,
            transactions: [newTx, ...updatedOldTxs],
          };
        }
        return s;
      });

      // Update seat's status and shift if assignedSeatNumber was provided or student has seat
      const targetSeatNumber = paymentData.assignedSeatNumber || student?.seatNumber;
      const oldSeatNumber = student?.seatNumber;

      const updatedSeats = lib.seats.map((seat) => {
        // If old seat changed, free it
        if (oldSeatNumber && paymentData.assignedSeatNumber && oldSeatNumber !== paymentData.assignedSeatNumber && seat.seatNumber === oldSeatNumber) {
          return {
            ...seat,
            status: 'AVAILABLE' as const,
            studentName: null,
            shift: undefined,
          };
        }
        // If seat assigned or updated, occupy it
        if (targetSeatNumber && seat.seatNumber === targetSeatNumber) {
          return {
            ...seat,
            status: 'OCCUPIED' as const,
            studentName: student?.fullName || 'Student',
            shift: paymentData.shift || student?.shift || 'FULL_DAY',
          };
        }
        return seat;
      });

      const updatedTransactions = [
        newTx,
        ...(lib.feeTransactions || []).map((t) => {
          if (t.studentId === paymentData.studentId) {
            const matchesMonth = t.paidForMonth?.trim().toLowerCase() === paymentData.paidForMonth?.trim().toLowerCase();
            if ((matchesMonth || paymentData.isSettlingDue) && t.remainingFee && t.remainingFee > 0) {
              const newRem = paymentData.remainingFee !== undefined ? paymentData.remainingFee : Math.max(0, t.remainingFee - paymentData.amount);
              return {
                ...t,
                remainingFee: newRem,
                status: newRem === 0 ? ('PAID' as const) : ('PARTIAL' as const),
              };
            }
          }
          return t;
        }),
      ];

      return {
        ...lib,
        students: updatedStudents,
        seats: updatedSeats,
        feeTransactions: updatedTransactions,
      };
    });

    // Also update student in selected profile modal if open
    setSelectedStudentForProfile((prev) => {
      if (prev && prev.id === paymentData.studentId) {
        const currentDays = Math.max(0, prev.membershipEndsInDays || 0);
        const updatedMonthlyFee = paymentData.totalFee !== undefined && Number(paymentData.totalFee) > 0
          ? Number(paymentData.totalFee)
          : paymentData.amount > 0
          ? Number(paymentData.amount)
          : (prev.monthlyFee || prev.totalFee || 0);

        const updatedOldTxs = (prev.transactions || []).map((t) => {
          const matchesMonth = t.paidForMonth?.trim().toLowerCase() === paymentData.paidForMonth?.trim().toLowerCase();
          if ((matchesMonth || paymentData.isSettlingDue) && t.remainingFee && t.remainingFee > 0) {
            const newRem = paymentData.remainingFee !== undefined ? paymentData.remainingFee : Math.max(0, t.remainingFee - paymentData.amount);
            return {
              ...t,
              remainingFee: newRem,
              status: newRem === 0 ? ('PAID' as const) : ('PARTIAL' as const),
            };
          }
          return t;
        });

        const assignedSeat = paymentData.assignedSeatNumber !== undefined
          ? (paymentData.assignedSeatNumber || null)
          : prev.seatNumber;

        return {
          ...prev,
          seatNumber: assignedSeat,
          previousSeatNumber: assignedSeat ? null : prev.previousSeatNumber,
          shift: paymentData.shift || prev.shift,
          stayDuration: paymentData.stayDuration || prev.stayDuration,
          monthlyFee: updatedMonthlyFee,
          totalFee: updatedMonthlyFee,
          remainingFee: paymentData.remainingFee ?? 0,
          status: 'ACTIVE' as const,
          membershipEndsInDays:
            paymentData.extendDays > 0
              ? paymentData.validTo
                ? Math.max(0, Math.ceil((new Date(paymentData.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : currentDays <= 0
                ? paymentData.extendDays
                : currentDays + paymentData.extendDays
              : currentDays,
          transactions: [newTx, ...updatedOldTxs],
        };
      }
      return prev;
    });

    // 2. Persist to PostgreSQL backend
    try {
      if (paymentData.assignedSeatNumber && paymentData.assignedSeatNumber !== student?.seatNumber) {
        handleAssignSeat(paymentData.studentId, paymentData.assignedSeatNumber, paymentData.shift);
      }
      await fetch(`/api/libraries/${activeLibrary.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });
    } catch (e) {
      console.error('Failed to save fee transaction in DB:', e);
    }
    return newTx;
  };

  // 0. SKELETON LOADING STATE (During SSR hydration or initial DB network sync)
  if (!mounted || (currentUser && isSyncingData && libraries.length === 0)) {
    return <DashboardSkeleton />;
  }

  // 1. PUBLIC LANDING PAGE (When visitor is NOT logged in)
  if (mounted && !currentUser) {
    return (
      <>
        <PWACompanion />
        <PublicLandingPage
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLaunchDemo={handleLaunchDemo}
        />

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            currentUser={currentUser}
            onLoginSuccess={handleUserLogin}
            onLogout={handleUserLogout}
          />
        )}
      </>
    );
  }

  // 1.5. SUPER ADMIN PLATFORM CONSOLE VIEW
  if (mounted && currentUser && isSuperAdmin && isAdminPortalView) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 transition-colors">
        <PWACompanion />

        {/* Super Admin Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#262626] px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  see<span className="text-amber-500 dark:text-amber-400">Library</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Platform Governance & Multi-Tenant Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('seelibrary_view_mode', 'library');
                } catch {}
                setIsAdminPortalView(false);
              }}
              className="px-3 py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-[#2a2a2a] cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden sm:inline">Switch to Library View</span>
              <span className="sm:hidden">Library View</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLibraryModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Library</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer border border-slate-200 dark:border-[#2a2a2a]"
              aria-label="Toggle theme"
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <button
              type="button"
              onClick={handleUserLogout}
              className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Admin Console */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
          <AdminDashboard
            currentUser={currentUser}
            onSwitchToLibraryView={(targetLibId) => {
              try {
                sessionStorage.setItem('seelibrary_view_mode', 'library');
                if (targetLibId) {
                  setActiveLibraryId(targetLibId);
                  localStorage.setItem('seelibrary_active_lib_id', targetLibId);
                }
              } catch {}
              setIsAdminPortalView(false);
            }}
            onLogout={handleUserLogout}
          />
        </main>

        {isLibraryModalOpen && (
          <CreateLibraryModal
            isOpen={isLibraryModalOpen}
            onClose={() => setIsLibraryModalOpen(false)}
            onCreated={handleCreateLibrary}
          />
        )}
      </div>
    );
  }

  // 2. WELCOME / BLANK DASHBOARD (When logged in, but ZERO libraries created yet)
  if (mounted && currentUser && libraries.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-900 text-white selection:bg-indigo-500 selection:text-white">
        <PWACompanion />

        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20">
              sL
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-white">
                see<span className="text-indigo-400">Library</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  currentUser.fullName.charAt(0)
                )}
              </div>
              <span className="hidden sm:inline font-bold">{currentUser.fullName}</span>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('seelibrary_view_mode');
                  } catch {}
                  router.push('/admin');
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Super Admin Portal</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleUserLogout}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Blank Slate Onboarding Card */}
        <main className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full flex flex-col items-center justify-center text-center">
          <div className="w-full bg-slate-800/60 border border-slate-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-6 shadow-md">
              <Building2 className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Starter Tier Included</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight max-w-xl">
              Welcome to seeLibrary, {currentUser.fullName}!
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 mt-3 max-w-lg leading-relaxed">
              You don't have any study center or library branches created yet. Create your first branch to start setting up study rooms, numbered rows, seat layouts, and admitting students.
            </p>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('seelibrary_view_mode');
                  } catch {}
                  router.push('/admin');
                }}
                className="mt-6 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 border border-amber-300/40 cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-slate-950" />
                <span>Open Super Admin Portal</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLibraryModalOpen(true)}
              className="mt-8 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Library (Free)</span>
            </button>

            {/* Quick 3-Step Guide */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50">
                <span className="text-[10px] font-black uppercase text-indigo-400">Step 1</span>
                <h4 className="text-xs font-bold text-white mt-1">Name & Contact</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter branch name, location, and owner phone number.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50">
                <span className="text-[10px] font-black uppercase text-purple-400">Step 2</span>
                <h4 className="text-xs font-bold text-white mt-1">Configure Rooms</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Designate quiet study halls, AC cubicles, and rows (Row A, Row B).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50">
                <span className="text-[10px] font-black uppercase text-emerald-400">Step 3</span>
                <h4 className="text-xs font-bold text-white mt-1">Seats & Students</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Batch generate seats and register students with shift schedules.
                </p>
              </div>
            </div>
          </div>
        </main>

        {isLibraryModalOpen && (
          <CreateLibraryModal
            isOpen={isLibraryModalOpen}
            onClose={() => setIsLibraryModalOpen(false)}
            onCreated={handleCreateLibrary}
          />
        )}
      </div>
    );
  }

  // 3. AUTHENTICATED DASHBOARD (With created libraries)
  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-8 select-none bg-slate-50 dark:bg-black text-slate-900 dark:text-[#f5f5f5] md:pl-64 transition-colors overflow-x-hidden w-full max-w-full">
      <PWACompanion />

      {/* Desktop Sidebar (visible on md: screens and above) */}
      <DesktopSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeLibrary={activeLibrary}
        libraries={libraries}
        onSelectLibrary={(lib) => {
          setActiveLibraryId(lib.id);
          try {
            localStorage.setItem('seelibrary_active_lib_id', lib.id);
          } catch {}
        }}
        onOpenCreateLibrary={() => setIsLibraryModalOpen(true)}
        onOpenEditLibrary={() => setIsEditLibraryModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleUserLogout}
        isSuperAdmin={isSuperAdmin}
        hasActiveSubscription={hasActiveSubscription}
        onOpenAdminPortal={() => {
          try {
            sessionStorage.removeItem('seelibrary_view_mode');
          } catch {}
          router.push('/admin');
        }}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenAddStudent={() => requireSubscription('Enroll Students', () => setIsStudentModalOpen(true))}
        onOpenCollectFee={() => requireSubscription('Collect Fees', () => setIsCollectFeeModalOpen(true))}
      />

      {/* Mobile Top Navigation Header (Mobile only - hidden on desktop where sidebar is present) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-200 dark:border-[#262626] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-xs transition-colors w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm tracking-tight shrink-0">
            sL
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-[#f5f5f5] tracking-tight truncate">
                see<span className="text-indigo-600 dark:text-indigo-400">Library</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/50 shrink-0">
                SaaS
              </span>
            </div>

            {/* Branch Switcher Dropdown */}
            {activeLibrary && (
              <div className="relative mt-0.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-neutral-300 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-full"
                >
                  <span className="truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px]">
                    {activeLibrary.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 shrink-0" />
                </button>

                {isBranchDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 max-w-[calc(100vw-32px)] bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase text-slate-400 dark:text-neutral-500 border-b border-slate-100 dark:border-[#262626]">
                      Select Library Branch ({libraries.length})
                    </div>

                    <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
                      {libraries.map((lib) => (
                        <button
                          key={lib.id}
                          type="button"
                          onClick={() => {
                            setActiveLibraryId(lib.id);
                            try {
                              localStorage.setItem('seelibrary_active_lib_id', lib.id);
                            } catch {}
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                            lib.id === activeLibrary.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#1c1c1e]'
                          }`}
                        >
                          <span className="truncate">{lib.name}</span>
                          {lib.id === activeLibrary.id && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 dark:border-[#262626] pt-1 space-y-0.5">
                      {activeLibrary && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsBranchDropdownOpen(false);
                            setIsEditLibraryModalOpen(true);
                          }}
                          className="w-full px-3 py-2 text-left rounded-lg text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#1c1c1e] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          <span>Edit Active Branch</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsBranchDropdownOpen(false);
                          setIsLibraryModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Another Library</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
          {isTestMode && (
            <span className="hidden xs:flex text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Test Mode</span>
            </span>
          )}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem('seelibrary_view_mode');
                } catch {}
                router.push('/admin');
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-900 hover:bg-black text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
              title="Admin Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Theme Switcher Toggle (Mobile) */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] transition-colors cursor-pointer shrink-0"
            aria-label="Toggle theme"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsNotificationCenterOpen(true)}
            className="p-1.5 sm:p-2 rounded-full text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] relative transition-colors cursor-pointer shrink-0"
            aria-label="Notifications"
            title="Open Notification Center"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadNotificationCount > 0 ? (
              <span className="absolute top-0.5 right-0.5 px-1 py-0.2 bg-rose-500 text-white text-[8px] sm:text-[9px] font-black rounded-full shadow-xs">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            ) : expiringSoonCount > 0 ? (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
            ) : null}
          </button>

          {currentUser && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#262626] rounded-xl text-xs font-semibold text-slate-700 dark:text-neutral-200 transition-colors shrink-0"
                title="Click to view profile or sign out"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.fullName.charAt(0)
                  )}
                </div>
                <span className="hidden sm:inline font-bold">{currentUser.fullName}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Top Bar (Clean breadcrumb / title + notifications on desktop) */}
      <header className="hidden md:flex sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-200 dark:border-[#262626] px-6 py-3 items-center justify-between shadow-2xs transition-colors">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#f5f5f5] capitalize">
            {activeTab === 'home'
              ? 'Dashboard Overview'
              : activeTab === 'seats'
              ? 'Seat Layout & Halls'
              : activeTab === 'students'
              ? 'Student Directory'
              : activeTab === 'transactions'
              ? 'Fee History & Payments'
              : 'Branch Settings'}
          </h2>
          {activeLibrary && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {activeLibrary.name}
            </span>
          )}
          {isTestMode && (
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <FlaskConical className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Test Mode</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop Theme Switcher Toggle */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-[#f5f5f5] hover:bg-slate-100 dark:hover:bg-[#1c1c1e] relative transition-colors cursor-pointer"
            aria-label="Toggle theme"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-[#262626]" />
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-5xl mx-auto w-full max-w-full overflow-x-hidden space-y-4">
        {/* Tab 1: Home Dashboard */}
        {activeTab === 'home' && (
          <>
            {/* Only show setup guide if no library has been created or selected yet */}
            {!activeLibrary && (
              <QuickCheckHero
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onOpenCreateLibrary={() => setIsLibraryModalOpen(true)}
                onOpenAddRoom={() => setIsRoomModalOpen(true)}
                onOpenAddStudent={() => requireSubscription('Enroll Students', () => setIsStudentModalOpen(true))}
                isLoggedIn={!!currentUser}
                libraryName="Your Library"
              />
            )}

            {/* Top 4-Pillar High-Density Metric Deck */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Pillar 1: Total Students */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setStudentFilterTab('ALL');
                  setStudentSubTab('directory');
                  setActiveTab('students');
                }}
                className="bg-white dark:bg-[#121212] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                    Total Students
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {students.length}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    {students.filter((s) => s.status === 'ACTIVE').length} Active
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between border-t border-slate-100 dark:border-[#202020] pt-2">
                  <span>{students.filter((s) => !s.seatNumber).length} Unassigned</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                    Directory &rarr;
                  </span>
                </div>
              </div>

              {/* Pillar 2: Seat Occupancy */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('seats')}
                className="bg-white dark:bg-[#121212] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                    Occupancy Rate
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Armchair className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                    {occupancyPercentage}%
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-neutral-300">
                    {occupiedCount}/{totalSeats}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between border-t border-slate-100 dark:border-[#202020] pt-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{availableCount} Available</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                    Layout &rarr;
                  </span>
                </div>
              </div>

              {/* Pillar 3: This Month Collections */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('transactions')}
                className="bg-white dark:bg-[#121212] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#262626] shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                    This Month
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    ₹{thisMonthFeeCollected.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    Collected
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between border-t border-slate-100 dark:border-[#202020] pt-2">
                  <span>{(activeLibrary?.feeTransactions || []).length} Total Txs</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                    Ledger &rarr;
                  </span>
                </div>
              </div>

              {/* Pillar 4: Pending Due Fees */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setStudentFilterTab('FEE_DUE');
                  setStudentSubTab('directory');
                  setActiveTab('students');
                }}
                className={`bg-white dark:bg-[#121212] p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all cursor-pointer group flex flex-col justify-between ${
                  totalPendingDuesAmount > 0
                    ? 'border-amber-300/80 dark:border-amber-900/50 hover:border-amber-500 dark:hover:border-amber-500'
                    : 'border-slate-200 dark:border-[#262626] hover:border-indigo-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                    Pending Dues
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                    totalPendingDuesAmount > 0
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {totalPendingDuesAmount > 0 ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    totalPendingDuesAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    ₹{totalPendingDuesAmount.toLocaleString('en-IN')}
                  </div>
                  {totalPendingDuesAmount > 0 ? (
                    <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                      {studentsWithDuesList.length} Due
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      All Clear
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between border-t border-slate-100 dark:border-[#202020] pt-2">
                  <span>{expiringSoonCount > 0 ? `${expiringSoonCount} ending soon` : 'Zero overdue'}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                    Collect &rarr;
                  </span>
                </div>
              </div>
            </section>

            {/* 2-Column Responsive Hub: Analytics Chart (Left) + Quick Actions & Live Due Feed (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Interactive Analytics Visual Chart */}
              <div className="lg:col-span-7">
                <DashboardChart
                  students={students}
                  seats={seats}
                  totalSeats={totalSeats}
                  occupiedSeats={occupiedCount}
                  transactions={activeLibrary?.feeTransactions || []}
                  rooms={displayRooms}
                  onNavigateTab={setActiveTab}
                  onOpenCollectFee={() => {
                    requireSubscription('Collect Fees', () => {
                      setStudentForFeeCollection(null);
                      setIsCollectFeeModalOpen(true);
                    });
                  }}
                />
              </div>

              {/* Right Column: Operations Hub & Live Attention Feed */}
              <div className="lg:col-span-5 space-y-3.5 flex flex-col justify-between">
                {/* 2x2 Quick Action Command Center */}
                <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200/90 dark:border-[#262626] p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262626] pb-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Quick Operations Hub
                    </h3>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
                      1-Click
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Enroll Student */}
                    <button
                      type="button"
                      onClick={() =>
                        requireSubscription('Enroll Students', () => {
                          setPreselectedSeatNumberForNewStudent(null);
                          setIsStudentModalOpen(true);
                        })
                      }
                      className="p-3 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] text-white shadow-xs flex flex-col items-start justify-between min-h-[76px] transition-all cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight">Enroll Student</span>
                        <span className="text-[10px] text-indigo-100/80 font-medium">Add new admission</span>
                      </div>
                    </button>

                    {/* Collect Fee */}
                    <button
                      type="button"
                      onClick={() =>
                        requireSubscription('Collect Fees', () => {
                          setStudentForFeeCollection(null);
                          setIsCollectFeeModalOpen(true);
                        })
                      }
                      className="p-3 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white shadow-xs flex flex-col items-start justify-between min-h-[76px] transition-all cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <IndianRupee className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight">Collect Fee</span>
                        <span className="text-[10px] text-emerald-100/80 font-medium">Record payment</span>
                      </div>
                    </button>

                    {/* Seat Inventory */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('seats')}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] border border-slate-200 dark:border-[#262626] text-slate-800 dark:text-neutral-200 active:scale-[0.98] shadow-2xs flex flex-col items-start justify-between min-h-[76px] transition-all cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Armchair className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight">Seat Layout</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium">{availableCount} desks free</span>
                      </div>
                    </button>

                    {/* Add Room & Rows */}
                    <button
                      type="button"
                      onClick={() => setIsRoomModalOpen(true)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] border border-slate-200 dark:border-[#262626] text-slate-800 dark:text-neutral-200 active:scale-[0.98] shadow-2xs flex flex-col items-start justify-between min-h-[76px] transition-all cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight">Add Hall/Room</span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium">Create room & rows</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Live Due Fees & Attention Feed */}
                <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200/90 dark:border-[#262626] p-4 shadow-xs space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262626] pb-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Action Needed: Overdue & Expiring
                      </h4>
                    </div>
                    {studentsWithDuesList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentFilterTab('FEE_DUE');
                          setStudentSubTab('directory');
                          setActiveTab('students');
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        View All ({studentsWithDuesList.length})
                      </button>
                    )}
                  </div>

                  {studentsWithDuesList.length === 0 ? (
                    <div className="py-4 text-center space-y-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">No Pending Dues!</p>
                      <p className="text-[10px] text-slate-400 dark:text-neutral-500">All student fees are up-to-date.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {studentsWithDuesList.slice(0, 3).map((std) => (
                        <div
                          key={std.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-[#181818] border border-slate-100 dark:border-[#262626] text-xs hover:bg-slate-100 dark:hover:bg-[#202020] transition-colors"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedStudentForProfile(std);
                              setProfileInitialTab('feeHistory');
                            }}
                            className="min-w-0 pr-2 cursor-pointer"
                          >
                            <p className="font-bold text-slate-900 dark:text-white truncate text-xs hover:text-indigo-600">
                              {std.fullName}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-neutral-500">
                              <span>Seat: {std.seatNumber || 'None'}</span>
                              <span>•</span>
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                ₹{std.remainingFee || 0} Due
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              requireSubscription('Collect Fees', () => {
                                setStudentForFeeCollection(std);
                                setIsCollectFeeModalOpen(true);
                              });
                            }}
                            className="shrink-0 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <IndianRupee className="w-3 h-3" />
                            <span>Collect</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                    <span>Expiring in 5 days: <b>{expiringSoonCount}</b></span>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentFilterTab('EXPIRING_5_DAYS');
                        setStudentSubTab('directory');
                        setActiveTab('students');
                      }}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                    >
                      Inspect &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Room-First Visual Section */}
            {!currentSelectedRoom ? (
              /* State A: Show Rooms First */
              <section className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] p-4 shadow-xs space-y-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#f5f5f5] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Study Rooms & Halls
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Click a room to view rows and seat arrangement
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRoomModalOpen(true)}
                    className="text-xs bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Room & Rows
                  </button>
                </div>

                {displayRooms.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-[#161616] rounded-xl border border-dashed border-slate-200 dark:border-[#262626] space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-neutral-200 text-sm">No Study Rooms Created Yet</h4>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto mt-1">
                        Add your study halls and rows (e.g. Ground Floor, Silent Hall, AC Section) to start managing seats.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRoomModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Create Study Room
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayRooms.map((rm, rIndex) => {
                      const rmSeats = getSeatsForRoom(rm);
                      const rmOccupied = rmSeats.filter((s) => s.status === 'OCCUPIED').length;
                      const rmAvailable = rmSeats.length - rmOccupied;
                      const rmRate = rmSeats.length > 0 ? Math.round((rmOccupied / rmSeats.length) * 100) : 0;
                      const hasLockers = rmSeats.some((s) => s.hasLocker);

                      // Curated theme gradients for each room card
                      const colorVariants = [
                        {
                          borderHover: 'hover:border-indigo-500/70 dark:hover:border-indigo-500/70',
                          badge: 'from-indigo-600 to-indigo-700 text-white shadow-indigo-500/25',
                          bar: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
                          softBg: 'bg-indigo-500/5 group-hover:bg-indigo-500/10',
                          iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white',
                          accentText: 'text-indigo-600 dark:text-indigo-400',
                        },
                        {
                          borderHover: 'hover:border-purple-500/70 dark:hover:border-purple-500/70',
                          badge: 'from-purple-600 to-purple-700 text-white shadow-purple-500/25',
                          bar: 'bg-gradient-to-r from-purple-500 to-purple-600',
                          softBg: 'bg-purple-500/5 group-hover:bg-purple-500/10',
                          iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white',
                          accentText: 'text-purple-600 dark:text-purple-400',
                        },
                        {
                          borderHover: 'hover:border-sky-500/70 dark:hover:border-sky-500/70',
                          badge: 'from-sky-600 to-blue-700 text-white shadow-sky-500/25',
                          bar: 'bg-gradient-to-r from-sky-500 to-blue-600',
                          softBg: 'bg-sky-500/5 group-hover:bg-sky-500/10',
                          iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white',
                          accentText: 'text-sky-600 dark:text-sky-400',
                        },
                      ];
                      const style = colorVariants[rIndex % colorVariants.length];

                      return (
                        <div
                          key={rm.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedRoomId(rm.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedRoomId(rm.id);
                            }
                          }}
                          className={`group text-left p-5 rounded-2xl border-2 border-slate-200/80 dark:border-[#262626] ${style.borderHover} hover:shadow-xl bg-white dark:bg-[#161616] relative transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs hover:-translate-y-1`}
                        >
                          {/* Top Decorative Subtle Glow */}
                          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity opacity-40 group-hover:opacity-100 ${style.softBg}`} />

                          <div className="space-y-3 relative z-10">
                            {/* Card Top Row: Icon + Badges + Menu */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-xs ${style.iconBg}`}>
                                  <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                                    Study Hall
                                  </span>
                                  <h4 className="font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-lg leading-tight transition-colors">
                                    {rm.name}
                                  </h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg bg-gradient-to-r ${style.badge} shadow-xs tracking-tight`}>
                                  {rmSeats.length} Seats
                                </span>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRoomMenuId(activeRoomMenuId === rm.id ? null : rm.id);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262626] text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                                    title="Room Options"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {/* 3-Dot Dropdown Menu */}
                                  {activeRoomMenuId === rm.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveRoomMenuId(null);
                                          setEditingRoom(rm);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-[#262626] flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                                        <span>Edit Name</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleDeleteRoom(rm.id);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete Room</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Tags: Row count & Lockers info */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#262626] text-slate-700 dark:text-neutral-300 border border-slate-200/60 dark:border-neutral-700/60">
                                {rm.rows && rm.rows.length > 0 ? `${rm.rows.length} ${rm.rows.length === 1 ? 'Row' : 'Rows'} (${rm.rows.join(', ')})` : 'No Rows'}
                              </span>
                              {hasLockers && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 flex items-center gap-1">
                                  <span>🔐</span> Includes Lockers
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle Stat Pills */}
                          <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50/80 dark:bg-[#1f1f22] p-2.5 rounded-xl border border-slate-100 dark:border-[#2a2a2d]">
                            <div className="text-left">
                              <p className="text-[10px] font-semibold text-slate-400 dark:text-neutral-400">Available</p>
                              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {rmAvailable} <span className="text-[10px] font-medium text-slate-400">seats</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-semibold text-slate-400 dark:text-neutral-400">Occupied</p>
                              <p className="text-sm font-black text-slate-800 dark:text-neutral-200">
                                {rmOccupied} <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">({rmRate}%)</span>
                              </p>
                            </div>
                          </div>

                          {/* Bottom: Progress bar & Action button */}
                          <div className="mt-3.5 space-y-2.5">
                            {/* Visual Progress Bar */}
                            <div className="w-full h-2 bg-slate-100 dark:bg-[#262626] rounded-full overflow-hidden p-0.5">
                              <div
                                className={`h-full ${style.bar} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.max(rmRate, rmSeats.length > 0 ? 4 : 0)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs font-bold text-slate-600 dark:text-neutral-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                View Layout &amp; Desks
                              </span>
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${style.softBg} ${style.accentText} group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs group-hover:translate-x-0.5`}>
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Another Room Card */}
                    <button
                      type="button"
                      onClick={() => setIsRoomModalOpen(true)}
                      className="group p-5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-500 dark:hover:border-indigo-400 bg-gradient-to-b from-indigo-50/40 via-white to-indigo-50/20 dark:from-indigo-950/20 dark:via-[#161616] dark:to-indigo-950/10 hover:shadow-lg text-slate-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex flex-col items-center justify-center min-h-[190px] text-center gap-3 transition-all duration-200 cursor-pointer hover:-translate-y-1"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 group-hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 group-hover:text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-all duration-200">
                        <Plus className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-extrabold block text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Add Another Room
                        </span>
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                          Create quiet halls, AC zones, or locker rows
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </section>
            ) : (
              /* State B: Inside Specific Room View */
              <section className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] p-4 shadow-xs space-y-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#262626] pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRoomId(null)}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> All Rooms
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-[#f5f5f5]">
                          {currentSelectedRoom.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold rounded-full border border-indigo-100 dark:border-indigo-900/50">
                          {currentSelectedRoom.rows.join(', ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                        {currentRoomOccupied} occupied of {currentRoomSeats.length} seats
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditingRoom(currentSelectedRoom)}
                      className="text-xs bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" /> Edit Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(currentSelectedRoom.id)}
                      className="text-xs bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddRowModalOpen(true)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row & Seats
                    </button>
                  </div>
                </div>

                <SeatGrid
                  seats={currentRoomSeats}
                  onStatusChange={handleStatusChange}
                  onAssignStudent={(seatId, preselectedShift) => {
                    const seat = activeLibrary?.seats.find((s) => s.id === seatId || s.seatNumber === seatId);
                    if (seat) {
                      setSelectedSeatForAssignment(seat);
                      setPreselectedShiftForAssignment(preselectedShift);
                    }
                  }}
                  onAddRow={() => setIsAddRowModalOpen(true)}
                  onAddRoom={() => setIsAddRowModalOpen(true)}
                  onDeleteRow={handleDeleteRow}
                  onDeleteSeat={handleDeleteSeat}
                />
              </section>
            )}
          </>
        )}

        {/* Tab 2: Seats Grid Full View */}
        {activeTab === 'seats' && (
          <section className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#262626] p-4 shadow-xs space-y-3 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#f5f5f5]">Seat Inventory</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {currentSelectedRoom ? (
                    <>Showing <b>{currentSelectedRoom.name}</b> ({currentRoomSeats.length} seats)</>
                  ) : (
                    <>{availableCount} available out of {totalSeats} total seats</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(true)}
                  className="bg-white dark:bg-[#1c1c1e] hover:bg-slate-50 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-[#262626] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Add Room/Row
                </button>
              </div>
            </div>

            {/* Room Selector Pills */}
            {displayRooms.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRoomId(null)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                    !selectedRoomId
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1c1c1e] hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-700 dark:text-neutral-200'
                  }`}
                >
                  <span>All Rooms</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    !selectedRoomId ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-[#262626] text-slate-700 dark:text-neutral-300'
                  }`}>
                    {seats.length}
                  </span>
                </button>

                {displayRooms.map((rm) => {
                  const isSelected = selectedRoomId === rm.id;
                  const count = getSeatsForRoom(rm).length;
                  return (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => setSelectedRoomId(rm.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50'
                      }`}
                    >
                      <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                      <span>{rm.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-200 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                      }`}>
                        {count} {count === 1 ? 'seat' : 'seats'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <SeatGrid
              seats={currentSelectedRoom ? currentRoomSeats : seats}
              onStatusChange={handleStatusChange}
              onAssignStudent={(seatId, preselectedShift) => {
                const seat = activeLibrary?.seats.find((s) => s.id === seatId || s.seatNumber === seatId);
                if (seat) {
                  setSelectedSeatForAssignment(seat);
                  setPreselectedShiftForAssignment(preselectedShift);
                }
              }}
              onAddRow={currentSelectedRoom ? () => setIsAddRowModalOpen(true) : undefined}
              onAddRoom={() => (currentSelectedRoom ? setIsAddRowModalOpen(true) : setIsRoomModalOpen(true))}
              onDeleteRow={handleDeleteRow}
              onDeleteSeat={handleDeleteSeat}
            />
          </section>
        )}

        {/* Tab 3: Students Directory & Pipeline Kanban */}
        {activeTab === 'students' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#f5f5f5]">
                  {studentSubTab === 'directory' ? 'Student Directory' : 'Admission & Lead Pipeline'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {studentSubTab === 'directory'
                    ? `${students.filter((s) => Boolean(s.seatNumber)).length} active • ${students.filter((s) => !s.seatNumber).length} inactive (no seat)`
                    : 'Touch-optimized stage workflow from inquiry to active enrollment'}
                </p>
              </div>

              {/* View Switcher: Directory vs Pipeline */}
              <div className="inline-flex bg-slate-200/80 dark:bg-[#1c1c1e] p-1 rounded-xl shadow-inner self-start border border-transparent dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setStudentSubTab('directory')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    studentSubTab === 'directory'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Directory
                </button>
                <button
                  type="button"
                  onClick={() => setStudentSubTab('pipeline')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    studentSubTab === 'pipeline'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Leads Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  title="View all fee transactions"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Fee History</span>
                </button>
              </div>
            </div>

            {studentSubTab === 'directory' ? (
              <StudentList
                students={students}
                initialFilterTab={studentFilterTab}
                libraryName={activeLibrary?.name}
                libraryPhone={activeLibrary?.contactPhone}
                isRefreshing={isSyncingData}
                onRefresh={async () => {
                  if (currentUser?.email) {
                    await loadUserLibrariesFromDb(currentUser.email, libraries, { skipAuthSync: true });
                  }
                }}
                onAddStudent={() => {
                  requireSubscription('Enroll Students', () => {
                    setPreselectedSeatNumberForNewStudent(null);
                    setIsStudentModalOpen(true);
                  });
                }}
                onStudentClick={(student, tab) => {
                  setProfileInitialTab(tab || 'profile');
                  setSelectedStudentForProfile(student);
                }}
                onCollectFee={(student) => {
                  requireSubscription('Collect Fees', () => {
                    setStudentForFeeCollection(student);
                    setIsCollectFeeModalOpen(true);
                  });
                }}
                onAssignSeat={(student) => {
                  setProfileInitialTab('profile');
                  setSelectedStudentForProfile(student);
                }}
              />
            ) : (
              <KanbanBoard libraryId={activeLibrary?.id} />
            )}
          </section>
        )}

        {/* Tab: Fee Transactions & Revenue Ledger */}
        {activeTab === 'transactions' && activeLibrary && (
          <section className="space-y-4">
            {!hasActiveSubscription ? (
              <div className="bg-white dark:bg-[#121212] rounded-3xl border border-slate-200 dark:border-[#262626] p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm transition-colors">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-inner">
                  <Crown className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Fee History Locked
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#a8a8a8] mt-1 max-w-sm mx-auto">
                    Subscribe to seeLibrary to unlock real-time student fee collections, monthly dues ledger, payment receipts, and revenue analytics.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubscriptionGateAction('Access Fee Ledger');
                      setIsSubscriptionRequiredModalOpen(true);
                    }}
                    className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade Plan to Unlock Fee Ledger</span>
                  </button>
                </div>
              </div>
            ) : (
              <TransactionsView
                transactions={activeLibrary.feeTransactions || []}
                libraryName={activeLibrary.name}
                libraryPhone={activeLibrary.contactPhone}
                onViewReceipt={(tx) => setSelectedReceiptTx(tx)}
                onOpenCollectFee={() => {
                  requireSubscription('Collect Fees', () => {
                    setStudentForFeeCollection(null);
                    setIsCollectFeeModalOpen(true);
                  });
                }}
                onStudentClick={(studentId) => {
                  const std = activeLibrary.students.find((s) => s.id === studentId);
                  if (std) {
                    setProfileInitialTab('feeHistory');
                    setSelectedStudentForProfile(std);
                  }
                }}
              />
            )}
          </section>
        )}

        {/* Tab 5: More / Settings / Library Info */}
        {activeTab === 'more' && activeLibrary && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#f5f5f5]">Branch & SaaS Subscription</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">Manage branch details, plan, and notifications</p>
              </div>
            </div>

            {/* Branch Details Card */}
            <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] p-4 shadow-xs space-y-3 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-[#f5f5f5] truncate">{activeLibrary.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Phone className="w-3 h-3 text-slate-400 dark:text-neutral-500 shrink-0" />
                      <span>{activeLibrary.contactPhone}</span>
                      {activeLibrary.address && (
                        <>
                          <span>•</span>
                          <MapPin className="w-3 h-3 text-slate-400 dark:text-neutral-500 shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-xs">{activeLibrary.address}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditLibraryModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                    title="Edit library name and contact number"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>

                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                    hasActiveSubscription
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                  }`}>
                    {activeLibrary.subscription?.planName || (hasActiveSubscription ? 'Active SaaS Plan' : 'Free Starter (Design Only)')}
                  </span>
                </div>
              </div>
            </div>

            <SubscriptionCard
              libraryId={activeLibrary.id}
              currentPlanName={activeLibrary.subscription?.planName || (hasActiveSubscription ? 'Active SaaS Plan' : 'Free Starter Plan (Design Only)')}
              status={hasActiveSubscription ? 'ACTIVE' : 'NO SUBSCRIPTION'}
              validUntil={activeLibrary.subscription ? `${new Date(activeLibrary.subscription.endDate).toLocaleDateString('en-IN')}` : 'Free Forever (Design Only)'}
              daysRemaining={activeLibrary.subscription?.daysRemaining}
              isSuperAdmin={isSuperAdmin}
              userEmail={currentUser?.email}
              onSubscriptionUpdated={() => {
                if (currentUser?.email) {
                  loadUserLibrariesFromDb(currentUser.email, libraries);
                }
              }}
            />

            {/* PWA Offline & Push Notification Hub */}
            <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#262626] p-4 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-[#f5f5f5]">Mobile Push & Offline PWA</h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">Service Worker caching & instant push alerts</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#1c1c1e] rounded-xl border border-slate-100 dark:border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-neutral-200">Direct Push Notifications</p>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Allow/disallow background push alerts, test service worker push, and view student expiry alerts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationCenterOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all self-start sm:self-auto flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notification Center</span>
                </button>
              </div>
            </div>

            {/* Sign Out Card */}
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Sign Out of Account</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/80">Currently signed in as {currentUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleUserLogout}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* User Login & Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={handleUserLogin}
          onLogout={handleUserLogout}
        />
      )}

      {/* Create / Switch Library Branch Modal */}
      {isLibraryModalOpen && (
        <CreateLibraryModal
          isOpen={isLibraryModalOpen}
          onClose={() => setIsLibraryModalOpen(false)}
          onCreated={handleCreateLibrary}
        />
      )}

      {/* Edit Library Details Modal */}
      {isEditLibraryModalOpen && activeLibrary && (
        <EditLibraryModal
          isOpen={isEditLibraryModalOpen}
          onClose={() => setIsEditLibraryModalOpen(false)}
          library={activeLibrary}
          onSave={handleEditLibrary}
        />
      )}

      {/* Room & Row Configuration Modal */}
      {isRoomModalOpen && (
        <RoomRowModal
          isOpen={isRoomModalOpen}
          onClose={() => setIsRoomModalOpen(false)}
          onCreated={handleRoomCreated}
        />
      )}

      {/* Edit Room Name Modal */}
      {editingRoom && (
        <EditRoomModal
          isOpen={!!editingRoom}
          currentRoom={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSave={handleSaveRoomName}
        />
      )}

      {/* Add Row & Seats to Current Room Modal */}
      {isAddRowModalOpen && (
        <AddRowModal
          isOpen={isAddRowModalOpen}
          onClose={() => setIsAddRowModalOpen(false)}
          roomName={currentSelectedRoom?.name || 'Current Room'}
          existingRows={currentSelectedRoom?.rows || []}
          existingSeats={currentRoomSeats}
          onAddRows={handleAddRowsToRoom}
        />
      )}

      {/* 3-Step Student Registration Wizard */}
      {isStudentModalOpen && (
        <StudentModal
          isOpen={isStudentModalOpen}
          onClose={() => {
            setIsStudentModalOpen(false);
            setPreselectedSeatNumberForNewStudent(null);
          }}
          availableSeats={seats.filter((s) => s.status === 'AVAILABLE')}
          preselectedSeatNumber={preselectedSeatNumberForNewStudent}
          onStudentCreated={handleStudentCreated}
        />
      )}

      {/* Student Profile Modal with Direct Seat Allocation, Editing & Deleting */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          isOpen={!!selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          student={selectedStudentForProfile}
          initialTab={profileInitialTab}
          availableSeats={seats.filter((s) => s.status === 'AVAILABLE')}
          onAssignSeat={handleAssignSeat}
          onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={handleDeleteStudent}
          libraryName={activeLibrary?.name || 'seeLibrary Study Center'}
          libraryPhone={activeLibrary?.contactPhone}
          onViewReceipt={(tx) => setSelectedReceiptTx(tx)}
          onCollectFee={(std) => {
            requireSubscription('Collect Fees', () => {
              setReturnToStudentProfileId(std.id);
              setSelectedStudentForProfile(null);
              setStudentForFeeCollection(std);
              setIsCollectFeeModalOpen(true);
            });
          }}
        />
      )}

      {/* Collect / Record Fee Payment Modal */}
      {isCollectFeeModalOpen && (
        <CollectFeeModal
          isOpen={isCollectFeeModalOpen}
          libraryName={activeLibrary?.name || 'seeLibrary Study Center'}
          libraryPhone={activeLibrary?.contactPhone}
          onClose={() => {
            setIsCollectFeeModalOpen(false);
            setStudentForFeeCollection(null);
            setPreselectedSeatNumberForFeeCollection(null);
            if (returnToStudentProfileId) {
              const targetId = returnToStudentProfileId;
              setReturnToStudentProfileId(null);
              setProfileInitialTab('feeHistory');
              updateActiveLibrary((currentLib) => {
                const refreshedStd = currentLib.students.find((s) => s.id === targetId);
                if (refreshedStd) {
                  setSelectedStudentForProfile(refreshedStd);
                }
                return currentLib;
              });
            }
          }}
          students={activeLibrary?.students || []}
          preselectedStudent={studentForFeeCollection}
          preselectedSeatNumber={preselectedSeatNumberForFeeCollection}
          availableSeats={seats.filter((s) => s.status === 'AVAILABLE')}
          onAssignSeat={handleAssignSeat}
          onRecordPayment={handleRecordFeePayment}
        />
      )}

      {/* Official Digital Fee Receipt Modal */}
      {selectedReceiptTx && (
        <FeeReceiptModal
          isOpen={!!selectedReceiptTx}
          onClose={() => setSelectedReceiptTx(null)}
          transaction={selectedReceiptTx}
          libraryName={activeLibrary?.name || 'seeLibrary Study Center'}
          libraryAddress={activeLibrary?.address}
          libraryPhone={activeLibrary?.contactPhone}
        />
      )}

      {/* Direct Assign Seat to Student Modal */}
      {selectedSeatForAssignment && (
        <AssignSeatModal
          isOpen={!!selectedSeatForAssignment}
          onClose={() => {
            setSelectedSeatForAssignment(null);
            setPreselectedShiftForAssignment(undefined);
          }}
          seat={selectedSeatForAssignment}
          students={students}
          initialShift={preselectedShiftForAssignment}
          onAssign={async (studentId, seatNumber, shift, isReserved) => {
            await handleAssignSeat(studentId, seatNumber, shift, isReserved);
          }}
          onEnrollNewStudent={(seatNumber) => {
            requireSubscription('Enroll Students', () => {
              setPreselectedSeatNumberForNewStudent(seatNumber);
              setIsStudentModalOpen(true);
            });
          }}
          onEnrollAndCollectFee={(student, seatNumber) => {
            setSelectedSeatForAssignment(null);
            setStudentForFeeCollection(student);
            setPreselectedSeatNumberForFeeCollection(seatNumber);
            setIsCollectFeeModalOpen(true);
          }}
        />
      )}

      {/* Subscription Required Upgrade Modal */}
      {isSubscriptionRequiredModalOpen && (
        <SubscriptionRequiredModal
          isOpen={isSubscriptionRequiredModalOpen}
          onClose={() => setIsSubscriptionRequiredModalOpen(false)}
          onUpgradeClick={() => {
            setActiveTab('more');
          }}
          actionTitle={subscriptionGateAction}
        />
      )}

      {/* PWA Service Worker Notification Center Modal */}
      {isNotificationCenterOpen && (
        <NotificationCenterModal
          isOpen={isNotificationCenterOpen}
          onClose={() => {
            setIsNotificationCenterOpen(false);
            fetchUnreadNotifications();
          }}
          userEmail={currentUser?.email}
          libraryId={activeLibrary?.id}
          libraryName={activeLibrary?.name}
          onSelectStudent={(studentId) => {
            const std = activeLibrary?.students.find((s) => s.id === studentId);
            if (std) {
              setProfileInitialTab('feeHistory');
              setSelectedStudentForProfile(std);
            }
          }}
        />
      )}

      {/* Mobile Bottom Navigation Bar (Thumb-Friendly, Fixed at bottom, hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-slate-200 dark:border-[#262626] px-1 sm:px-2 py-1.5 flex justify-around items-center shadow-lg transition-colors w-full max-w-full overflow-x-hidden">
        {[
          { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'seats', label: 'Seats', icon: Armchair },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'transactions', label: 'Fee History', icon: IndianRupee },
          { id: 'more', label: 'More', icon: MoreHorizontal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-neutral-400 font-normal hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem('seelibrary_view_mode');
              } catch {}
              router.push('/admin');
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-amber-600 dark:text-amber-400 font-bold hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5 stroke-[2.2px] text-amber-500 dark:text-amber-400" />
            <span className="text-[10px] mt-0.5">Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
}
