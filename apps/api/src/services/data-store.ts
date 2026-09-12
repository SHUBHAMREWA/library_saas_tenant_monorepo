import { randomUUID } from 'crypto';
import {
  UserGlobalRole,
  LibraryMemberRole,
  SeatStatus,
  RoomDTO,
  RowDTO,
  SeatDTO,
  UserProfile,
  LibrarySummary,
} from '@library/types';

export interface StoredUser {
  id: string;
  email: string;
  phone?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  role: UserGlobalRole;
  isActive: boolean;
  createdAt: string;
}

export interface StoredLibrary {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  address?: string | null;
  contactPhone: string;
  contactEmail?: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface StoredLibraryMember {
  id: string;
  libraryId: string;
  userId: string;
  role: LibraryMemberRole;
  isActive: boolean;
  createdAt: string;
}

export interface StoredRoom {
  id: string;
  libraryId: string;
  name: string;
  floor?: string | null;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface StoredRow {
  id: string;
  libraryId: string;
  roomId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface StoredSeat {
  id: string;
  libraryId: string;
  rowId: string;
  seatNumber: string;
  status: SeatStatus;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface StoredAuditLog {
  id: string;
  libraryId?: string | null;
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  diffPayload?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface StoredStudent {
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
  kycDocType: string;
  kycPhotoUrl?: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMembership {
  id: string;
  libraryId: string;
  studentId: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string | null;
  status: string; // UPCOMING, ACTIVE, PAUSED, EXPIRED, CANCELLED
  feeAmount: number;
  shift: string; // MORNING, EVENING, NIGHT, FULL_DAY
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMembershipPause {
  id: string;
  libraryId: string;
  membershipId: string;
  pauseStartDate: string;
  expectedResumeDate?: string | null;
  actualResumeDate?: string | null;
  reason: string;
  extendedMembershipDuration: boolean;
  createdAt: string;
}

export interface StoredSeatAssignment {
  id: string;
  libraryId: string;
  seatId: string;
  studentId: string;
  membershipId: string;
  shift: string;
  startDate: string;
  endDate?: string | null;
  status: 'ACTIVE' | 'RELEASED' | 'TRANSFERRED';
  createdAt: string;
}

export interface StoredSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxSeats: number;
  maxLibraries: number;
  features: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface StoredSubscription {
  id: string;
  libraryId: string;
  planId: string;
  userId: string;
  status: string; // TRIAL, ACTIVE, PAST_DUE, EXPIRED, CANCELLED, MANUAL
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  provider: string; // RAZORPAY, CASHFREE, MANUAL_ADMIN
  providerSubscriptionId?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredPayment {
  id: string;
  libraryId: string;
  subscriptionId?: string | null;
  provider: string;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  amount: number;
  currency: string;
  status: string; // PENDING, SUCCESS, FAILED, REFUNDED
  idempotencyKey: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface StoredWebhookEvent {
  id: string;
  provider: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface StoredCoupon {
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
  createdAt: string;
}

export interface StoredCouponUsage {
  id: string;
  couponId: string;
  userId: string;
  paymentId?: string | null;
  discountApplied: number;
  createdAt: string;
}

class MemoryDataStore {
  public users = new Map<string, StoredUser>();
  public libraries = new Map<string, StoredLibrary>();
  public libraryMembers = new Map<string, StoredLibraryMember>();
  public rooms = new Map<string, StoredRoom>();
  public rows = new Map<string, StoredRow>();
  public seats = new Map<string, StoredSeat>();
  public students = new Map<string, StoredStudent>();
  public memberships = new Map<string, StoredMembership>();
  public membershipPauses = new Map<string, StoredMembershipPause>();
  public seatAssignments = new Map<string, StoredSeatAssignment>();
  public subscriptionPlans = new Map<string, StoredSubscriptionPlan>();
  public subscriptions = new Map<string, StoredSubscription>();
  public payments = new Map<string, StoredPayment>();
  public webhookEvents = new Map<string, StoredWebhookEvent>();
  public coupons = new Map<string, StoredCoupon>();
  public couponUsages: StoredCouponUsage[] = [];
  public auditLogs: StoredAuditLog[] = [];

  // OTP Storage: email -> { hash, expiresAt, attempts, requestedAt }
  public otpStore = new Map<
    string,
    {
      codeHash: string;
      expiresAt: number;
      attempts: number;
      requestCount: number;
      windowStart: number;
    }
  >();

  // ===================== User Ops =====================
  findUserByEmail(email: string): StoredUser | undefined {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) return user;
    }
    return undefined;
  }

  findUserById(id: string): StoredUser | undefined {
    return this.users.get(id);
  }

  createUser(data: { email: string; fullName: string; phone?: string | null; avatarUrl?: string | null; role?: UserGlobalRole }): StoredUser {
    const id = randomUUID();
    const user: StoredUser = {
      id,
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName,
      phone: data.phone || null,
      avatarUrl: data.avatarUrl || null,
      role: data.role || 'USER',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  bootstrapAdmin(data?: { email?: string; fullName?: string; phone?: string }): StoredUser {
    const adminEmails = [
      'shubhamrewamp17@gmail.com',
      'kushwahashubham5932@gmail.com',
      ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map((e: string) => e.trim().toLowerCase()) : []),
      ...(data?.email ? [data.email.trim().toLowerCase()] : []),
    ];

    const uniqueEmails = Array.from(new Set(adminEmails.filter(Boolean)));
    let primaryAdmin: StoredUser | null = null;

    for (const email of uniqueEmails) {
      let user = this.findUserByEmail(email);
      const fullName = email === 'shubhamrewamp17@gmail.com' ? 'Shubham Rewa' : (data?.fullName || process.env.ADMIN_NAME || 'Platform Super Admin');
      const phone = data?.phone || process.env.ADMIN_PHONE || '+919876543210';

      if (!user) {
        user = this.createUser({
          email,
          fullName,
          phone,
          role: 'SUPER_ADMIN',
        });
        console.log(`[DataStore] Automatically bootstrapped Super Admin: ${user.email} (${user.id})`);
      } else if (user.role !== 'SUPER_ADMIN') {
        user.role = 'SUPER_ADMIN';
        console.log(`[DataStore] Elevated user to Super Admin: ${user.email}`);
      }

      if (!primaryAdmin) {
        primaryAdmin = user;
      }
    }

    return primaryAdmin || this.findUserByEmail('shubhamrewamp17@gmail.com')!;
  }

  // ===================== Library Ops =====================
  createLibrary(ownerId: string, data: { name: string; contactPhone: string; address?: string; contactEmail?: string }): StoredLibrary {
    const id = randomUUID();
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 6)}`;
    const library: StoredLibrary = {
      id,
      ownerId,
      name: data.name,
      slug,
      address: data.address || null,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.libraries.set(id, library);

    // Automatically add owner to library_members
    const memberId = randomUUID();
    this.libraryMembers.set(memberId, {
      id: memberId,
      libraryId: id,
      userId: ownerId,
      role: 'OWNER',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    return library;
  }

  findLibraryById(libraryId: string): StoredLibrary | undefined {
    const lib = this.libraries.get(libraryId);
    if (!lib || lib.deletedAt) return undefined;
    return lib;
  }

  listUserLibraries(userId: string): LibrarySummary[] {
    const results: LibrarySummary[] = [];
    for (const member of this.libraryMembers.values()) {
      if (member.userId === userId && member.isActive) {
        const lib = this.libraries.get(member.libraryId);
        if (lib && !lib.deletedAt) {
          results.push({
            id: lib.id,
            name: lib.name,
            slug: lib.slug,
            address: lib.address,
            contactPhone: lib.contactPhone,
            contactEmail: lib.contactEmail,
            role: member.role,
            isActive: lib.isActive,
          });
        }
      }
    }
    return results;
  }

  getLibraryMember(libraryId: string, userId: string): StoredLibraryMember | undefined {
    for (const member of this.libraryMembers.values()) {
      if (member.libraryId === libraryId && member.userId === userId && member.isActive) {
        return member;
      }
    }
    return undefined;
  }

  updateLibrary(libraryId: string, data: Partial<StoredLibrary>): StoredLibrary | undefined {
    const lib = this.libraries.get(libraryId);
    if (!lib || lib.deletedAt) return undefined;
    Object.assign(lib, data);
    return lib;
  }

  deleteLibrary(libraryId: string): boolean {
    if (!this.libraries.has(libraryId)) return false;
    this.libraries.delete(libraryId);

    // Clean up all related rooms, rows, seats, students, memberships, seat assignments, etc.
    Array.from(this.libraryMembers.entries()).forEach(([id, m]) => {
      if (m.libraryId === libraryId) this.libraryMembers.delete(id);
    });
    Array.from(this.rooms.entries()).forEach(([id, r]) => {
      if (r.libraryId === libraryId) this.rooms.delete(id);
    });
    Array.from(this.rows.entries()).forEach(([id, r]) => {
      if (r.libraryId === libraryId) this.rows.delete(id);
    });
    Array.from(this.seats.entries()).forEach(([id, s]) => {
      if (s.libraryId === libraryId) this.seats.delete(id);
    });
    Array.from(this.students.entries()).forEach(([id, s]) => {
      if (s.libraryId === libraryId) this.students.delete(id);
    });
    Array.from(this.memberships.entries()).forEach(([id, m]) => {
      if (m.libraryId === libraryId) this.memberships.delete(id);
    });
    Array.from(this.seatAssignments.entries()).forEach(([id, sa]) => {
      if (sa.libraryId === libraryId) this.seatAssignments.delete(id);
    });
    Array.from(this.subscriptions.entries()).forEach(([id, sub]) => {
      if (sub.libraryId === libraryId) this.subscriptions.delete(id);
    });
    Array.from(this.payments.entries()).forEach(([id, p]) => {
      if (p.libraryId === libraryId) this.payments.delete(id);
    });

    return true;
  }

  // ===================== Space Ops =====================
  createRoom(libraryId: string, data: { name: string; floor?: string; sortOrder?: number }): StoredRoom {
    const id = randomUUID();
    const room: StoredRoom = {
      id,
      libraryId,
      name: data.name,
      floor: data.floor || null,
      sortOrder: data.sortOrder || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.rooms.set(id, room);
    return room;
  }

  listRooms(libraryId: string): StoredRoom[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.libraryId === libraryId && !r.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  findRoomById(libraryId: string, roomId: string): StoredRoom | undefined {
    const r = this.rooms.get(roomId);
    if (!r || r.libraryId !== libraryId || r.deletedAt) return undefined;
    return r;
  }

  deleteRoom(libraryId: string, roomId: string): boolean {
    const r = this.findRoomById(libraryId, roomId);
    if (!r) return false;
    r.deletedAt = new Date().toISOString();
    return true;
  }

  createRow(libraryId: string, roomId: string, data: { name: string; sortOrder?: number }): StoredRow {
    const id = randomUUID();
    const row: StoredRow = {
      id,
      libraryId,
      roomId,
      name: data.name,
      sortOrder: data.sortOrder || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.rows.set(id, row);
    return row;
  }

  listRows(libraryId: string, roomId?: string): StoredRow[] {
    return Array.from(this.rows.values())
      .filter((r) => r.libraryId === libraryId && (!roomId || r.roomId === roomId) && !r.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  findRowById(libraryId: string, rowId: string): StoredRow | undefined {
    const r = this.rows.get(rowId);
    if (!r || r.libraryId !== libraryId || r.deletedAt) return undefined;
    return r;
  }

  deleteRow(libraryId: string, rowId: string): boolean {
    const r = this.findRowById(libraryId, rowId);
    if (!r) return false;
    r.deletedAt = new Date().toISOString();
    return true;
  }

  batchGenerateSeats(
    libraryId: string,
    rowId: string,
    prefix: string,
    startNumber: number,
    count: number
  ): StoredSeat[] {
    const generated: StoredSeat[] = [];
    for (let i = 0; i < count; i++) {
      const num = startNumber + i;
      const padded = num < 10 ? `0${num}` : `${num}`;
      const seatNumber = prefix ? `${prefix}${padded}` : `${padded}`;

      // Check if seat number already exists in this row
      const existing = Array.from(this.seats.values()).find(
        (s) => s.libraryId === libraryId && s.rowId === rowId && s.seatNumber === seatNumber && !s.deletedAt
      );
      if (existing) continue;

      const id = randomUUID();
      const seat: StoredSeat = {
        id,
        libraryId,
        rowId,
        seatNumber,
        status: 'AVAILABLE',
        sortOrder: num,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      this.seats.set(id, seat);
      generated.push(seat);
    }
    return generated;
  }

  listSeats(libraryId: string, filters?: { roomId?: string; rowId?: string; status?: SeatStatus }): StoredSeat[] {
    let result = Array.from(this.seats.values()).filter((s) => s.libraryId === libraryId && !s.deletedAt);

    if (filters?.rowId) {
      result = result.filter((s) => s.rowId === filters.rowId);
    }
    if (filters?.roomId) {
      const rowIds = new Set(this.listRows(libraryId, filters.roomId).map((r) => r.id));
      result = result.filter((s) => rowIds.has(s.rowId));
    }
    if (filters?.status) {
      result = result.filter((s) => s.status === filters.status);
    }

    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  findSeatById(libraryId: string, seatId: string): StoredSeat | undefined {
    const s = this.seats.get(seatId);
    if (!s || s.libraryId !== libraryId || s.deletedAt) return undefined;
    return s;
  }

  updateSeatStatus(libraryId: string, seatId: string, status: SeatStatus): StoredSeat | undefined {
    const seat = this.findSeatById(libraryId, seatId);
    if (!seat) return undefined;
    seat.status = status;
    return seat;
  }

  // ===================== Student Ops =====================
  createStudent(
    libraryId: string,
    data: {
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
    }
  ): StoredStudent {
    const id = randomUUID();
    const now = new Date().toISOString();
    const student: StoredStudent = {
      id,
      libraryId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      fatherName: data.fatherName || null,
      motherName: data.motherName || null,
      address: data.address || null,
      studyPurpose: data.studyPurpose || null,
      photoUrl: data.photoUrl || null,
      kycDocId: data.kycDocId || null,
      kycDocType: data.kycDocType || 'AADHAAR',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.students.set(id, student);
    return student;
  }

  findStudentById(libraryId: string, studentId: string): StoredStudent | undefined {
    const s = this.students.get(studentId);
    if (!s || s.libraryId !== libraryId || s.deletedAt) return undefined;
    return s;
  }

  findStudentByPhone(libraryId: string, phone: string): StoredStudent | undefined {
    for (const s of this.students.values()) {
      if (s.libraryId === libraryId && s.phone === phone && !s.deletedAt) {
        return s;
      }
    }
    return undefined;
  }

  listStudents(
    libraryId: string,
    filters?: { search?: string; isActive?: boolean }
  ): StoredStudent[] {
    let list = Array.from(this.students.values()).filter(
      (s) => s.libraryId === libraryId && !s.deletedAt
    );

    if (filters?.isActive !== undefined) {
      list = list.filter((s) => s.isActive === filters.isActive);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateStudent(
    libraryId: string,
    studentId: string,
    data: Partial<StoredStudent>
  ): StoredStudent | undefined {
    const s = this.findStudentById(libraryId, studentId);
    if (!s) return undefined;
    Object.assign(s, data, { updatedAt: new Date().toISOString() });
    return s;
  }

  deleteStudent(libraryId: string, studentId: string): boolean {
    const s = this.findStudentById(libraryId, studentId);
    if (!s) return false;
    s.deletedAt = new Date().toISOString();
    s.isActive = false;

    // Release any active seat assignment
    for (const sa of this.seatAssignments.values()) {
      if (sa.libraryId === libraryId && sa.studentId === studentId && sa.status === 'ACTIVE') {
        sa.status = 'RELEASED';
        sa.endDate = new Date().toISOString().split('T')[0];
        // Free the seat
        const seat = this.seats.get(sa.seatId);
        if (seat) seat.status = 'AVAILABLE';
      }
    }
    return true;
  }

  // ===================== Membership Ops =====================
  createMembership(
    libraryId: string,
    data: {
      studentId: string;
      startDate: string;
      expectedEndDate: string;
      feeAmount: number;
      shift: string;
      notes?: string;
    }
  ): StoredMembership {
    const id = randomUUID();
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const status = data.startDate > today ? 'UPCOMING' : 'ACTIVE';

    const membership: StoredMembership = {
      id,
      libraryId,
      studentId: data.studentId,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate,
      actualEndDate: null,
      status,
      feeAmount: data.feeAmount,
      shift: data.shift,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    };
    this.memberships.set(id, membership);
    return membership;
  }

  findMembershipById(libraryId: string, membershipId: string): StoredMembership | undefined {
    const m = this.memberships.get(membershipId);
    if (!m || m.libraryId !== libraryId) return undefined;
    return m;
  }

  findStudentActiveMembership(libraryId: string, studentId: string): StoredMembership | undefined {
    for (const m of this.memberships.values()) {
      if (
        m.libraryId === libraryId &&
        m.studentId === studentId &&
        (m.status === 'ACTIVE' || m.status === 'PAUSED' || m.status === 'UPCOMING')
      ) {
        return m;
      }
    }
    return undefined;
  }

  updateMembership(
    libraryId: string,
    membershipId: string,
    data: Partial<StoredMembership>
  ): StoredMembership | undefined {
    const m = this.findMembershipById(libraryId, membershipId);
    if (!m) return undefined;
    Object.assign(m, data, { updatedAt: new Date().toISOString() });
    return m;
  }

  listExpiringMemberships(libraryId: string, daysAhead: number): StoredMembership[] {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const targetStr = targetDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    return Array.from(this.memberships.values()).filter(
      (m) =>
        m.libraryId === libraryId &&
        m.status === 'ACTIVE' &&
        m.expectedEndDate >= todayStr &&
        m.expectedEndDate <= targetStr
    );
  }

  // ===================== Membership Pause Ops =====================
  createMembershipPause(
    libraryId: string,
    data: {
      membershipId: string;
      pauseStartDate: string;
      expectedResumeDate?: string;
      reason: string;
      extendedMembershipDuration: boolean;
    }
  ): StoredMembershipPause {
    const id = randomUUID();
    const pause: StoredMembershipPause = {
      id,
      libraryId,
      membershipId: data.membershipId,
      pauseStartDate: data.pauseStartDate,
      expectedResumeDate: data.expectedResumeDate || null,
      actualResumeDate: null,
      reason: data.reason,
      extendedMembershipDuration: data.extendedMembershipDuration,
      createdAt: new Date().toISOString(),
    };
    this.membershipPauses.set(id, pause);
    return pause;
  }

  findActivePause(membershipId: string): StoredMembershipPause | undefined {
    for (const p of this.membershipPauses.values()) {
      if (p.membershipId === membershipId && !p.actualResumeDate) {
        return p;
      }
    }
    return undefined;
  }

  // ===================== Seat Assignment Ops =====================
  createSeatAssignment(
    libraryId: string,
    data: {
      seatId: string;
      studentId: string;
      membershipId: string;
      shift: string;
      startDate: string;
    }
  ): StoredSeatAssignment {
    const id = randomUUID();
    const assignment: StoredSeatAssignment = {
      id,
      libraryId,
      seatId: data.seatId,
      studentId: data.studentId,
      membershipId: data.membershipId,
      shift: data.shift,
      startDate: data.startDate,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.seatAssignments.set(id, assignment);

    // Update physical seat status
    const seat = this.seats.get(data.seatId);
    if (seat) seat.status = 'OCCUPIED';

    return assignment;
  }

  findActiveSeatAssignment(seatId: string, shift: string): StoredSeatAssignment | undefined {
    for (const sa of this.seatAssignments.values()) {
      if (sa.seatId === seatId && sa.status === 'ACTIVE') {
        // Full day clashes with everything; matching shifts clash
        if (sa.shift === 'FULL_DAY' || shift === 'FULL_DAY' || sa.shift === shift) {
          return sa;
        }
      }
    }
    return undefined;
  }

  findStudentActiveSeatAssignment(libraryId: string, studentId: string): StoredSeatAssignment | undefined {
    for (const sa of this.seatAssignments.values()) {
      if (sa.libraryId === libraryId && sa.studentId === studentId && sa.status === 'ACTIVE') {
        return sa;
      }
    }
    return undefined;
  }

  // ===================== Subscription & Plan Ops =====================
  initDefaultSubscriptionPlans(): void {
    if (this.subscriptionPlans.size > 0) return;

    const plans: StoredSubscriptionPlan[] = [
      {
        id: 'plan-trial',
        code: 'TRIAL',
        name: 'Free Trial (14 Days)',
        priceMonthly: 0,
        priceYearly: 0,
        maxSeats: 50,
        maxLibraries: 1,
        features: { trial: true },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'plan-basic',
        code: 'BASIC',
        name: 'Basic Growth',
        priceMonthly: 999,
        priceYearly: 9999,
        maxSeats: 50,
        maxLibraries: 1,
        features: { seats: 50, sms: false },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'plan-pro',
        code: 'PRO',
        name: 'Professional',
        priceMonthly: 1999,
        priceYearly: 19999,
        maxSeats: 200,
        maxLibraries: 3,
        features: { seats: 200, sms: true, prioritySupport: true },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'plan-enterprise',
        code: 'ENTERPRISE',
        name: 'Enterprise Hub',
        priceMonthly: 4999,
        priceYearly: 49999,
        maxSeats: 1000,
        maxLibraries: 10,
        features: { unlimited: true, rfidReady: true },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const p of plans) {
      this.subscriptionPlans.set(p.id, p);
    }
  }

  findPlanById(planId: string): StoredSubscriptionPlan | undefined {
    this.initDefaultSubscriptionPlans();
    return this.subscriptionPlans.get(planId) || Array.from(this.subscriptionPlans.values()).find((p) => p.code === planId);
  }

  createSubscription(
    libraryId: string,
    data: {
      planId: string;
      userId: string;
      startDate: string;
      endDate: string;
      provider: string;
      providerSubscriptionId?: string;
      status?: string;
      adminNotes?: string;
    }
  ): StoredSubscription {
    const id = randomUUID();
    const now = new Date().toISOString();
    const sub: StoredSubscription = {
      id,
      libraryId,
      planId: data.planId,
      userId: data.userId,
      status: data.status || 'ACTIVE',
      startDate: data.startDate,
      endDate: data.endDate,
      autoRenew: false,
      provider: data.provider,
      providerSubscriptionId: data.providerSubscriptionId || null,
      adminNotes: data.adminNotes || null,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(id, sub);
    return sub;
  }

  findActiveLibrarySubscription(libraryId: string): StoredSubscription | undefined {
    const today = new Date().toISOString().split('T')[0];
    for (const sub of this.subscriptions.values()) {
      if (
        sub.libraryId === libraryId &&
        (sub.status === 'ACTIVE' || sub.status === 'TRIAL' || sub.status === 'MANUAL') &&
        sub.endDate >= today
      ) {
        return sub;
      }
    }
    return undefined;
  }

  // ===================== Payment & Webhook Ops =====================
  createPayment(
    libraryId: string,
    data: {
      subscriptionId?: string;
      provider: string;
      amount: number;
      currency?: string;
      providerOrderId?: string;
      idempotencyKey: string;
      metadata?: Record<string, unknown>;
    }
  ): StoredPayment {
    const id = randomUUID();
    const payment: StoredPayment = {
      id,
      libraryId,
      subscriptionId: data.subscriptionId || null,
      provider: data.provider,
      providerPaymentId: null,
      providerOrderId: data.providerOrderId || null,
      amount: data.amount,
      currency: data.currency || 'INR',
      status: 'PENDING',
      idempotencyKey: data.idempotencyKey,
      metadata: data.metadata || null,
      createdAt: new Date().toISOString(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  findPaymentByIdempotencyKey(key: string): StoredPayment | undefined {
    for (const p of this.payments.values()) {
      if (p.idempotencyKey === key) return p;
    }
    return undefined;
  }

  recordWebhookEvent(provider: string, idempotencyKey: string, payload: Record<string, unknown>): boolean {
    if (this.webhookEvents.has(idempotencyKey)) {
      return false; // Already processed!
    }
    const id = randomUUID();
    this.webhookEvents.set(idempotencyKey, {
      id,
      provider,
      idempotencyKey,
      payload,
      createdAt: new Date().toISOString(),
    });
    return true;
  }

  // ===================== Coupon Ops =====================
  initDefaultCoupons(): void {
    if (this.coupons.size > 0) return;

    this.coupons.set('LIBRARY20', {
      id: 'coupon-lib20',
      code: 'LIBRARY20',
      discountType: 'PERCENTAGE',
      discountValue: 20, // 20% discount
      minOrderAmount: 500,
      maxDiscountAmount: 1000,
      maxRedemptions: 100,
      perUserLimit: 1,
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2026-12-31T23:59:59Z',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    this.coupons.set('FLAT500', {
      id: 'coupon-flat500',
      code: 'FLAT500',
      discountType: 'FIXED',
      discountValue: 500, // ₹500 off
      minOrderAmount: 1500,
      maxDiscountAmount: 500,
      maxRedemptions: 50,
      perUserLimit: 1,
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2026-12-31T23:59:59Z',
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  }

  findCouponByCode(code: string): StoredCoupon | undefined {
    this.initDefaultCoupons();
    return this.coupons.get(code.toUpperCase());
  }

  recordCouponUsage(couponId: string, userId: string, discountApplied: number, paymentId?: string): void {
    this.couponUsages.push({
      id: randomUUID(),
      couponId,
      userId,
      paymentId: paymentId || null,
      discountApplied,
      createdAt: new Date().toISOString(),
    });
  }

  countUserCouponUsages(couponId: string, userId: string): number {
    return this.couponUsages.filter((u) => u.couponId === couponId && u.userId === userId).length;
  }

  // ===================== Platform Super Admin Ops =====================
  listAllLibrariesWithMetrics(): Array<{
    id: string;
    name: string;
    slug: string;
    contactPhone: string;
    contactEmail?: string | null;
    ownerName: string;
    ownerEmail: string;
    totalStudents: number;
    totalSeats: number;
    subscriptionPlan: string;
    subscriptionStatus: string;
    isActive: boolean;
    createdAt: string;
  }> {
    this.initDefaultSubscriptionPlans();
    return Array.from(this.libraries.values())
      .filter((l) => !l.deletedAt)
      .map((l) => {
        const owner = this.users.get(l.ownerId);
        const students = Array.from(this.students.values()).filter((s) => s.libraryId === l.id && !s.deletedAt);
        const seats = Array.from(this.seats.values()).filter((s) => s.libraryId === l.id && !s.deletedAt);
        const sub = this.findActiveLibrarySubscription(l.id);
        const plan = sub ? this.findPlanById(sub.planId) : null;

        return {
          id: l.id,
          name: l.name,
          slug: l.slug,
          contactPhone: l.contactPhone,
          contactEmail: l.contactEmail,
          ownerName: owner ? owner.fullName : 'Unknown',
          ownerEmail: owner ? owner.email : 'Unknown',
          owner: owner
            ? {
                id: owner.id,
                fullName: owner.fullName,
                email: owner.email,
                phone: owner.phone,
              }
            : {
                id: l.ownerId,
                fullName: 'Owner',
                email: '',
                phone: l.contactPhone,
              },
          totalStudents: students.length,
          totalSeats: seats.length,
          counts: {
            students: students.length,
            seats: seats.length,
            rooms: 1,
          },
          subscriptionPlan: plan ? plan.name : 'No Active Plan',
          subscriptionStatus: sub ? sub.status : 'INACTIVE',
          isActive: l.isActive,
          createdAt: l.createdAt,
        };
      });
  }

  setLibraryActiveStatus(libraryId: string, isActive: boolean): StoredLibrary | undefined {
    const lib = this.libraries.get(libraryId);
    if (!lib || lib.deletedAt) return undefined;
    lib.isActive = isActive;
    return lib;
  }

  listAllCoupons(): StoredCoupon[] {
    this.initDefaultCoupons();
    return Array.from(this.coupons.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createCoupon(data: {
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderAmount?: number | null;
    maxDiscountAmount?: number | null;
    maxRedemptions?: number | null;
    perUserLimit?: number;
    validFrom: string;
    validUntil: string;
  }): StoredCoupon {
    this.initDefaultCoupons();
    const id = randomUUID();
    const coupon: StoredCoupon = {
      id,
      code: data.code.toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount || null,
      maxDiscountAmount: data.maxDiscountAmount || null,
      maxRedemptions: data.maxRedemptions || null,
      perUserLimit: data.perUserLimit || 1,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.coupons.set(coupon.code, coupon);
    return coupon;
  }

  updateCoupon(couponId: string, data: Partial<StoredCoupon>): StoredCoupon | undefined {
    this.initDefaultCoupons();
    for (const [key, c] of this.coupons.entries()) {
      if (c.id === couponId) {
        const oldCode = c.code;
        const newCode = data.code ? data.code.toUpperCase().trim() : oldCode;
        const updated: StoredCoupon = {
          ...c,
          ...data,
          code: newCode,
        };
        if (oldCode !== newCode) {
          this.coupons.delete(oldCode);
        }
        this.coupons.set(newCode, updated);
        return updated;
      }
    }
    return undefined;
  }

  deleteCoupon(couponId: string): boolean {
    this.initDefaultCoupons();
    for (const [code, c] of this.coupons.entries()) {
      if (c.id === couponId) {
        this.coupons.delete(code);
        this.couponUsages = this.couponUsages.filter((u) => u.couponId !== couponId);
        return true;
      }
    }
    return false;
  }

  toggleCouponStatus(couponId: string): StoredCoupon | undefined {
    this.initDefaultCoupons();
    for (const c of this.coupons.values()) {
      if (c.id === couponId) {
        c.isActive = !c.isActive;
        return c;
      }
    }
    return undefined;
  }

  listAllAuditLogs(limit = 50): StoredAuditLog[] {
    return this.auditLogs.slice(0, limit);
  }

  getPlatformMetrics(): {
    totalLibraries: number;
    activeLibraries: number;
    suspendedLibraries: number;
    totalStudents: number;
    totalSeats: number;
    activeSubscriptions: number;
    activeMemberships: number;
    totalRevenue: number;
  } {
    const allLibs = Array.from(this.libraries.values()).filter((l) => !l.deletedAt);
    const activeLibs = allLibs.filter((l) => l.isActive);
    const suspendedLibs = allLibs.filter((l) => !l.isActive);
    const allStudents = Array.from(this.students.values()).filter((s) => !s.deletedAt);
    const allSeats = Array.from(this.seats.values()).filter((s) => !s.deletedAt);

    const today = new Date().toISOString().split('T')[0];
    const activeSubs = Array.from(this.subscriptions.values()).filter(
      (s) => (s.status === 'ACTIVE' || s.status === 'TRIAL' || s.status === 'MANUAL') && s.endDate >= today
    );

    const totalRevenue = Array.from(this.payments.values())
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const activeMemberships = Array.from(this.memberships.values()).filter(
      (m) => m.status === 'ACTIVE'
    ).length;

    return {
      totalLibraries: allLibs.length,
      activeLibraries: activeLibs.length,
      suspendedLibraries: suspendedLibs.length,
      totalStudents: allStudents.length,
      totalSeats: allSeats.length,
      activeSubscriptions: activeSubs.length,
      activeMemberships,
      totalRevenue,
    };
  }

  listAllPayments(): any[] {
    return Array.from(this.payments.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => {
        const lib = this.libraries.get(p.libraryId);
        const owner = lib ? this.users.get(lib.ownerId) : null;
        const sub = p.subscriptionId ? this.subscriptions.get(p.subscriptionId) : null;
        const plan = sub ? this.subscriptionPlans.get(sub.planId) : null;
        const usage = this.couponUsages.find((u) => u.paymentId === p.id);
        const coupon = usage ? this.coupons.get(usage.couponId) : null;
        const meta = (p.metadata || {}) as Record<string, any>;

        const discountApplied = Number(meta.discountApplied || usage?.discountApplied || 0);
        const originalAmount = Number(meta.originalAmount || (p.amount + discountApplied));
        const couponCode = meta.couponCode || coupon?.code || null;

        return {
          id: p.id,
          libraryId: p.libraryId,
          libraryName: lib?.name || meta.libraryName || 'Library',
          ownerName: owner?.fullName || meta.ownerName || 'Owner',
          ownerEmail: owner?.email || lib?.contactEmail || meta.paidByEmail || '',
          amount: p.amount,
          originalAmount,
          discountApplied,
          couponCode,
          currency: p.currency,
          status: p.status,
          provider: p.provider,
          paymentId: p.providerPaymentId || meta.razorpay_payment_id || p.id,
          orderId: p.providerOrderId || meta.razorpay_order_id || null,
          createdAt: p.createdAt,
          planCode: meta.planCode || plan?.code || 'BASIC',
          planName: meta.planName || plan?.name || 'Basic Plan',
          durationMonths: Number(meta.durationMonths || 1),
          adjustmentAction: meta.adjustmentAction,
          daysAdjusted: meta.daysAdjusted !== undefined ? Number(meta.daysAdjusted) : null,
          isAutopay: Boolean(meta.isAutopay || sub?.autoRenew),
          isCancelled: Boolean(meta.isCancelled),
          cancellationReason: meta.cancellationReason || null,
          cancelledAt: meta.cancelledAt || null,
          failureReason: meta.failureReason || null,
          statusDetail: meta.statusDetail || null,
        };
      });
  }

  listAllStudents(filter?: { libraryId?: string; search?: string }): any[] {
    let all = Array.from(this.students.values()).filter((s) => !s.deletedAt);
    if (filter?.libraryId && filter.libraryId !== 'ALL') {
      all = all.filter((s) => s.libraryId === filter.libraryId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      all = all.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(q))
      );
    }

    const today = new Date().toISOString().split('T')[0];

    return all.map((s) => {
      const lib = this.libraries.get(s.libraryId);
      const owner = lib ? this.users.get(lib.ownerId) : null;
      const mem = Array.from(this.memberships.values())
        .filter((m) => m.studentId === s.id)
        .sort((a, b) => b.expectedEndDate.localeCompare(a.expectedEndDate))[0];
      const assign = Array.from(this.seatAssignments.values()).find(
        (a) => a.studentId === s.id && a.status === 'ACTIVE'
      );
      const seat = assign ? this.seats.get(assign.seatId) : null;
      const row = seat ? this.rows.get(seat.rowId) : null;
      const room = row ? this.rooms.get(row.roomId) : null;

      const isExpired = mem ? mem.expectedEndDate < today : true;
      const membershipStatus = mem
        ? (mem.status === 'ACTIVE' && isExpired ? 'EXPIRED' : mem.status)
        : 'NO_MEMBERSHIP';

      return {
        id: s.id,
        fullName: s.fullName,
        phone: s.phone,
        email: s.email,
        fatherName: s.fatherName,
        motherName: s.motherName,
        address: s.address,
        studyPurpose: s.studyPurpose,
        photoUrl: s.photoUrl,
        kycDocId: s.kycDocId,
        kycDocType: s.kycDocType,
        kycPhotoUrl: s.kycPhotoUrl,
        isActive: s.isActive,
        createdAt: s.createdAt,
        libraryId: s.libraryId,
        libraryName: lib?.name || 'Library',
        librarySlug: lib?.slug || '',
        ownerName: owner?.fullName || 'Owner',
        ownerEmail: owner?.email || '',
        membership: mem
          ? {
              id: mem.id,
              status: membershipStatus,
              shift: mem.shift,
              startDate: mem.startDate,
              endDate: mem.expectedEndDate,
              feeAmount: mem.feeAmount,
            }
          : null,
        memberships: mem
          ? [
              {
                id: mem.id,
                status: membershipStatus,
                shift: mem.shift,
                startDate: mem.startDate,
                endDate: mem.expectedEndDate,
                feeAmount: mem.feeAmount,
              },
            ]
          : [],
        feeTransactions: [],
        transactions: [],
        seat: seat
          ? {
              seatNumber: seat.seatNumber,
              roomName: room?.name || null,
              rowName: row?.name || null,
              shift: assign?.shift || 'FULL_DAY',
            }
          : null,
        remainingDue: 0,
        lastPaymentDate: null,
      };
    });
  }

  // ===================== Audit Ops =====================
  recordAudit(log: Omit<StoredAuditLog, 'id' | 'createdAt'>): StoredAuditLog {
    const entry: StoredAuditLog = {
      ...log,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  // Clear data (useful for test isolation)
  clear(): void {
    this.users.clear();
    this.libraries.clear();
    this.libraryMembers.clear();
    this.rooms.clear();
    this.rows.clear();
    this.seats.clear();
    this.students.clear();
    this.memberships.clear();
    this.membershipPauses.clear();
    this.seatAssignments.clear();
    this.subscriptionPlans.clear();
    this.subscriptions.clear();
    this.payments.clear();
    this.webhookEvents.clear();
    this.coupons.clear();
    this.couponUsages = [];
    this.auditLogs = [];
    this.otpStore.clear();
  }
}

export const dataStore = new MemoryDataStore();
