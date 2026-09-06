import { AttendanceSource } from '@library/types';

export interface AttendanceEventPayload {
  libraryId: string;
  studentId: string;
  seatId?: string | null;
  source: AttendanceSource;
  sourceDeviceId?: string | null;
  timestamp: Date;
}

export interface AttendanceRecordResult {
  logId: string;
  studentId: string;
  libraryId: string;
  action: 'CHECK_IN' | 'CHECK_OUT';
  recordedAt: Date;
  source: AttendanceSource;
}

export interface IAttendanceProvider {
  readonly providerType: AttendanceSource;
  recordCheckIn(payload: AttendanceEventPayload): Promise<AttendanceRecordResult>;
  recordCheckOut(payload: AttendanceEventPayload): Promise<AttendanceRecordResult>;
}

export class ManualAttendanceProvider implements IAttendanceProvider {
  readonly providerType: AttendanceSource = 'MANUAL';

  async recordCheckIn(payload: AttendanceEventPayload): Promise<AttendanceRecordResult> {
    return {
      logId: 'manual-checkin',
      studentId: payload.studentId,
      libraryId: payload.libraryId,
      action: 'CHECK_IN',
      recordedAt: payload.timestamp,
      source: this.providerType,
    };
  }

  async recordCheckOut(payload: AttendanceEventPayload): Promise<AttendanceRecordResult> {
    return {
      logId: 'manual-checkout',
      studentId: payload.studentId,
      libraryId: payload.libraryId,
      action: 'CHECK_OUT',
      recordedAt: payload.timestamp,
      source: this.providerType,
    };
  }
}
