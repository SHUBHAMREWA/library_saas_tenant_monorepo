import { dataStore, StoredMembership } from '../../services/data-store';
import {
  CreateMembershipSchema,
  PauseMembershipSchema,
  ResumeMembershipSchema,
} from '@library/validation';
import { z } from 'zod';

export class MembershipService {
  createMembership(
    libraryId: string,
    actorId: string,
    input: z.infer<typeof CreateMembershipSchema>
  ): StoredMembership {
    const student = dataStore.findStudentById(libraryId, input.studentId);
    if (!student) {
      throw Object.assign(new Error('Student not found'), {
        statusCode: 404,
        code: 'STUDENT_NOT_FOUND',
      });
    }

    const membership = dataStore.createMembership(libraryId, {
      studentId: input.studentId,
      startDate: input.startDate,
      expectedEndDate: input.expectedEndDate,
      feeAmount: input.feeAmount,
      shift: input.shift,
      notes: input.notes,
    });

    if (input.seatId) {
      const seat = dataStore.findSeatById(libraryId, input.seatId);
      if (!seat) {
        throw Object.assign(new Error('Seat not found'), {
          statusCode: 404,
          code: 'SEAT_NOT_FOUND',
        });
      }

      const clash = dataStore.findActiveSeatAssignment(seat.id, input.shift);
      if (clash) {
        throw Object.assign(
          new Error(`Seat ${seat.seatNumber} is already occupied for shift ${input.shift}`),
          { statusCode: 409, code: 'SEAT_OCCUPIED_FOR_SHIFT' }
        );
      }

      dataStore.createSeatAssignment(libraryId, {
        seatId: seat.id,
        studentId: input.studentId,
        membershipId: membership.id,
        shift: input.shift,
        startDate: input.startDate,
      });
    }

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'MEMBERSHIP_CREATED',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      diffPayload: { studentId: { before: null, after: input.studentId } },
    });

    return membership;
  }

  pauseMembership(
    libraryId: string,
    actorId: string,
    membershipId: string,
    input: z.infer<typeof PauseMembershipSchema>
  ): StoredMembership {
    const membership = dataStore.findMembershipById(libraryId, membershipId);
    if (!membership) {
      throw Object.assign(new Error('Membership not found'), {
        statusCode: 404,
        code: 'MEMBERSHIP_NOT_FOUND',
      });
    }

    if (membership.status !== 'ACTIVE') {
      throw Object.assign(
        new Error(`Cannot pause a membership that is currently ${membership.status}`),
        { statusCode: 400, code: 'INVALID_MEMBERSHIP_STATE' }
      );
    }

    // 1. Record pause
    dataStore.createMembershipPause(libraryId, {
      membershipId: membership.id,
      pauseStartDate: input.pauseStartDate,
      expectedResumeDate: input.expectedResumeDate,
      reason: input.reason,
      extendedMembershipDuration: input.extendedMembershipDuration,
    });

    // 2. Transition status to PAUSED
    const updated = dataStore.updateMembership(libraryId, membership.id, {
      status: 'PAUSED',
    })!;

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'MEMBERSHIP_PAUSED',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      diffPayload: { status: { before: 'ACTIVE', after: 'PAUSED' }, reason: input.reason },
    });

    return updated;
  }

  resumeMembership(
    libraryId: string,
    actorId: string,
    membershipId: string,
    input: z.infer<typeof ResumeMembershipSchema>
  ): StoredMembership {
    const membership = dataStore.findMembershipById(libraryId, membershipId);
    if (!membership) {
      throw Object.assign(new Error('Membership not found'), {
        statusCode: 404,
        code: 'MEMBERSHIP_NOT_FOUND',
      });
    }

    if (membership.status !== 'PAUSED') {
      throw Object.assign(new Error('Membership is not currently paused'), {
        statusCode: 400,
        code: 'MEMBERSHIP_NOT_PAUSED',
      });
    }

    const activePause = dataStore.findActivePause(membershipId);
    let newExpectedEndDate = membership.expectedEndDate;

    if (activePause) {
      activePause.actualResumeDate = input.actualResumeDate;

      // Calculate pause duration in days
      if (input.extendEndDate && activePause.extendedMembershipDuration) {
        const pStart = new Date(activePause.pauseStartDate).getTime();
        const pEnd = new Date(input.actualResumeDate).getTime();
        const diffDays = Math.max(0, Math.round((pEnd - pStart) / (1000 * 60 * 60 * 24)));

        if (diffDays > 0) {
          const currentEnd = new Date(membership.expectedEndDate);
          currentEnd.setDate(currentEnd.getDate() + diffDays);
          newExpectedEndDate = currentEnd.toISOString().split('T')[0];
        }
      }
    }

    const updated = dataStore.updateMembership(libraryId, membershipId, {
      status: 'ACTIVE',
      expectedEndDate: newExpectedEndDate,
    })!;

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'MEMBERSHIP_RESUMED',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      diffPayload: {
        status: { before: 'PAUSED', after: 'ACTIVE' },
        expectedEndDate: { before: membership.expectedEndDate, after: newExpectedEndDate },
      },
    });

    return updated;
  }

  renewMembership(
    libraryId: string,
    actorId: string,
    membershipId: string,
    newEndDate: string,
    additionalFee: number
  ): StoredMembership {
    const membership = dataStore.findMembershipById(libraryId, membershipId);
    if (!membership) {
      throw Object.assign(new Error('Membership not found'), {
        statusCode: 404,
        code: 'MEMBERSHIP_NOT_FOUND',
      });
    }

    const updated = dataStore.updateMembership(libraryId, membershipId, {
      status: 'ACTIVE',
      expectedEndDate: newEndDate,
      feeAmount: Number(membership.feeAmount) + additionalFee,
    })!;

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'MEMBERSHIP_RENEWED',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      diffPayload: {
        previousEnd: membership.expectedEndDate,
        newEnd: newEndDate,
      },
    });

    return updated;
  }

  listExpiring(libraryId: string, daysAhead: number): StoredMembership[] {
    return dataStore.listExpiringMemberships(libraryId, daysAhead);
  }
}

export const membershipService = new MembershipService();
