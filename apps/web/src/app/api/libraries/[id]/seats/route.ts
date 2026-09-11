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
    const { prefix, startNumber, count, roomId, rowName } = body;

    const rowNameSearch = (rowName || 'Row A').trim();

    // Find or create row
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
      // Find default room
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

    // Query existing seats in this row to avoid unique constraint violations
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

      // If seat already exists in this row, don't crash PostgreSQL with unique constraint
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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await req.json();
    const { seatId, seatNumber, status } = body;

    if ((!seatId && !seatNumber) || !status) {
      return NextResponse.json({ error: 'seatId or seatNumber, and status are required' }, { status: 400 });
    }

    // Try updating by id within this library
    if (seatId) {
      const existingSeat = await prisma.seat.findFirst({
        where: { id: seatId, libraryId },
      });
      if (existingSeat) {
        const updated = await prisma.seat.update({
          where: { id: existingSeat.id },
          data: { status },
        });
        return NextResponse.json({ success: true, seat: updated });
      }
    }

    // If seatId was client-generated or seatNumber is passed, update by seatNumber within this library only
    const targetSeatNumber = seatNumber || seatId;
    const updated = await prisma.seat.updateMany({
      where: { seatNumber: targetSeatNumber, libraryId },
      data: { status },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error: any) {
    console.error('API PATCH /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const { searchParams } = new URL(req.url);
    const seatId = searchParams.get('seatId')?.trim();
    const seatNumber = searchParams.get('seatNumber')?.trim();

    if (!seatId && !seatNumber) {
      return NextResponse.json({ error: 'seatId or seatNumber query parameter is required' }, { status: 400 });
    }

    // Find matching seats strictly within the target library
    let matchingSeats: { id: string }[] = [];

    if (seatId) {
      matchingSeats = await prisma.seat.findMany({
        where: { id: seatId, libraryId },
        select: { id: true },
      });

      // If not found by UUID, check if seatId was passed as a seat number string (e.g. "01")
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

    // Clean up seat assignments strictly belonging to target library and these seats
    await prisma.seatAssignment.deleteMany({
      where: { seatId: { in: seatIds }, libraryId },
    });

    // Delete the physical seats strictly in the target library
    const deleteResult = await prisma.seat.deleteMany({
      where: { id: { in: seatIds }, libraryId },
    });

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
