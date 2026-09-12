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

    const existingLib = await prisma.library.findUnique({
      where: { id: libraryId },
      select: { id: true, name: true },
    });

    if (!existingLib) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete coupon usages linked to payments
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

      // 2. Delete Payments
      await tx.payment.deleteMany({
        where: { libraryId },
      });

      // 3. Delete StudentFeeTransactions
      await tx.studentFeeTransaction.deleteMany({
        where: { libraryId },
      });

      // 4. Delete SeatAssignments
      await tx.seatAssignment.deleteMany({
        where: { libraryId },
      });

      // 5. Delete Memberships
      await tx.membership.deleteMany({
        where: { libraryId },
      });

      // 6. Delete Students
      await tx.student.deleteMany({
        where: { libraryId },
      });

      // 7. Delete Seats
      await tx.seat.deleteMany({
        where: { libraryId },
      });

      // 8. Delete Rows
      await tx.row.deleteMany({
        where: { libraryId },
      });

      // 9. Delete Rooms
      await tx.room.deleteMany({
        where: { libraryId },
      });

      // 10. Delete Subscriptions
      await tx.subscription.deleteMany({
        where: { libraryId },
      });

      // 11. Delete Push Subscriptions & App Notifications
      await tx.pushSubscriptionRecord.deleteMany({
        where: { libraryId },
      });
      await tx.appNotification.deleteMany({
        where: { libraryId },
      });

      // 12. Delete Library
      await tx.library.delete({
        where: { id: libraryId },
      });
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
