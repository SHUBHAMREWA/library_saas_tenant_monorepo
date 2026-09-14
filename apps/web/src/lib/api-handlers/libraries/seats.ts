import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { serverCache } from '@/lib/server-cache';
import crypto from 'crypto';

export async function handleGetSeats(_req: NextRequest, libraryId: string) {
  try {
    if (!libraryId) {
      return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    }

    const cacheKey = `seats:${libraryId}`;
    const cached = serverCache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rooms = await prisma.room.findMany({
      where: { libraryId, isActive: true },
      include: {
        rows: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          include: {
            seats: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              include: {
                seatAssignments: {
                  where: { status: 'ACTIVE' },
                  include: {
                    student: { select: { id: true, fullName: true, phone: true, photoUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const seenSeatKeys = new Set<string>();
    const allSeats: any[] = [];

    const formattedRooms = rooms.map((rm) => {
      const uniqueRowNames = Array.from(new Set(rm.rows.map((rw) => rw.name.trim())));
      rm.rows.forEach((rw) => {
        rw.seats.forEach((st) => {
          const seatKey = `${rm.id}_${rw.name.trim().toLowerCase()}_${st.seatNumber.trim().toLowerCase()}`;
          if (seenSeatKeys.has(seatKey)) return;
          seenSeatKeys.add(seatKey);

          const activeOccupants = (st.seatAssignments || [])
            .filter((sa: any) => sa.status === 'ACTIVE' && sa.student && sa.student.fullName)
            .map((sa: any) => ({
              studentId: sa.student.id,
              studentName: sa.student.fullName,
              phone: sa.student.phone,
              photoUrl: sa.student.photoUrl || undefined,
              shift: sa.shift || 'FULL_DAY',
            }));

          let mainName: string | null = null;
          let mainShift: string | undefined = undefined;

          if (activeOccupants.length === 1) {
            mainName = activeOccupants[0].studentName;
            mainShift = activeOccupants[0].shift;
          } else if (activeOccupants.length > 1) {
            mainName = activeOccupants.map((o: any) => `${o.studentName} (${o.shift.charAt(0)})`).join(' • ');
            mainShift = 'SHARED';
          }

          let seatStatus = st.status;
          if (activeOccupants.length > 0) {
            seatStatus = st.status === 'RESERVED' ? 'RESERVED' : 'OCCUPIED';
          } else if (st.status === 'OCCUPIED') {
            seatStatus = 'AVAILABLE';
          }

          allSeats.push({
            id: st.id,
            seatNumber: st.seatNumber,
            rowName: rw.name,
            status: seatStatus,
            studentName: mainName,
            shift: mainShift,
            occupants: activeOccupants,
            roomId: rm.id,
            hasLocker: st.hasLocker || rw.hasLocker || false,
          });
        });
      });

      return {
        id: rm.id,
        name: rm.name,
        rows: uniqueRowNames,
      };
    });

    allSeats.sort((a, b) =>
      a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
    );

    const payload = {
      success: true,
      rooms: formattedRooms,
      seats: allSeats,
    };
    serverCache.set(cacheKey, payload, 30);

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('API GET /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleCreateSeats(req: NextRequest, libraryId: string) {
  try {
    const body = await req.json();
    const { prefix, startNumber, count, roomId, rowName } = body;

    const rowNameSearch = (rowName || 'Row A').trim();

    let targetRow = await prisma.row.findFirst({
      where: {
        libraryId,
        ...(roomId ? { roomId } : {}),
        name: { equals: rowNameSearch, mode: 'insensitive' },
      },
    });

    if (!targetRow && roomId) {
      targetRow = await prisma.row.findFirst({
        where: {
          libraryId,
          name: { equals: rowNameSearch, mode: 'insensitive' },
        },
      });
    }

    if (!targetRow) {
      let targetRoom = roomId ? await prisma.room.findUnique({ where: { id: roomId } }) : null;
      if (!targetRoom) {
        targetRoom = await prisma.room.findFirst({ where: { libraryId } });
      }
      if (!targetRoom) {
        targetRoom = await prisma.room.create({
          data: {
            id: crypto.randomUUID(),
            libraryId,
            name: 'Main Hall',
          },
        });
      }

      targetRow = await prisma.row.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          roomId: targetRoom.id,
          name: rowNameSearch,
        },
      });
    }

    const existingSeats = await prisma.seat.findMany({
      where: {
        libraryId,
        rowId: targetRow.id,
      },
      select: {
        seatNumber: true,
      },
    });
    const existingSeatNums = new Set(existingSeats.map((s) => s.seatNumber.toLowerCase().trim()));

    const newSeats: any[] = [];
    const seatPrefix = prefix !== undefined ? prefix : '';
    const start = Math.max(1, startNumber || 1);
    const total = Math.max(1, count || 10);

    for (let i = 0; i < total; i++) {
      const num = start + i;
      const padded = num < 10 ? `0${num}` : `${num}`;
      const seatNumber = `${seatPrefix}${padded}`;

      if (existingSeatNums.has(seatNumber.toLowerCase().trim())) {
        continue;
      }

      const seatId = crypto.randomUUID();

      const created = await prisma.seat.create({
        data: {
          id: seatId,
          libraryId,
          rowId: targetRow.id,
          seatNumber,
          status: 'AVAILABLE',
        },
      });

      existingSeatNums.add(seatNumber.toLowerCase().trim());

      newSeats.push({
        id: created.id,
        seatNumber: created.seatNumber,
        rowName: targetRow.name,
        status: created.status,
        studentName: null,
        roomId: targetRow.roomId,
      });
    }

    serverCache.invalidate(libraryId);

    return NextResponse.json({
      success: true,
      seats: newSeats,
      totalCreated: newSeats.length,
      skippedCount: total - newSeats.length,
      message:
        newSeats.length === 0
          ? `Seats ${seatPrefix}${start < 10 ? `0${start}` : start} through ${seatPrefix}${start + total - 1 < 10 ? `0${start + total - 1}` : start + total - 1} already exist in this row.`
          : undefined,
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleUpdateSeat(req: NextRequest, libraryId: string) {
  try {
    const body = await req.json();
    const { seatId, seatNumber, status } = body;

    if ((!seatId && !seatNumber) || !status) {
      return NextResponse.json({ error: 'seatId or seatNumber, and status are required' }, { status: 400 });
    }

    if (seatId) {
      const existingSeat = await prisma.seat.findFirst({
        where: { id: seatId, libraryId },
      });
      if (existingSeat) {
        const updated = await prisma.seat.update({
          where: { id: existingSeat.id },
          data: { status },
        });
        serverCache.invalidate(libraryId);
        return NextResponse.json({ success: true, seat: updated });
      }
    }

    const targetSeatNumber = seatNumber || seatId;
    const updated = await prisma.seat.updateMany({
      where: { seatNumber: targetSeatNumber, libraryId },
      data: { status },
    });

    serverCache.invalidate(libraryId);
    return NextResponse.json({ success: true, count: updated.count });
  } catch (error: any) {
    console.error('API PATCH /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleDeleteSeats(req: NextRequest, libraryId: string) {
  try {
    const { searchParams } = new URL(req.url);
    const seatId = searchParams.get('seatId')?.trim();
    const seatNumber = searchParams.get('seatNumber')?.trim();

    if (!seatId && !seatNumber) {
      return NextResponse.json({ error: 'seatId or seatNumber query parameter is required' }, { status: 400 });
    }

    let matchingSeats: { id: string }[] = [];

    if (seatId) {
      matchingSeats = await prisma.seat.findMany({
        where: { id: seatId, libraryId },
        select: { id: true },
      });

      if (matchingSeats.length === 0) {
        matchingSeats = await prisma.seat.findMany({
          where: { seatNumber: seatId, libraryId },
          select: { id: true },
        });
      }
    } else if (seatNumber) {
      matchingSeats = await prisma.seat.findMany({
        where: { seatNumber, libraryId },
        select: { id: true },
      });
    }

    if (matchingSeats.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matching seat found in this library',
        deletedCount: 0,
      });
    }

    const seatIds = matchingSeats.map((s) => s.id);

    await prisma.seatAssignment.deleteMany({
      where: { seatId: { in: seatIds }, libraryId },
    });

    const deleteResult = await prisma.seat.deleteMany({
      where: { id: { in: seatIds }, libraryId },
    });

    serverCache.invalidate(libraryId);

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      deletedSeatIds: seatIds,
    });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleAssignSeat(req: NextRequest, libraryId: string) {
  try {
    const body = await req.json();
    const { studentId, seatId, seatNumber, roomId, rowName, shift, reserveSeat } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found in this library' }, { status: 404 });
    }

    let membership = await prisma.membership.findFirst({
      where: { studentId: student.id, libraryId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const isUnassign = Boolean(body.unassign) || !seatNumber || seatNumber === 'UNASSIGN';

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
    } else if (isUnassign) {
      if (membership) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: 'PAUSED' },
        });
      }
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

    const existingAssignments = await prisma.seatAssignment.findMany({
      where: { studentId: student.id, libraryId, status: 'ACTIVE' },
      include: { seat: true },
    });

    for (const assignment of existingAssignments) {
      await prisma.seatAssignment.update({
        where: { id: assignment.id },
        data: { status: 'RELEASED', endDate: new Date() },
      });

      const remainingCount = await prisma.seatAssignment.count({
        where: { seatId: assignment.seatId, libraryId, status: 'ACTIVE' },
      });

      if (remainingCount === 0) {
        await prisma.seat.update({
          where: { id: assignment.seatId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    if (!isUnassign && (seatId || seatNumber)) {
      let targetSeat = null;
      if (seatId) {
        targetSeat = await prisma.seat.findFirst({
          where: { id: seatId, libraryId },
        });
      }
      if (!targetSeat && seatNumber && (roomId || rowName)) {
        targetSeat = await prisma.seat.findFirst({
          where: {
            seatNumber,
            libraryId,
            ...(roomId ? { row: { roomId } } : {}),
            ...(rowName ? { row: { name: rowName } } : {}),
          },
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

      const targetShift = (shift || membership.shift || 'FULL_DAY').toUpperCase();
      const isMorning = targetShift === 'MORNING' || targetShift === 'FOUR_HOURS' || targetShift === 'HALF_DAY';
      const isEvening = targetShift === 'EVENING';

      const prevOccupantAssignments = await prisma.seatAssignment.findMany({
        where: { seatId: targetSeat.id, libraryId, status: 'ACTIVE' },
      });

      for (const poa of prevOccupantAssignments) {
        if (poa.studentId === student.id) continue;

        const poaShift = (poa.shift || 'FULL_DAY').toUpperCase();
        const poaIsMorning = poaShift === 'MORNING' || poaShift === 'FOUR_HOURS' || poaShift === 'HALF_DAY';
        const poaIsEvening = poaShift === 'EVENING';

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

      const newStatus = reserveSeat ? 'RESERVED' : 'OCCUPIED';
      await prisma.seat.update({
        where: { id: targetSeat.id },
        data: { status: newStatus as any },
      });

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

      serverCache.invalidate(libraryId);

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

    serverCache.invalidate(libraryId);

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