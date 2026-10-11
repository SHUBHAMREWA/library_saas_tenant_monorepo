import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { serverCache } from '@/lib/server-cache';
import {
  parseCustomSlotFromNotes,
  resolveEffectiveTimeSlot,
  checkSlotsOverlap,
  encodeCustomSlot,
} from '@/lib/slot-utils';
import crypto from 'crypto';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function handleGetSeats(_req: NextRequest, libraryId: string) {
  try {
    if (!libraryId) {
      return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    }

    const cacheKey = `seats:${libraryId}`;
    const cached = serverCache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: NO_CACHE_HEADERS });
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
                    membership: {
                      select: {
                        notes: true,
                        shift: true,
                      },
                    },
                    student: {
                      select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        photoUrl: true,
                        memberships: {
                          orderBy: { createdAt: 'desc' },
                          take: 1,
                        },
                        feeTransactions: {
                          orderBy: { paymentDate: 'desc' },
                          take: 2,
                        },
                      },
                    },
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
    const assignmentsToRelease: string[] = [];
    const seatsToFree: string[] = [];
    const now = new Date();

    const formattedRooms = rooms.map((rm) => {
      const uniqueRowNames = Array.from(new Set(rm.rows.map((rw) => rw.name.trim())));
      rm.rows.forEach((rw) => {
        rw.seats.forEach((st) => {
          const seatKey = `${rm.id}_${rw.name.trim().toLowerCase()}_${st.seatNumber.trim().toLowerCase()}`;
          if (seenSeatKeys.has(seatKey)) return;
          seenSeatKeys.add(seatKey);

          const activeOccupants: any[] = [];

          for (const sa of st.seatAssignments || []) {
            if (sa.status !== 'ACTIVE' || !sa.student || !sa.student.fullName) continue;

            const std = sa.student;
            let latestValidEndDate: Date | null = null;
            if (std.memberships?.[0]?.expectedEndDate) {
              latestValidEndDate = new Date(std.memberships[0].expectedEndDate);
            }
            for (const tx of std.feeTransactions || []) {
              if (tx.validTo) {
                const d = new Date(tx.validTo);
                if (!isNaN(d.getTime()) && (!latestValidEndDate || d > latestValidEndDate)) {
                  latestValidEndDate = d;
                }
              }
            }

            const isExpired = latestValidEndDate ? latestValidEndDate.getTime() <= now.getTime() : false;

            if (isExpired) {
              assignmentsToRelease.push(sa.id);
              continue;
            }

            const customSlot = parseCustomSlotFromNotes(sa.membership?.notes) ||
              parseCustomSlotFromNotes(std.memberships?.[0]?.notes) ||
              parseCustomSlotFromNotes(std.feeTransactions?.[0]?.notes);

            const displayShift = customSlot ? customSlot.label : (sa.shift || 'FULL_DAY');
            const resolvedSlot = customSlot || resolveEffectiveTimeSlot(sa.shift, sa.membership?.notes || std.memberships?.[0]?.notes);

            activeOccupants.push({
              studentId: std.id,
              studentName: std.fullName,
              phone: std.phone,
              photoUrl: std.photoUrl || undefined,
              shift: displayShift,
              rawShift: sa.shift || 'FULL_DAY',
              timeSlot: resolvedSlot,
            });
          }

          let mainName: string | null = null;
          let mainShift: string | undefined = undefined;

          if (activeOccupants.length === 1) {
            mainName = activeOccupants[0].studentName;
            mainShift = activeOccupants[0].shift;
          } else if (activeOccupants.length > 1) {
            mainName = activeOccupants.map((o: any) => `${o.studentName} (${o.shift})`).join(' • ');
            mainShift = 'SHARED';
          }

          let seatStatus = st.status;
          if (activeOccupants.length > 0) {
            seatStatus = st.status === 'RESERVED' ? 'RESERVED' : 'OCCUPIED';
          } else if (st.status === 'OCCUPIED') {
            seatStatus = 'AVAILABLE';
            seatsToFree.push(st.id);
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
            roomName: rm.name,
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

    if (assignmentsToRelease.length > 0) {
      prisma.seatAssignment.updateMany({
        where: { id: { in: assignmentsToRelease } },
        data: { status: 'RELEASED', endDate: now },
      }).catch((e) => console.warn('Could not batch release seat assignments:', e));
    }
    if (seatsToFree.length > 0) {
      prisma.seat.updateMany({
        where: { id: { in: seatsToFree } },
        data: { status: 'AVAILABLE' },
      }).catch((e) => console.warn('Could not free phantom occupied seats:', e));
    }

    allSeats.sort((a, b) =>
      a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
    );

    const payload = {
      success: true,
      rooms: formattedRooms,
      seats: allSeats,
    };
    serverCache.set(cacheKey, payload, 30);

    return NextResponse.json(payload, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('API GET /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleCreateSeats(req: NextRequest, libraryId: string) {
  try {
    const body = await req.json();
    const { prefix, startNumber, count, roomId, rowName, hasLocker } = body;

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
            name: 'Ground Floor',
          },
        });
      }

      targetRow = await prisma.row.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          roomId: targetRoom.id,
          name: rowNameSearch,
          hasLocker: Boolean(hasLocker),
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
    const seatHasLocker = Boolean(hasLocker || targetRow.hasLocker);

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
          hasLocker: seatHasLocker,
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
        hasLocker: seatHasLocker,
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

    // Find all matching seats in this library
    let matchingSeats: { id: string; seatNumber: string }[] = [];
    if (seatId) {
      matchingSeats = await prisma.seat.findMany({
        where: { id: seatId, libraryId },
        select: { id: true, seatNumber: true },
      });
      if (matchingSeats.length === 0) {
        matchingSeats = await prisma.seat.findMany({
          where: { seatNumber: seatId, libraryId },
          select: { id: true, seatNumber: true },
        });
      }
    } else if (seatNumber) {
      matchingSeats = await prisma.seat.findMany({
        where: { seatNumber, libraryId },
        select: { id: true, seatNumber: true },
      });
    }

    if (matchingSeats.length === 0) {
      return NextResponse.json({ error: 'Seat not found in this library' }, { status: 404 });
    }

    const targetSeatIds = matchingSeats.map((s) => s.id);

    // If making AVAILABLE or MAINTENANCE, release any active seat assignments in the DB
    if (status === 'AVAILABLE' || status === 'MAINTENANCE') {
      await prisma.seatAssignment.updateMany({
        where: {
          seatId: { in: targetSeatIds },
          status: 'ACTIVE',
        },
        data: {
          status: 'RELEASED',
        },
      });
    }

    await prisma.seat.updateMany({
      where: { id: { in: targetSeatIds } },
      data: { status },
    });

    serverCache.invalidate(libraryId);

    return NextResponse.json({
      success: true,
      updatedCount: targetSeatIds.length,
      status,
    });
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
    const { studentId, seatId, seatNumber, roomId, rowName, shift, reserveSeat, customSlot, forceReassign } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const student = (await prisma.student.findFirst({
      where: { id: studentId, libraryId },
    })) || (await prisma.student.findUnique({
      where: { id: studentId },
    }));

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    let membership = await prisma.membership.findFirst({
      where: { studentId: student.id, libraryId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const isUnassign = Boolean(body.unassign) || !seatNumber || seatNumber === 'UNASSIGN';

    if (isUnassign) {
      const existingAssignments = await prisma.seatAssignment.findMany({
        where: { studentId: student.id, status: 'ACTIVE' },
        include: { seat: true },
      });

      for (const assignment of existingAssignments) {
        await prisma.seatAssignment.update({
          where: { id: assignment.id },
          data: { status: 'RELEASED', endDate: new Date() },
        });

        if (assignment.seatId) {
          const remainingCount = await prisma.seatAssignment.count({
            where: { seatId: assignment.seatId, status: 'ACTIVE' },
          });

          if (remainingCount === 0) {
            await prisma.seat.update({
              where: { id: assignment.seatId },
              data: { status: 'AVAILABLE' },
            });
          }
        }
      }

      await prisma.seatAssignment.updateMany({
        where: { studentId: student.id, status: 'ACTIVE' },
        data: { status: 'RELEASED', endDate: new Date() },
      });

      if (membership) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: 'PAUSED' },
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
    }

    // --- ASSIGN SEAT FLOW ---
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

    const slotInput = typeof customSlot === 'string'
      ? customSlot
      : (customSlot?.startMin !== undefined && customSlot?.endMin !== undefined
          ? encodeCustomSlot(customSlot.startMin, customSlot.endMin, customSlot.label)
          : (customSlot?.label || membership?.notes));

    const requestedSlot = resolveEffectiveTimeSlot(shift, slotInput);

    // Conflict detection against active occupants on targetSeat
    const prevOccupantAssignments = await prisma.seatAssignment.findMany({
      where: { seatId: targetSeat.id, libraryId, status: 'ACTIVE' },
      include: {
        student: { select: { fullName: true } },
        membership: { select: { notes: true, shift: true } },
      },
    });

    for (const poa of prevOccupantAssignments) {
      if (poa.studentId === student.id) continue;

      const poaSlot = resolveEffectiveTimeSlot(poa.shift, poa.membership?.notes);
      const isConflict = checkSlotsOverlap(requestedSlot, poaSlot);

      if (isConflict) {
        if (forceReassign) {
          await prisma.seatAssignment.update({
            where: { id: poa.id },
            data: { status: 'RELEASED', endDate: new Date() },
          });
        } else {
          return NextResponse.json(
            {
              error: `Time clash on Seat #${targetSeat.seatNumber}: ${poa.student?.fullName || 'Existing student'} is already assigned (${poaSlot.label}). Please choose an available time slot.`,
              code: 'SLOT_CONFLICT',
              conflictingStudent: poa.student?.fullName,
              conflictingSlot: poaSlot.label,
            },
            { status: 409 }
          );
        }
      }
    }

    // Determine DB-safe ShiftType (Postgres enum allows only MORNING, EVENING, NIGHT, FULL_DAY, FOUR_HOURS, HALF_DAY)
    const VALID_SHIFTS = ['MORNING', 'EVENING', 'NIGHT', 'FULL_DAY', 'FOUR_HOURS', 'HALF_DAY'];
    const isCustom = requestedSlot.isCustom || shift === 'CUSTOM' || Boolean(customSlot);
    const dbSafeShift: 'FULL_DAY' | 'MORNING' | 'EVENING' | 'NIGHT' | 'FOUR_HOURS' | 'HALF_DAY' = isCustom
      ? 'FOUR_HOURS'
      : (shift && VALID_SHIFTS.includes(shift.toUpperCase())
          ? (shift.toUpperCase() as any)
          : (membership?.shift && VALID_SHIFTS.includes(membership.shift.toUpperCase())
              ? (membership.shift.toUpperCase() as any)
              : 'FULL_DAY'));

    let updatedNotes = membership?.notes || '';
    if (isCustom) {
      const slotTag = encodeCustomSlot(requestedSlot.startMin, requestedSlot.endMin, requestedSlot.label);
      updatedNotes = `${updatedNotes.replace(/SLOT:[^|\n]+(?:\|[^\n\r]+)?/g, '').trim()} ${slotTag}`.trim();
    }

    // Release old active assignments for this student
    const existingAssignments = await prisma.seatAssignment.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      include: { seat: true },
    });

    for (const assignment of existingAssignments) {
      await prisma.seatAssignment.update({
        where: { id: assignment.id },
        data: { status: 'RELEASED', endDate: new Date() },
      });

      if (assignment.seatId && assignment.seatId !== targetSeat.id) {
        const remainingCount = await prisma.seatAssignment.count({
          where: { seatId: assignment.seatId, status: 'ACTIVE' },
        });

        if (remainingCount === 0) {
          await prisma.seat.update({
            where: { id: assignment.seatId },
            data: { status: 'AVAILABLE' },
          });
        }
      }
    }

    await prisma.seatAssignment.updateMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      data: { status: 'RELEASED', endDate: new Date() },
    });

    // Create or update membership ONCE with safe ShiftType
    const isPastOrExpired = !membership?.expectedEndDate || new Date(membership.expectedEndDate).getTime() <= now.getTime();
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
          shift: dbSafeShift,
          notes: updatedNotes || null,
        },
      });
    } else {
      membership = await prisma.membership.update({
        where: { id: membership.id },
        data: {
          status: 'ACTIVE',
          shift: dbSafeShift,
          notes: updatedNotes || null,
          expectedEndDate: isPastOrExpired ? end : membership.expectedEndDate,
        },
      });
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
        shift: dbSafeShift,
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
      shift: isCustom ? requestedSlot.label : (shift || membership.shift),
      timeSlot: requestedSlot,
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/seats/assign error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}