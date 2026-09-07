import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      include: {
        owner: { select: { id: true, fullName: true, email: true, phone: true } },
        rooms: {
          include: {
            rows: {
              include: {
                seats: {
                  include: {
                    seatAssignments: {
                      where: { status: 'ACTIVE' },
                      include: {
                        student: { select: { fullName: true } },
                      },
                      take: 1,
                    },
                  },
                  orderBy: { seatNumber: 'asc' },
                },
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { seats: true, students: true } },
      },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Shape the response for easy rendering in the floor plan modal
    const rooms = library.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      rows: room.rows.map((row) => ({
        id: row.id,
        name: row.name,
        seats: row.seats.map((seat) => ({
          id: seat.id,
          seatNumber: seat.seatNumber,
          status: seat.status,
          studentName: seat.seatAssignments[0]?.student?.fullName ?? null,
        })),
      })),
    }));

    return NextResponse.json({
      success: true,
      library: {
        id: library.id,
        name: library.name,
        slug: library.slug,
        address: library.address,
        isActive: library.isActive,
        owner: library.owner,
        totalSeats: library._count.seats,
        totalStudents: library._count.students,
        rooms,
      },
    });
  } catch (error: any) {
    console.error('API GET /api/libraries/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;

    if (!libraryId) {
      return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    }

    await prisma.library.delete({
      where: { id: libraryId },
    });

    return NextResponse.json({ success: true, deletedLibraryId: libraryId });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id] error:', error);
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
    const { name, contactPhone, address } = body;

    const updated = await prisma.library.update({
      where: { id: libraryId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(contactPhone ? { contactPhone: contactPhone.trim() } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
      },
    });

    return NextResponse.json({ success: true, library: updated });
  } catch (error: any) {
    console.error('API PUT /api/libraries/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
