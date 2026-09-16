import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function handleGetLibrary(
  _req: NextRequest,
  libraryId: string
) {
  try {
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

    return NextResponse.json(
      {
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
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('API GET /api/libraries/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleUpdateLibrary(
  req: NextRequest,
  libraryId: string
) {
  try {
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

export async function handleDeleteLibrary(
  _req: NextRequest,
  libraryId: string
) {
  try {
    if (!libraryId) {
      return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    }

    const existingLib = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { id: true, name: true },
    });

    if (!existingLib) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const payments = await tx.payment.findMany({
        where: { libraryId },
        select: { id: true },
      });
      const paymentIds = payments.map((p) => p.id);
      if (paymentIds.length > 0) {
        await tx.couponUsage.deleteMany({
          where: { paymentId: { in: paymentIds } },
        });
      }

      await tx.payment.deleteMany({ where: { libraryId } });
      await tx.studentFeeTransaction.deleteMany({ where: { libraryId } });
      await tx.seatAssignment.deleteMany({ where: { libraryId } });
      await tx.membership.deleteMany({ where: { libraryId } });
      await tx.student.deleteMany({ where: { libraryId } });
      await tx.seat.deleteMany({ where: { libraryId } });
      await tx.row.deleteMany({ where: { libraryId } });
      await tx.room.deleteMany({ where: { libraryId } });
      await tx.subscription.deleteMany({ where: { libraryId } });
      await tx.pushSubscriptionRecord.deleteMany({ where: { libraryId } });
      await tx.appNotification.deleteMany({ where: { libraryId } });
      await tx.library.delete({ where: { id: libraryId } });
    });

    return NextResponse.json({
      success: true,
      message: `Library "${existingLib.name}" and all related data deleted successfully.`,
      deletedLibraryId: libraryId,
    });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}