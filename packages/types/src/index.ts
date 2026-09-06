// ==========================================
// User & Multi-Tenancy Enums & Types
// ==========================================
export const LIBRARY_TYPES_VERSION = '1.0.0';

export type UserGlobalRole = 'USER' | 'SUPER_ADMIN';

export type LibraryMemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  role: UserGlobalRole;
  isActive: boolean;
  createdAt: string;
}

export interface LibrarySummary {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  contactPhone: string;
  contactEmail?: string | null;
  role: LibraryMemberRole;
  isActive: boolean;
}

export interface TenantContext {
  userId: string;
  libraryId: string;
  role: LibraryMemberRole;
  isSuperAdmin?: boolean;
}

// ==========================================
// Spaces: Room, Row, Seat
// ==========================================
export type SeatStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';

export interface RoomDTO {
  id: string;
  libraryId: string;
  name: string;
  floor?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface RowDTO {
  id: string;
  libraryId: string;
  roomId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SeatDTO {
  id: string;
  libraryId: string;
  rowId: string;
  seatNumber: string;
  status: SeatStatus;
  sortOrder: number;
  isActive: boolean;
}

export interface SeatVisualItem extends SeatDTO {
  rowName: string;
  roomName: string;
  currentStudent?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    shift: ShiftType;
    membershipEndsAt: string;
  } | null;
}

// ==========================================
// Students & Memberships
// ==========================================
export type KycDocType = 'AADHAAR' | 'PASSPORT' | 'VOTER_ID' | 'OTHER';

export type MembershipStatus = 'UPCOMING' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';

export type ShiftType = 'MORNING' | 'EVENING' | 'NIGHT' | 'FULL_DAY' | 'FOUR_HOURS' | 'HALF_DAY';

export interface StudentDTO {
  id: string;
  libraryId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  address?: string | null;
  studyPurpose?: string | null;
  photoUrl?: string | null;
  kycDocId?: string | null;
  kycDocType: KycDocType;
  isActive: boolean;
  createdAt: string;
}

export interface MembershipDTO {
  id: string;
  libraryId: string;
  studentId: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string | null;
  status: MembershipStatus;
  feeAmount: number;
  shift: ShiftType;
  notes?: string | null;
  createdAt: string;
}

export interface MembershipPauseDTO {
  id: string;
  libraryId: string;
  membershipId: string;
  pauseStartDate: string;
  expectedResumeDate?: string | null;
  actualResumeDate?: string | null;
  reason: string;
  extendedMembershipDuration: boolean;
}

export interface SeatAssignmentDTO {
  id: string;
  libraryId: string;
  seatId: string;
  studentId: string;
  membershipId: string;
  shift: ShiftType;
  startDate: string;
  endDate?: string | null;
  status: 'ACTIVE' | 'RELEASED' | 'TRANSFERRED';
}

// ==========================================
// Attendance
// ==========================================
export type AttendanceSource = 'MANUAL' | 'QR' | 'RFID' | 'DEVICE';

export interface AttendanceLogDTO {
  id: string;
  libraryId: string;
  studentId: string;
  seatId?: string | null;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime?: string | null;
  source: AttendanceSource;
  sourceDeviceId?: string | null;
}

export interface DailyAttendanceItem {
  studentId: string;
  studentName: string;
  studentPhone: string;
  seatNumber?: string | null;
  photoUrl?: string | null;
  shift: ShiftType;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  isPresent: boolean;
}

// ==========================================
// Subscriptions, Payments & Coupons
// ==========================================
export type SubscriptionTier = 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'MANUAL';

export type PaymentGatewayProvider = 'RAZORPAY' | 'CASHFREE' | 'MANUAL_ADMIN';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface SubscriptionPlanDTO {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxSeats: number;
  maxLibraries: number;
  features: Record<string, unknown>;
  isActive: boolean;
}

export interface SubscriptionDTO {
  id: string;
  libraryId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  provider: PaymentGatewayProvider;
  providerSubscriptionId?: string | null;
  adminNotes?: string | null;
}

export interface PaymentDTO {
  id: string;
  libraryId: string;
  subscriptionId?: string | null;
  provider: PaymentGatewayProvider;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface CouponDTO {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxRedemptions?: number | null;
  perUserLimit?: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

// ==========================================
// Dashboard Metrics
// ==========================================
export interface OwnerDashboardMetrics {
  totalActiveStudents: number;
  todayAttendanceCount: number;
  totalSeats: number;
  availableSeats: number;
  occupiedSeats: number;
  membershipsEndingSoonCount: number;
  expiredMembershipsCount: number;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    details: string;
  }>;
}

// ==========================================
// API Response Envelope
// ==========================================
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}
