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
  req: NextRequest
) {
  try {
    const body = await req.json();
    const { seatId, status } = body;

    if (!seatId || !status) {
      return NextResponse.json({ error: 'seatId and status are required' }, { status: 400 });
    }

    // Try updating by id
    try {
      const updated = await prisma.seat.update({
        where: { id: seatId },
        data: { status },
      });
      return NextResponse.json({ success: true, seat: updated });
    } catch {
      // If seatId was client-generated, update by seatNumber
      const updated = await prisma.seat.updateMany({
        where: { seatNumber: seatId },
        data: { status },
      });
      return NextResponse.json({ success: true, count: updated.count });
    }
  } catch (error: any) {
    console.error('API PATCH /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest
) {
  try {
    const { searchParams } = new URL(req.url);
    const seatId = searchParams.get('seatId');
    const seatNumber = searchParams.get('seatNumber');

    if (!seatId && !seatNumber) {
      return NextResponse.json({ error: 'seatId or seatNumber query parameter is required' }, { status: 400 });
    }

    if (seatId) {
      await prisma.seatAssignment.deleteMany({ where: { seatId } });
      try {
        await prisma.seat.delete({ where: { id: seatId } });
        return NextResponse.json({ success: true, deletedSeatId: seatId });
      } catch {
        if (seatNumber) {
          await prisma.seat.deleteMany({ where: { seatNumber } });
        }
      }
    } else if (seatNumber) {
      const seats = await prisma.seat.findMany({ where: { seatNumber } });
      const ids = seats.map((s) => s.id);
      if (ids.length > 0) {
        await prisma.seatAssignment.deleteMany({ where: { seatId: { in: ids } } });
        await prisma.seat.deleteMany({ where: { id: { in: ids } } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id]/seats error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
