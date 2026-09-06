import { dataStore, StoredAttendanceLog } from '../../services/data-store';
import { ManualAttendanceProvider, IAttendanceProvider } from './attendance.provider';
import { OwnerDashboardMetrics } from '@library/types';

export class AttendanceService {
  private provider: IAttendanceProvider;

  constructor(provider?: IAttendanceProvider) {
    this.provider = provider || new ManualAttendanceProvider();
  }

  async checkIn(
    libraryId: string,
    actorId: string,
    data: { studentId: string; seatId?: string | null; source?: 'MANUAL' | 'QR' | 'RFID' | 'DEVICE'; sourceDeviceId?: string }
  ): Promise<StoredAttendanceLog> {
    const student = dataStore.findStudentById(libraryId, data.studentId);
    if (!student) {
      throw Object.assign(new Error('Student not found in this library'), {
        statusCode: 404,
        code: 'STUDENT_NOT_FOUND',
      });
    }

    const sa = dataStore.findStudentActiveSeatAssignment(libraryId, data.studentId);
    const assignedSeatId = data.seatId || (sa ? sa.seatId : null);

    const log = dataStore.recordCheckIn(libraryId, {
      studentId: data.studentId,
      seatId: assignedSeatId,
      source: data.source || this.provider.providerType,
      sourceDeviceId: data.sourceDeviceId,
    });

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'ATTENDANCE_CHECK_IN',
      entityType: 'ATTENDANCE',
      entityId: log.id,
      diffPayload: { studentId: data.studentId, source: log.source },
    });

    return log;
  }

  async checkOut(
    libraryId: string,
    actorId: string,
    studentId: string
  ): Promise<StoredAttendanceLog> {
    const log = dataStore.recordCheckOut(libraryId, studentId);
    if (!log) {
      throw Object.assign(new Error('No check-in record found for this student today'), {
        statusCode: 400,
        code: 'ATTENDANCE_NOT_CHECKED_IN',
      });
    }

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'ATTENDANCE_CHECK_OUT',
      entityType: 'ATTENDANCE',
      entityId: log.id,
      diffPayload: { studentId, checkOutTime: log.checkOutTime },
    });

    return log;
  }

  getTodayRoster(libraryId: string): Array<{
    studentId: string;
    fullName: string;
    phone: string;
    seatNumber?: string | null;
    shift: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    isPresent: boolean;
  }> {
    const students = dataStore.listStudents(libraryId, { isActive: true });
    const todayLogs = dataStore.getTodayAttendanceLogs(libraryId);
    const logMap = new Map<string, StoredAttendanceLog>();
    for (const l of todayLogs) {
      logMap.set(l.studentId, l);
    }

    return students.map((s) => {
      const log = logMap.get(s.id);
      const sa = dataStore.findStudentActiveSeatAssignment(libraryId, s.id);
      const seat = sa ? dataStore.seats.get(sa.seatId) : null;
      const mem = dataStore.findStudentActiveMembership(libraryId, s.id);

      return {
        studentId: s.id,
        fullName: s.fullName,
        phone: s.phone,
        seatNumber: seat ? seat.seatNumber : null,
        shift: mem ? mem.shift : (sa ? sa.shift : 'FULL_DAY'),
        checkInTime: log ? log.checkInTime : null,
        checkOutTime: log ? log.checkOutTime : null,
        isPresent: !!log && !log.checkOutTime,
      };
    });
  }

  getStudentHistory(libraryId: string, studentId: string): {
    totalDays: number;
    logs: StoredAttendanceLog[];
  } {
    const logs = dataStore.getStudentAttendanceHistory(libraryId, studentId);
    return {
      totalDays: logs.length,
      logs,
    };
  }

  getDashboardSummary(libraryId: string): OwnerDashboardMetrics {
    const students = dataStore.listStudents(libraryId, { isActive: true });
    const todayLogs = dataStore.getTodayAttendanceLogs(libraryId);
    const seats = dataStore.listSeats(libraryId);
    const expiringSoon = dataStore.listExpiringMemberships(libraryId, 5);

    const occupiedCount = seats.filter((s) => s.status === 'OCCUPIED').length;
    const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;

    // Count expired memberships
    const todayStr = new Date().toISOString().split('T')[0];
    const expiredCount = Array.from(dataStore.memberships.values()).filter(
      (m) => m.libraryId === libraryId && (m.status === 'EXPIRED' || (m.status === 'ACTIVE' && m.expectedEndDate < todayStr))
    ).length;

    const recentLogs = dataStore.auditLogs
      .filter((a) => a.libraryId === libraryId)
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        action: a.action,
        timestamp: a.createdAt,
        details: `${a.action} on ${a.entityType}`,
      }));

    return {
      totalActiveStudents: students.length,
      todayAttendanceCount: todayLogs.length,
      totalSeats: seats.length,
      availableSeats: availableCount,
      occupiedSeats: occupiedCount,
      membershipsEndingSoonCount: expiringSoon.length,
      expiredMembershipsCount: expiredCount,
      recentActivity: recentLogs,
    };
  }
}

export const attendanceService = new AttendanceService();
