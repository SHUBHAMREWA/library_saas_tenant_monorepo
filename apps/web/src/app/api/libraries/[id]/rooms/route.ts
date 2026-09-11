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
    const { roomName, rowNames, rowConfigs, seatsPerRow, startNumber } = body;

    const finalRoomName = roomName?.trim() || 'Ground Floor - Silent Hall';
    const validRows = Array.isArray(rowNames) && rowNames.length > 0 ? rowNames : ['Row A', 'Row B'];
    const countPerRow = Math.max(0, seatsPerRow || 0);

    const roomId = crypto.randomUUID();
    const createdRoom = await prisma.room.create({
      data: {
        id: roomId,
        libraryId,
        name: finalRoomName,
      },
    });

    const createdSeats: any[] = [];
    let currentNum = Math.max(1, startNumber || 1);

    for (let rIdx = 0; rIdx < validRows.length; rIdx++) {
      const rName = validRows[rIdx];
      const rowId = crypto.randomUUID();
      const rowCfg = Array.isArray(rowConfigs) ? rowConfigs.find((c: any) => c.name === rName) : null;
      const hasLocker = Boolean(rowCfg?.hasLocker);

      await prisma.row.create({
        data: {
          id: rowId,
          libraryId,
          roomId: createdRoom.id,
          name: rName,
          hasLocker,
        },
      });

      if (countPerRow > 0) {
        for (let i = 0; i < countPerRow; i++) {
          const num = currentNum < 10 ? `0${currentNum}` : `${currentNum}`;
          const seatId = crypto.randomUUID();
          const seatNumber = `${num}`;
          currentNum++;

          await prisma.seat.create({
            data: {
              id: seatId,
              libraryId,
              rowId,
              seatNumber,
              status: 'AVAILABLE',
              hasLocker,
            },
          });

          createdSeats.push({
            id: seatId,
            seatNumber,
            rowName: rName,
            status: 'AVAILABLE',
            studentName: null,
            roomId: createdRoom.id,
            hasLocker,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      room: {
        id: createdRoom.id,
        name: createdRoom.name,
        rows: validRows,
      },
      seats: createdSeats,
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/rooms error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await req.json();
    const { roomId, newName } = body;

    if (!roomId || !newName?.trim()) {
      return NextResponse.json({ error: 'roomId and newName are required' }, { status: 400 });
    }

    // Verify room belongs strictly to this library
    const existingRoom = await prisma.room.findFirst({
      where: { id: roomId, libraryId },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found in this library' }, { status: 404 });
    }

    const updated = await prisma.room.update({
      where: { id: existingRoom.id },
      data: { name: newName.trim() },
    });

    return NextResponse.json({ success: true, room: updated });
  } catch (error: any) {
    console.error('API PUT /api/libraries/[id]/rooms error:', error);
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
    const roomId = searchParams.get('roomId')?.trim();

    if (!roomId) {
      return NextResponse.json({ error: 'roomId query parameter is required' }, { status: 400 });
    }

    // Find room strictly within target library
    const room = await prisma.room.findFirst({
      where: { id: roomId, libraryId },
      include: { rows: { include: { seats: true } } },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found in this library' }, { status: 404 });
    }

    const seatIds = room.rows.flatMap((r) => r.seats.map((s) => s.id));
    if (seatIds.length > 0) {
      await prisma.seatAssignment.deleteMany({
        where: { seatId: { in: seatIds }, libraryId },
      });
      await prisma.seat.deleteMany({
        where: { id: { in: seatIds }, libraryId },
      });
    }
    await prisma.row.deleteMany({
      where: { roomId: room.id, libraryId },
    });
    await prisma.room.delete({
      where: { id: room.id },
    });

    return NextResponse.json({ success: true, deletedRoomId: roomId });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id]/rooms error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
