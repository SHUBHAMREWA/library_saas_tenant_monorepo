import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail, localLibraries } = body;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
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

    // Check existing libraries in DB
    const existingDbLibs = await prisma.library.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
        isActive: true,
      },
      include: {
        rooms: {
          where: { isActive: true },
          include: {
            rows: {
              where: { isActive: true },
              include: {
                seats: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
        students: {
          where: { isActive: true },
          include: {
            memberships: true,
            seatAssignments: { include: { seat: true } },
          },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
    });

    // If DB is empty, but local storage has libraries, migrate them into DB!
    if (existingDbLibs.length === 0 && Array.isArray(localLibraries) && localLibraries.length > 0) {
      console.log(`Migrating ${localLibraries.length} local libraries to database for ${cleanEmail}...`);

      for (const localLib of localLibraries) {
        const libId = crypto.randomUUID();
        const slug = `${(localLib.name || 'library').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;

        const createdLib = await prisma.library.create({
          data: {
            id: libId,
            ownerId: user.id,
            name: localLib.name || 'My Library',
            slug,
            contactPhone: localLib.contactPhone || '9999999999',
            address: localLib.address || null,
          },
        });

        // Migrate rooms, rows, seats
        const roomsToMigrate = localLib.rooms && localLib.rooms.length > 0
          ? localLib.rooms
          : [{ id: 'rm-1', name: 'Main Hall', rows: ['Row A', 'Row B'] }];

        for (const rm of roomsToMigrate) {
          const roomId = crypto.randomUUID();
          const createdRoom = await prisma.room.create({
            data: {
              id: roomId,
              libraryId: createdLib.id,
              name: rm.name || 'Main Hall',
            },
          });

          const rowsList = rm.rows && rm.rows.length > 0 ? rm.rows : ['Row A'];
          for (const rName of rowsList) {
            const rowId = crypto.randomUUID();
            const createdRow = await prisma.row.create({
              data: {
                id: rowId,
                libraryId: createdLib.id,
                roomId: createdRoom.id,
                name: rName,
              },
            });

            // Find seats for this row
            const matchingSeats = (localLib.seats || []).filter(
              (s: any) =>
                (s.rowName || '').toLowerCase().trim() === rName.toLowerCase().trim() ||
                (s.roomId === rm.id)
            );

            if (matchingSeats.length > 0) {
              const seatData = matchingSeats.map((st: any, idx: number) => ({
                id: crypto.randomUUID(),
                libraryId: createdLib.id,
                rowId: createdRow.id,
                seatNumber: st.seatNumber || `S-${idx + 1}`,
                status: (st.status || 'AVAILABLE') as any,
              }));
              await prisma.seat.createMany({ data: seatData });
            }
          }
        }
      }
    }

    // Now re-fetch canonical data from DB
    const finalDbLibs = await prisma.library.findMany({
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
        feeTransactions: {
          orderBy: { paymentDate: 'desc' },
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
              orderBy: { paymentDate: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedLibraries = finalDbLibs.map((lib) => {
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

      // Auto-cut / release seat allotment if expired or unpaid
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

        if (!hasPaidTx) {
          daysRemaining = 0;
          isExpired = true;
        } else if (activeMembership?.expectedEndDate) {
          const end = new Date(activeMembership.expectedEndDate);
          daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          isExpired = daysRemaining <= 0;
        } else {
          daysRemaining = 0;
          isExpired = true;
        }

        // Automatic seat cut/release if membership expired or unpaid
        let assignedSeatNumber: string | null = null;
        if (activeSeat?.seat) {
          if (!isExpired && daysRemaining > 0) {
            assignedSeatNumber = activeSeat.seat.seatNumber;
            const matchingSeat = allSeats.find(
              (s) => s.id === activeSeat.seat.id || s.seatNumber === activeSeat.seat.seatNumber
            );
            if (matchingSeat) {
              matchingSeat.status = 'OCCUPIED';
              matchingSeat.studentName = std.fullName;
              matchingSeat.shift = activeSeat.shift || activeMembership?.shift || 'FULL_DAY';
            }
          } else {
            // Cut seat allotment automatically
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

        const computedMonthlyFee = hasPaidTx
          ? Number(activeMembership?.feeAmount || studentTxList[0]?.amount || 0)
          : 0;

        return {
          id: std.id,
          fullName: std.fullName,
          phone: std.phone,
          seatNumber: assignedSeatNumber,
          status: (isExpired ? 'EXPIRED' : (activeMembership?.status || 'ACTIVE')) as 'ACTIVE' | 'EXPIRED' | 'PAUSED',
          membershipEndsInDays: daysRemaining,
          shift: activeMembership?.shift || 'FULL_DAY',
          studyPurpose: std.studyPurpose || undefined,
          photoUrl: std.photoUrl || undefined,
          kycPhotoUrl: std.kycPhotoUrl || undefined,
          kycDocId: std.kycDocId || undefined,
          kycType: std.kycDocType,
          monthlyFee: computedMonthlyFee,
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

      const formattedLibraryTransactions = ((lib as any).feeTransactions || []).map((t: any) => ({
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

    return NextResponse.json({ success: true, libraries: formattedLibraries });
  } catch (error: any) {
    console.error('API POST /api/libraries/sync-all error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
