import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await req.json();
    const { studentId, seatId, seatNumber, shift, reserveSeat } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // 1. Verify student exists
    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found in this library' }, { status: 404 });
    }

    // 2. Get active membership for student or update existing
    let membership = await prisma.membership.findFirst({
      where: { studentId: student.id, libraryId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    if (!membership) {
      membership = await prisma.membership.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          studentId: student.id,
          startDate: now,
          expectedEndDate: end,
          status: 'ACTIVE',
          feeAmount: 1000,
          shift: (shift || 'FULL_DAY') as any,
        },
      });
    } else {
      const isPastOrExpired = !membership.expectedEndDate || new Date(membership.expectedEndDate).getTime() <= now.getTime();
      membership = await prisma.membership.update({
        where: { id: membership.id },
        data: {
          status: 'ACTIVE',
          shift: (shift || membership.shift) as any,
          expectedEndDate: isPastOrExpired ? end : membership.expectedEndDate,
        },
      });
    }

    // 3. Clear any existing active seat assignments for this student
    const existingAssignments = await prisma.seatAssignment.findMany({
      where: { studentId: student.id, libraryId, status: 'ACTIVE' },
      include: { seat: true },
    });

    for (const assignment of existingAssignments) {
      // Free the old seat
      await prisma.seat.update({
        where: { id: assignment.seatId },
        data: { status: 'AVAILABLE' },
      });
      // Mark old assignment completed
      await prisma.seatAssignment.update({
        where: { id: assignment.id },
        data: { status: 'RELEASED', endDate: new Date() },
      });
    }

    // 4. If assigning a new seat (seatId or seatNumber provided)
    if (seatId || seatNumber) {
      let targetSeat = null;
      if (seatId) {
        targetSeat = await prisma.seat.findFirst({
          where: { id: seatId, libraryId },
        });
      }
      if (!targetSeat && seatNumber) {
        targetSeat = await prisma.seat.findFirst({
          where: { seatNumber, libraryId },
        });
      }

      if (!targetSeat) {
        return NextResponse.json({ error: 'Seat not found' }, { status: 404 });
      }

      // 4. Determine target shift collision logic
      const targetShift = (shift || membership.shift || 'FULL_DAY').toUpperCase();
      const isMorning = targetShift === 'MORNING' || targetShift === 'FOUR_HOURS' || targetShift === 'HALF_DAY';
      const isEvening = targetShift === 'EVENING';

      const prevOccupantAssignments = await prisma.seatAssignment.findMany({
        where: { seatId: targetSeat.id, libraryId, status: 'ACTIVE' },
      });

      for (const poa of prevOccupantAssignments) {
        // Skip if this assignment is for the same student
        if (poa.studentId === student.id) continue;

        const poaShift = (poa.shift || 'FULL_DAY').toUpperCase();
        const poaIsMorning = poaShift === 'MORNING' || poaShift === 'FOUR_HOURS' || poaShift === 'HALF_DAY';
        const poaIsEvening = poaShift === 'EVENING';

        // Conflict occurs if assigning FULL_DAY, or existing is FULL_DAY, or same shift (Morning vs Morning, Evening vs Evening)
        const isConflict =
          targetShift === 'FULL_DAY' ||
          poaShift === 'FULL_DAY' ||
          (isMorning && poaIsMorning) ||
          (isEvening && poaIsEvening);

        if (isConflict) {
          await prisma.seatAssignment.update({
            where: { id: poa.id },
            data: { status: 'RELEASED', endDate: new Date() },
          });
        }
      }

      // Update target seat to RESERVED or OCCUPIED
      const newStatus = reserveSeat ? 'RESERVED' : 'OCCUPIED';
      await prisma.seat.update({
        where: { id: targetSeat.id },
        data: { status: newStatus as any },
      });

      // Create new active SeatAssignment
      await prisma.seatAssignment.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          seatId: targetSeat.id,
          studentId: student.id,
          membershipId: membership.id,
          shift: (shift || membership.shift) as any,
          startDate: new Date(),
          status: 'ACTIVE',
        },
      });

      return NextResponse.json({
        success: true,
        assigned: true,
        studentId: student.id,
        studentName: student.fullName,
        seatId: targetSeat.id,
        seatNumber: targetSeat.seatNumber,
        status: newStatus,
        shift: shift || membership.shift,
      });
    }

    // If unassigning (seatId and seatNumber were null/empty)
    return NextResponse.json({
      success: true,
      assigned: false,
      studentId: student.id,
      studentName: student.fullName,
      seatId: null,
      seatNumber: null,
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/seats/assign error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
