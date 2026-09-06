import { dataStore, StoredStudent } from '../../services/data-store';
import { CreateStudentInput, UpdateStudentSchema } from '@library/validation';
import { z } from 'zod';

export interface StudentDetailView extends StoredStudent {
  activeMembership?: {
    id: string;
    startDate: string;
    expectedEndDate: string;
    status: string;
    feeAmount: number;
    shift: string;
  } | null;
  activeSeat?: {
    id: string;
    seatNumber: string;
    shift: string;
  } | null;
}

export class StudentService {
  createStudent(
    libraryId: string,
    actorId: string,
    input: CreateStudentInput
  ): StudentDetailView {
    // 1. Phone number clash check in same library
    const existing = dataStore.findStudentByPhone(libraryId, input.phone);
    if (existing) {
      throw Object.assign(
        new Error(`A student with phone ${input.phone} already exists in this library.`),
        { statusCode: 409, code: 'STUDENT_PHONE_EXISTS' }
      );
    }

    // 2. Create student record
    const student = dataStore.createStudent(libraryId, {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      fatherName: input.fatherName,
      motherName: input.motherName,
      address: input.address,
      studyPurpose: input.studyPurpose,
      photoUrl: input.photoUrl,
      kycDocId: input.kycDocId,
      kycDocType: input.kycDocType,
    });

    let activeMembership = null;
    let activeSeat = null;

    // 3. Process optional initial membership
    if (input.initialMembership) {
      const mem = dataStore.createMembership(libraryId, {
        studentId: student.id,
        startDate: input.initialMembership.startDate,
        expectedEndDate: input.initialMembership.expectedEndDate,
        feeAmount: input.initialMembership.feeAmount,
        shift: input.initialMembership.shift,
      });
      activeMembership = mem;

      // Optional seat assignment
      if (input.initialMembership.seatId) {
        const seat = dataStore.findSeatById(libraryId, input.initialMembership.seatId);
        if (!seat) {
          throw Object.assign(new Error('Selected seat not found'), {
            statusCode: 404,
            code: 'SEAT_NOT_FOUND',
          });
        }

        // Clash check
        const clash = dataStore.findActiveSeatAssignment(seat.id, input.initialMembership.shift);
        if (clash) {
          throw Object.assign(
            new Error(`Seat ${seat.seatNumber} is already occupied for shift ${input.initialMembership.shift}`),
            { statusCode: 409, code: 'SEAT_OCCUPIED_FOR_SHIFT' }
          );
        }

        dataStore.createSeatAssignment(libraryId, {
          seatId: seat.id,
          studentId: student.id,
          membershipId: mem.id,
          shift: input.initialMembership.shift,
          startDate: input.initialMembership.startDate,
        });

        activeSeat = {
          id: seat.id,
          seatNumber: seat.seatNumber,
          shift: input.initialMembership.shift,
        };
      }
    }

    // 4. Record audit log
    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'STUDENT_CREATED',
      entityType: 'STUDENT',
      entityId: student.id,
      diffPayload: {
        fullName: { before: null, after: student.fullName },
        phone: { before: null, after: student.phone },
      },
    });

    return {
      ...student,
      activeMembership: activeMembership
        ? {
            id: activeMembership.id,
            startDate: activeMembership.startDate,
            expectedEndDate: activeMembership.expectedEndDate,
            status: activeMembership.status,
            feeAmount: activeMembership.feeAmount,
            shift: activeMembership.shift,
          }
        : null,
      activeSeat,
    };
  }

  listStudents(
    libraryId: string,
    filters?: { search?: string; isActive?: boolean }
  ): StudentDetailView[] {
    const students = dataStore.listStudents(libraryId, filters);
    return students.map((s) => {
      const mem = dataStore.findStudentActiveMembership(libraryId, s.id);
      const sa = dataStore.findStudentActiveSeatAssignment(libraryId, s.id);
      const seat = sa ? dataStore.seats.get(sa.seatId) : null;

      return {
        ...s,
        activeMembership: mem
          ? {
              id: mem.id,
              startDate: mem.startDate,
              expectedEndDate: mem.expectedEndDate,
              status: mem.status,
              feeAmount: mem.feeAmount,
              shift: mem.shift,
            }
          : null,
        activeSeat: seat
          ? {
              id: seat.id,
              seatNumber: seat.seatNumber,
              shift: sa!.shift,
            }
          : null,
      };
    });
  }

  getStudentById(libraryId: string, studentId: string): StudentDetailView {
    const student = dataStore.findStudentById(libraryId, studentId);
    if (!student) {
      throw Object.assign(new Error('Student not found'), {
        statusCode: 404,
        code: 'STUDENT_NOT_FOUND',
      });
    }

    const mem = dataStore.findStudentActiveMembership(libraryId, studentId);
    const sa = dataStore.findStudentActiveSeatAssignment(libraryId, studentId);
    const seat = sa ? dataStore.seats.get(sa.seatId) : null;

    return {
      ...student,
      activeMembership: mem
        ? {
            id: mem.id,
            startDate: mem.startDate,
            expectedEndDate: mem.expectedEndDate,
            status: mem.status,
            feeAmount: mem.feeAmount,
            shift: mem.shift,
          }
        : null,
      activeSeat: seat
        ? {
            id: seat.id,
            seatNumber: seat.seatNumber,
            shift: sa!.shift,
          }
        : null,
    };
  }

  updateStudent(
    libraryId: string,
    actorId: string,
    studentId: string,
    input: z.infer<typeof UpdateStudentSchema>
  ): StoredStudent {
    const updated = dataStore.updateStudent(libraryId, studentId, input as any);
    if (!updated) {
      throw Object.assign(new Error('Student not found'), {
        statusCode: 404,
        code: 'STUDENT_NOT_FOUND',
      });
    }

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'STUDENT_UPDATED',
      entityType: 'STUDENT',
      entityId: studentId,
      diffPayload: input as any,
    });

    return updated;
  }

  deleteStudent(libraryId: string, actorId: string, studentId: string): void {
    const success = dataStore.deleteStudent(libraryId, studentId);
    if (!success) {
      throw Object.assign(new Error('Student not found'), {
        statusCode: 404,
        code: 'STUDENT_NOT_FOUND',
      });
    }

    dataStore.recordAudit({
      libraryId,
      actorId,
      actorType: 'USER',
      action: 'STUDENT_ARCHIVED',
      entityType: 'STUDENT',
      entityId: studentId,
      diffPayload: { isDeleted: { before: false, after: true } },
    });
  }
}

export const studentService = new StudentService();
