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
    const { roomId, rowNames, rowConfigs, seatsPerRow, startNumber } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const validRows = Array.isArray(rowNames) && rowNames.length > 0 ? rowNames : ['Row A'];
    const countPerRow = Math.max(0, seatsPerRow || 0);

    const createdRows: any[] = [];
    const createdSeats: any[] = [];

    // Find highest sortOrder in room
    const existingRows = await prisma.row.findMany({
      where: { roomId },
      orderBy: { sortOrder: 'desc' },
      take: 1,
    });
    let startSortOrder = (existingRows[0]?.sortOrder || 0) + 1;

    // Determine continuous starting number across rows
    let startingNumber = startNumber;
    if (!startingNumber) {
      const existingSeatsInRoom = await prisma.seat.findMany({
        where: {
          libraryId,
          row: { roomId },
        },
        select: { seatNumber: true },
      });
      let maxNum = 0;
      existingSeatsInRoom.forEach((s) => {
        const m = s.seatNumber.match(/(\d+)$/);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val > maxNum) maxNum = val;
        }
      });
      startingNumber = maxNum > 0 ? maxNum + 1 : 1;
    }

    let currentNum = Math.max(1, startingNumber);

    for (let i = 0; i < validRows.length; i++) {
      const rName = validRows[i].trim();
      if (!rName) continue;

      const rowCfg = Array.isArray(rowConfigs) ? rowConfigs.find((c: any) => c.name === rName) : null;
      const hasLocker = Boolean(rowCfg?.hasLocker);

      // Check if row already exists in this room
      let targetRow = await prisma.row.findFirst({
        where: { roomId, name: rName },
      });

      if (!targetRow) {
        targetRow = await prisma.row.create({
          data: {
            id: crypto.randomUUID(),
            libraryId,
            roomId,
            name: rName,
            hasLocker,
            sortOrder: startSortOrder + i,
          },
        });
      }

      createdRows.push({
        id: targetRow.id,
        name: targetRow.name,
        hasLocker: targetRow.hasLocker,
      });

      if (countPerRow > 0) {
        const existingSeatsInRow = await prisma.seat.findMany({
          where: { libraryId, rowId: targetRow.id },
          select: { seatNumber: true },
        });
        const existingSeatNums = new Set(existingSeatsInRow.map((s) => s.seatNumber));

        let createdForThisRow = 0;

        while (createdForThisRow < countPerRow && currentNum <= 9999) {
          const padded = currentNum < 10 ? `0${currentNum}` : `${currentNum}`;
          const seatNumber = `${padded}`;
          currentNum++;

          if (existingSeatNums.has(seatNumber)) {
            continue;
          }

          const seatId = crypto.randomUUID();
          await prisma.seat.create({
            data: {
              id: seatId,
              libraryId,
              rowId: targetRow.id,
              seatNumber,
              status: 'AVAILABLE',
              hasLocker,
            },
          });

          existingSeatNums.add(seatNumber);
          createdSeats.push({
            id: seatId,
            seatNumber,
            rowName: targetRow.name,
            status: 'AVAILABLE',
            studentName: null,
            roomId,
            hasLocker,
          });
          createdForThisRow++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      rows: createdRows,
      seats: createdSeats,
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/rows error:', error);
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
    const rowName = searchParams.get('rowName')?.trim();
    const roomId = searchParams.get('roomId')?.trim();

    if (!rowName) {
      return NextResponse.json({ error: 'rowName query parameter is required' }, { status: 400 });
    }

    // 1. Find matching rows
    const isValidUuid = roomId && /^[0-9a-fA-F-]{36}$/.test(roomId);
    let matchingRows = await prisma.row.findMany({
      where: {
        libraryId,
        name: { equals: rowName, mode: 'insensitive' },
        ...(isValidUuid ? { roomId } : {}),
      },
      include: { seats: true },
    });

    // If no row found with specific roomId, search across library
    if (matchingRows.length === 0) {
      matchingRows = await prisma.row.findMany({
        where: {
          libraryId,
          name: { equals: rowName, mode: 'insensitive' },
        },
        include: { seats: true },
      });
    }

    // 2. Collect all seat IDs for this row
    const seatIdSet = new Set<string>();
    for (const rw of matchingRows) {
      for (const s of rw.seats) {
        seatIdSet.add(s.id);
      }
    }

    // Also look up any seats linked by rowId or rowName
    const rowIds = matchingRows.map((r) => r.id);
    if (rowIds.length > 0) {
      const moreSeats = await prisma.seat.findMany({
        where: { rowId: { in: rowIds } },
      });
      moreSeats.forEach((s) => seatIdSet.add(s.id));
    }

    const allSeatIds = Array.from(seatIdSet);

    // 3. Clean up seat assignments and attendance logs first to prevent RESTRICT violations
    if (allSeatIds.length > 0) {
      await prisma.seatAssignment.deleteMany({
        where: { seatId: { in: allSeatIds } },
      });
      await prisma.seat.deleteMany({
        where: { id: { in: allSeatIds } },
      });
    }

    // 4. Delete the row entities
    let deletedRowCount = 0;
    for (const rw of matchingRows) {
      await prisma.row.delete({
        where: { id: rw.id },
      });
      deletedRowCount++;
    }

    return NextResponse.json({
      success: true,
      deletedRowName: rowName,
      deletedRows: deletedRowCount,
      deletedSeats: allSeatIds.length,
    });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id]/rows error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
