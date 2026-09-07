import { z } from 'zod';

// ==========================================
// Auth Schemas
// ==========================================
export const RequestOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID Token is required'),
});

// ==========================================
// Library / Tenant Schemas
// ==========================================
export const CreateLibrarySchema = z.object({
  name: z.string().min(2, 'Library name must be at least 2 characters').max(100),
  address: z.string().optional(),
  contactPhone: z.string().min(10, 'Valid phone number required').max(15),
  contactEmail: z.string().email().optional().or(z.literal('')),
});

export const UpdateLibrarySchema = CreateLibrarySchema.partial();

// ==========================================
// Space Schemas (Room, Row, Seat)
// ==========================================
export const CreateRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(64),
  floor: z.string().max(32).optional(),
  sortOrder: z.number().int().default(0),
});

export const CreateRowSchema = z.object({
  roomId: z.string().uuid('Valid Room ID required'),
  name: z.string().min(1, 'Row name is required').max(64),
  sortOrder: z.number().int().default(0),
});

export const BatchGenerateSeatsSchema = z.object({
  rowId: z.string().uuid('Valid Row ID required'),
  prefix: z.string().default(''),
  startNumber: z.number().int().min(1).default(1),
  count: z.number().int().min(1).max(200, 'Cannot generate more than 200 seats at once'),
});

export const UpdateSeatStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']),
});

// ==========================================
// Student Schemas
// ==========================================
export const CreateStudentSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  phone: z.string().min(10, 'Valid 10-digit mobile number required').max(15),
  email: z.string().email().optional().or(z.literal('')),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  address: z.string().optional(),
  studyPurpose: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  kycDocId: z.string().optional(),
  kycDocType: z.enum(['AADHAAR', 'PASSPORT', 'VOTER_ID', 'OTHER']).default('AADHAAR'),
  initialMembership: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
    expectedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
    feeAmount: z.number().positive('Fee amount must be positive'),
    shift: z.enum(['MORNING', 'EVENING', 'NIGHT', 'FULL_DAY']).default('FULL_DAY'),
    seatId: z.string().uuid().optional(),
  }).optional(),
});

export const UpdateStudentSchema = CreateStudentSchema.partial().omit({ initialMembership: true });

// ==========================================
// Membership & Pause Schemas
// ==========================================
export const CreateMembershipSchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feeAmount: z.number().positive(),
  shift: z.enum(['MORNING', 'EVENING', 'NIGHT', 'FULL_DAY']).default('FULL_DAY'),
  seatId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const PauseMembershipSchema = z.object({
  pauseStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedResumeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().min(3, 'Pause reason must be provided'),
  extendedMembershipDuration: z.boolean().default(true),
});

export const ResumeMembershipSchema = z.object({
  actualResumeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extendEndDate: z.boolean().default(true),
});

// ==========================================
// Seat Assignment Schemas
// ==========================================
export const AssignSeatSchema = z.object({
  studentId: z.string().uuid(),
  seatId: z.string().uuid(),
  membershipId: z.string().uuid(),
  shift: z.enum(['MORNING', 'EVENING', 'NIGHT', 'FULL_DAY']).default('FULL_DAY'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const RelocateSeatSchema = z.object({
  currentSeatAssignmentId: z.string().uuid(),
  newSeatId: z.string().uuid(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});



// ==========================================
// Subscription, Payment & Coupon Schemas
// ==========================================
export const CreatePaymentOrderSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  couponCode: z.string().optional(),
  provider: z.enum(['RAZORPAY', 'CASHFREE']),
});

export const ValidateCouponSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code required'),
  orderAmount: z.number().positive(),
});

export const AdminManualGrantSubscriptionSchema = z.object({
  libraryId: z.string().uuid(),
  planId: z.string().min(1, 'Plan ID is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(3, 'Reason for manual grant is required'),
});

export const CreateCouponSchema = z.object({
  code: z.string().min(3).max(32).transform((v) => v.toUpperCase()),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().positive().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  validFrom: z.string().datetime().default(() => new Date().toISOString()),
  validUntil: z.string().datetime(),
});

// Export inferred types
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type CreateLibraryInput = z.infer<typeof CreateLibrarySchema>;
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type CreateMembershipInput = z.infer<typeof CreateMembershipSchema>;
export type PauseMembershipInput = z.infer<typeof PauseMembershipSchema>;
export type AssignSeatInput = z.infer<typeof AssignSeatSchema>;
