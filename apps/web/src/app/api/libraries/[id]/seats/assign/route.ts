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
    const { studentId, seatId, seatNumber } = body;

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

    // 2. Get active membership for student
    let membership = await prisma.membership.findFirst({
      where: { studentId: student.id, libraryId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) {
      const now = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      membership = await prisma.membership.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          studentId: student.id,
          startDate: now,
          expectedEndDate: end,
          status: 'ACTIVE',
          feeAmount: 1000,
          shift: 'FULL_DAY',
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

      // If this target seat had an active assignment by someone else, complete it
      const prevOccupantAssignments = await prisma.seatAssignment.findMany({
        where: { seatId: targetSeat.id, libraryId, status: 'ACTIVE' },
      });
      for (const poa of prevOccupantAssignments) {
        await prisma.seatAssignment.update({
          where: { id: poa.id },
          data: { status: 'RELEASED', endDate: new Date() },
        });
      }

      // Update target seat to OCCUPIED
      await prisma.seat.update({
        where: { id: targetSeat.id },
        data: { status: 'OCCUPIED' },
      });

      // Create new active SeatAssignment
      await prisma.seatAssignment.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          seatId: targetSeat.id,
          studentId: student.id,
          membershipId: membership.id,
          shift: membership.shift,
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
        shift: membership.shift,
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
