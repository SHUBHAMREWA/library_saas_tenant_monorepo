import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ libraries: [] });
    }

    const libraries = await prisma.library.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
        isActive: true,
      },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
        rooms: {
          where: { isActive: true },
          include: {
            rows: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              include: {
                seats: {
                  where: { isActive: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        students: {
          where: { isActive: true },
          include: {
            memberships: {
              where: { status: 'ACTIVE' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            seatAssignments: {
              where: { status: 'ACTIVE' },
              include: { seat: true },
              take: 1,
            },
            feeTransactions: {
              orderBy: [
                { paymentDate: 'desc' },
                { createdAt: 'desc' },
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        feeTransactions: {
          orderBy: [
            { paymentDate: 'desc' },
            { createdAt: 'desc' },
          ],
          include: {
            student: {
              select: {
                fullName: true,
                phone: true,
                seatAssignments: {
                  where: { status: 'ACTIVE' },
                  include: { seat: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedLibraries = libraries.map((lib) => {
      // Collect seats
      const allSeats: any[] = [];
      const formattedRooms = lib.rooms.map((rm) => {
        const rowNames = rm.rows.map((rw) => rw.name);
        rm.rows.forEach((rw) => {
          rw.seats.forEach((st) => {
            allSeats.push({
              id: st.id,
              seatNumber: st.seatNumber,
              rowName: rw.name,
              status: st.status,
              studentName: null,
              roomId: rm.id,
            });
          });
        });
        return {
          id: rm.id,
          name: rm.name,
          rows: rowNames,
        };
      });

      // Sort all seats in natural numerical sequence
      allSeats.sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
      );

      // Format students & auto-cut seat allotment if expired or unpaid
      const seatsToRelease: string[] = [];
      const assignmentsToRelease: string[] = [];

      const formattedStudents = lib.students.map((std) => {
        const activeMembership = std.memberships[0];
        const activeSeat = std.seatAssignments[0];
        const now = new Date();

        const studentTxList = (std.feeTransactions || []).map((t) => ({
          id: t.id,
          studentId: t.studentId,
          studentName: std.fullName,
          studentPhone: std.phone,
          seatNumber: activeSeat?.seat?.seatNumber || null,
          amount: Number(t.amount),
          totalFee: t.totalFee ? Number(t.totalFee) : undefined,
          remainingFee: t.remainingFee ? Number(t.remainingFee) : undefined,
          validTo: t.validTo ? t.validTo.toISOString() : undefined,
          paidForMonth: t.paidForMonth,
          paymentDate: t.paymentDate.toISOString(),
          paymentMode: t.paymentMode,
          status: t.status,
          receiptNumber: t.receiptNumber || undefined,
          notes: t.notes || undefined,
        }));

        const hasPaidTx = studentTxList.length > 0;
        let daysRemaining = 0;
        let isExpired = false;

        if (activeMembership?.expectedEndDate) {
          const end = new Date(activeMembership.expectedEndDate);
          daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          isExpired = daysRemaining <= 0;
        } else if (hasPaidTx && studentTxList[0]?.validTo) {
          const end = new Date(studentTxList[0].validTo);
          daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          isExpired = daysRemaining <= 0;
        } else if (activeSeat) {
          daysRemaining = 30;
          isExpired = false;
        } else {
          daysRemaining = 0;
          isExpired = false;
        }

        // Automatic seat cut/release ONLY if membership duration has genuinely expired
        let assignedSeatNumber: string | null = null;
        if (activeSeat?.seat) {
          if (!isExpired) {
            assignedSeatNumber = activeSeat.seat.seatNumber;
            const matchingSeat = allSeats.find(
              (s) => s.id === activeSeat.seat.id || s.seatNumber === activeSeat.seat.seatNumber
            );
            if (matchingSeat) {
              matchingSeat.status = activeSeat.seat.status === 'RESERVED' ? 'RESERVED' : 'OCCUPIED';
              matchingSeat.studentName = std.fullName;
              matchingSeat.shift = activeSeat.shift || activeMembership?.shift || 'FULL_DAY';
            }
          } else {
            // Cut seat allotment automatically when duration has genuinely expired
            assignedSeatNumber = null;
            seatsToRelease.push(activeSeat.seat.id);
            assignmentsToRelease.push(activeSeat.id);
            const matchingSeat = allSeats.find(
              (s) => s.id === activeSeat.seat.id || s.seatNumber === activeSeat.seat.seatNumber
            );
            if (matchingSeat) {
              matchingSeat.status = 'AVAILABLE';
              matchingSeat.studentName = null;
              matchingSeat.shift = undefined;
            }
          }
        }

        // Group transactions by billing month/period to compute true remaining due & month totals
        const monthAmountsMap = new Map<string, number>();
        const monthLatestTxMap = new Map<string, (typeof studentTxList)[0]>();
        let maxRecordedTotalFee = 0;

        studentTxList.forEach((tx) => {
          const key = tx.paidForMonth.trim().toLowerCase();
          monthAmountsMap.set(key, (monthAmountsMap.get(key) || 0) + Number(tx.amount || 0));
          if (!monthLatestTxMap.has(key)) {
            monthLatestTxMap.set(key, tx);
          }
          if (tx.totalFee && Number(tx.totalFee) > maxRecordedTotalFee) {
            maxRecordedTotalFee = Number(tx.totalFee);
          }
        });

        let totalRemainingDue = 0;
        let highestMonthPaymentSum = 0;

        monthLatestTxMap.forEach((tx, key) => {
          if (tx.remainingFee && tx.remainingFee > 0) {
            totalRemainingDue += Number(tx.remainingFee);
          }
          const paidInThisMonth = monthAmountsMap.get(key) || 0;
          if (paidInThisMonth > highestMonthPaymentSum) {
            highestMonthPaymentSum = paidInThisMonth;
          }
        });

        // The true agreed monthly fee rate:
        // Priority 1: activeMembership.feeAmount (if genuine plan amount > 0)
        // Priority 2: Highest totalFee declared across transactions
        // Priority 3: Total sum paid in a single month (e.g. 1000 + 200 = 1200)
        // Default: 1000
        const membershipPlanFee = activeMembership?.feeAmount ? Number(activeMembership.feeAmount) : 0;
        const computedMonthlyFee = membershipPlanFee > 0
          ? membershipPlanFee
          : Math.max(maxRecordedTotalFee, highestMonthPaymentSum, 1000);

        const studentRemainingFee = hasPaidTx
          ? totalRemainingDue
          : !assignedSeatNumber
          ? 0
          : computedMonthlyFee;

        return {
          id: std.id,
          fullName: std.fullName,
          phone: std.phone,
          seatNumber: assignedSeatNumber,
          status: (!assignedSeatNumber ? 'INACTIVE' : (isExpired ? 'EXPIRED' : (activeMembership?.status || 'ACTIVE'))) as 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'INACTIVE',
          membershipEndsInDays: daysRemaining,
          shift: activeMembership?.shift || 'FULL_DAY',
          studyPurpose: std.studyPurpose || undefined,
          photoUrl: std.photoUrl || undefined,
          kycPhotoUrl: std.kycPhotoUrl || undefined,
          kycDocId: std.kycDocId || undefined,
          kycType: std.kycDocType,
          monthlyFee: computedMonthlyFee,
          totalFee: computedMonthlyFee,
          remainingFee: studentRemainingFee,
          transactions: studentTxList,
        };
      });

      // Asynchronously release cut seats in database
      if (seatsToRelease.length > 0) {
        prisma.seat.updateMany({
          where: { id: { in: seatsToRelease } },
          data: { status: 'AVAILABLE' },
        }).catch(() => {});
      }
      if (assignmentsToRelease.length > 0) {
        prisma.seatAssignment.updateMany({
          where: { id: { in: assignmentsToRelease } },
          data: { status: 'RELEASED' },
        }).catch(() => {});
      }

      const formattedLibraryTransactions = (lib.feeTransactions || []).map((t) => ({
        id: t.id,
        studentId: t.studentId,
        studentName: t.student?.fullName || 'Student',
        studentPhone: t.student?.phone || '',
        seatNumber: t.student?.seatAssignments?.[0]?.seat?.seatNumber || null,
        amount: Number(t.amount),
        paidForMonth: t.paidForMonth,
        paymentDate: t.paymentDate.toISOString(),
        paymentMode: t.paymentMode,
        status: t.status,
        receiptNumber: t.receiptNumber || undefined,
        notes: t.notes || undefined,
      }));

      const latestSub = (lib as any).subscriptions?.[0];
      const now = new Date();
      const hasActiveSub = Boolean(
        latestSub &&
        (latestSub.status === 'ACTIVE' || latestSub.status === 'MANUAL') &&
        new Date(latestSub.endDate).getTime() > now.getTime()
      );
      const subDaysRemaining = latestSub
        ? Math.max(0, Math.ceil((new Date(latestSub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      const formattedSubscription = latestSub
        ? {
            id: latestSub.id,
            planCode: latestSub.plan?.code || 'PRO',
            planName: latestSub.plan?.name || 'Pro Plan',
            status: hasActiveSub ? 'ACTIVE' : 'EXPIRED',
            startDate: latestSub.startDate.toISOString().split('T')[0],
            endDate: latestSub.endDate.toISOString().split('T')[0],
            daysRemaining: subDaysRemaining,
          }
        : null;

      return {
        id: lib.id,
        name: lib.name,
        contactPhone: lib.contactPhone,
        address: lib.address || undefined,
        rooms: formattedRooms,
        seats: allSeats,
        students: formattedStudents,
        feeTransactions: formattedLibraryTransactions,
        createdAt: lib.createdAt.toISOString(),
        hasActiveSubscription: hasActiveSub,
        subscription: formattedSubscription,
      };
    });

    return NextResponse.json({ libraries: formattedLibraries });
  } catch (error: any) {
    console.error('API GET /api/libraries error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail, name, contactPhone, address } = body;

    if (!userEmail || !name) {
      return NextResponse.json({ error: 'User email and library name are required' }, { status: 400 });
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {},
      create: {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
      },
    });

    const libId = crypto.randomUUID();
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    // Create Library with initial Main Hall room and Row A & B
    const newLib = await prisma.library.create({
      data: {
        id: libId,
        ownerId: user.id,
        name: name.trim(),
        slug,
        contactPhone: contactPhone?.trim() || '9999999999',
        address: address?.trim() || null,
      },
    });

    const defaultRoomId = crypto.randomUUID();
    const defaultRoom = await prisma.room.create({
      data: {
        id: defaultRoomId,
        libraryId: newLib.id,
        name: 'Main Hall',
      },
    });

    await prisma.row.createMany({
      data: [
        { id: crypto.randomUUID(), libraryId: newLib.id, roomId: defaultRoomId, name: 'Row A' },
        { id: crypto.randomUUID(), libraryId: newLib.id, roomId: defaultRoomId, name: 'Row B' },
      ],
    });

    return NextResponse.json({
      success: true,
      library: {
        id: newLib.id,
        name: newLib.name,
        contactPhone: newLib.contactPhone,
        address: newLib.address || undefined,
        rooms: [{ id: defaultRoom.id, name: defaultRoom.name, rows: ['Row A', 'Row B'] }],
        seats: [],
        students: [],
        createdAt: newLib.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('API POST /api/libraries error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
