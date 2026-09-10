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

    // If DB is empty and user is demo user, auto-seed demo library with 2 halls, 30 seats, and 7 students
    if (existingDbLibs.length === 0 && cleanEmail === 'rahul.owner@seelibrary.io') {
      console.log(`Auto-seeding demo library for ${cleanEmail}...`);
      let proPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'PRO' } });
      if (!proPlan) {
        proPlan = await prisma.subscriptionPlan.create({
          data: {
            id: crypto.randomUUID(),
            code: 'PRO',
            name: 'Pro Multi-Branch Plan',
            priceMonthly: 1499,
            priceYearly: 14999,
            maxSeats: 250,
            maxLibraries: 5,
            isActive: true,
          },
        });
      }

      const library = await prisma.library.create({
        data: {
          id: crypto.randomUUID(),
          ownerId: user.id,
          name: 'Apex Study Center & Library',
          slug: `apex-study-center-demo-${Date.now().toString(36)}`,
          contactPhone: '9876543210',
          address: 'Plot 42, Knowledge Park III, Near Metro Station, Delhi NCR',
          isActive: true,
        },
      });

      const subStart = new Date();
      const subEnd = new Date();
      subEnd.setDate(subEnd.getDate() + 365);
      await prisma.subscription.create({
        data: {
          id: crypto.randomUUID(),
          libraryId: library.id,
          userId: user.id,
          planId: proPlan.id,
          status: 'ACTIVE',
          startDate: subStart,
          endDate: subEnd,
        },
      });

      const room1 = await prisma.room.create({
        data: { id: crypto.randomUUID(), libraryId: library.id, name: 'Ground Floor - Silent Study Hall', isActive: true },
      });
      const row1A = await prisma.row.create({ data: { id: crypto.randomUUID(), libraryId: library.id, roomId: room1.id, name: 'Row A' } });
      const row1B = await prisma.row.create({ data: { id: crypto.randomUUID(), libraryId: library.id, roomId: room1.id, name: 'Row B' } });
      const row1C = await prisma.row.create({ data: { id: crypto.randomUUID(), libraryId: library.id, roomId: room1.id, name: 'Row C' } });

      const room2 = await prisma.room.create({
        data: { id: crypto.randomUUID(), libraryId: library.id, name: 'First Floor - Premium AC Hall', isActive: true },
      });
      const row2A = await prisma.row.create({ data: { id: crypto.randomUUID(), libraryId: library.id, roomId: room2.id, name: 'Row A' } });
      const row2B = await prisma.row.create({ data: { id: crypto.randomUUID(), libraryId: library.id, roomId: room2.id, name: 'Row B' } });
      const row2C = await prisma.row.create({ data: { id: crypto.randomUUID(), libraryId: library.id, roomId: room2.id, name: 'Row C' } });

      const seatMap = new Map<number, any>();
      const r1Rows = [
        { row: row1A, seats: [1, 2, 3, 4, 5] },
        { row: row1B, seats: [6, 7, 8, 9, 10] },
        { row: row1C, seats: [11, 12, 13, 14, 15] },
      ];
      for (const { row, seats } of r1Rows) {
        for (const num of seats) {
          const seat = await prisma.seat.create({
            data: { id: crypto.randomUUID(), libraryId: library.id, rowId: row.id, seatNumber: String(num), status: 'AVAILABLE' },
          });
          seatMap.set(num, seat);
        }
      }

      const r2Rows = [
        { row: row2A, seats: [16, 17, 18, 19, 20] },
        { row: row2B, seats: [21, 22, 23, 24, 25] },
        { row: row2C, seats: [26, 27, 28, 29, 30] },
      ];
      for (const { row, seats } of r2Rows) {
        for (const num of seats) {
          const seat = await prisma.seat.create({
            data: { id: crypto.randomUUID(), libraryId: library.id, rowId: row.id, seatNumber: String(num), status: 'AVAILABLE' },
          });
          seatMap.set(num, seat);
        }
      }

      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setDate(nextMonth.getDate() + 25);
      const expiringSoonDate = new Date(today);
      expiringSoonDate.setDate(expiringSoonDate.getDate() + 3);
      const expiredDate = new Date(today);
      expiredDate.setDate(expiredDate.getDate() - 2);

      const demoStudents = [
        { fullName: 'Aman Verma', phone: '9811223344', seatNum: 1, shift: 'FULL_DAY' as const, fee: 1200, end: nextMonth, goal: 'UPSC Civil Services Examination', paidMonth: 'September 2026', mode: 'UPI' },
        { fullName: 'Priya Patel', phone: '9822334455', seatNum: 6, shift: 'MORNING' as const, fee: 800, end: nextMonth, goal: 'NEET PG Preparation', paidMonth: 'September 2026', mode: 'CASH' },
        { fullName: 'Rohan Sharma', phone: '9833445566', seatNum: 11, shift: 'EVENING' as const, fee: 800, end: nextMonth, goal: 'Chartered Accountancy (CA Final)', paidMonth: 'September 2026', mode: 'UPI' },
        { fullName: 'Neha Gupta', phone: '9844556677', seatNum: 16, shift: 'FULL_DAY' as const, fee: 1200, end: expiringSoonDate, goal: 'SSC CGL & Banking', paidMonth: 'August 2026', mode: 'UPI' },
        { fullName: 'Vikas Singh', phone: '9855667788', seatNum: 21, shift: 'MORNING' as const, fee: 500, end: expiredDate, goal: 'GATE Computer Science', paidMonth: 'July 2026', mode: 'CASH' },
        { fullName: 'Anjali Tiwari', phone: '9866778899', seatNum: 2, shift: 'EVENING' as const, fee: 800, end: nextMonth, goal: 'State Public Service Commission', paidMonth: 'September 2026', mode: 'UPI' },
        { fullName: 'Deepak Kumar', phone: '9877889900', seatNum: 7, shift: 'FULL_DAY' as const, fee: 1200, end: nextMonth, goal: 'CAT MBA Entrance', paidMonth: 'September 2026', mode: 'UPI' },
      ];

      for (const sData of demoStudents) {
        const student = await prisma.student.create({
          data: { id: crypto.randomUUID(), libraryId: library.id, fullName: sData.fullName, phone: sData.phone, studyPurpose: sData.goal, isActive: true },
        });
        const membership = await prisma.membership.create({
          data: { id: crypto.randomUUID(), libraryId: library.id, studentId: student.id, status: 'ACTIVE', feeAmount: sData.fee, shift: sData.shift, startDate: today, expectedEndDate: sData.end },
        });
        const seat = seatMap.get(sData.seatNum);
        if (seat) {
          await prisma.seatAssignment.create({
            data: { id: crypto.randomUUID(), libraryId: library.id, studentId: student.id, seatId: seat.id, membershipId: membership.id, shift: sData.shift, startDate: today, status: 'ACTIVE' },
          });
          await prisma.seat.update({ where: { id: seat.id }, data: { status: 'OCCUPIED' } });
        }
        await prisma.studentFeeTransaction.create({
          data: {
            id: crypto.randomUUID(),
            libraryId: library.id,
            studentId: student.id,
            membershipId: membership.id,
            amount: sData.fee,
            paidForMonth: sData.paidMonth,
            paymentMode: sData.mode,
            receiptNumber: `REC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
            notes: `Demo fee collected for ${sData.paidMonth}`,
            createdAt: new Date(),
          },
        });
      }
    }

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
                  include: {
                    seatAssignments: {
                      where: { status: 'ACTIVE' },
                      include: {
                        student: { select: { id: true, fullName: true, phone: true } },
                      },
                    },
                  },
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
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            seatAssignments: {
              orderBy: { createdAt: 'desc' },
              include: { seat: true },
              take: 5,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedLibraries = finalDbLibs.map((lib) => {
      const allSeats: any[] = [];
      const formattedRooms = lib.rooms.map((rm) => {
        const rowNames = rm.rows.map((rw) => rw.name);
        rm.rows.forEach((rw) => {
          rw.seats.forEach((st) => {
            const activeOccupants = (st.seatAssignments || [])
              .filter((sa: any) => sa.status === 'ACTIVE' && sa.student && sa.student.fullName)
              .map((sa: any) => ({
                studentId: sa.student.id,
                studentName: sa.student.fullName,
                phone: sa.student.phone,
                shift: sa.shift || 'FULL_DAY',
              }));

            let mainName: string | null = null;
            let mainShift: string | undefined = undefined;

            if (activeOccupants.length === 1) {
              mainName = activeOccupants[0].studentName;
              mainShift = activeOccupants[0].shift;
            } else if (activeOccupants.length > 1) {
              mainName = activeOccupants.map((o: any) => `${o.studentName} (${o.shift.charAt(0)})`).join(' • ');
              mainShift = 'SHARED';
            }

            allSeats.push({
              id: st.id,
              seatNumber: st.seatNumber,
              rowName: rw.name,
              status: activeOccupants.length > 0 ? (st.status === 'RESERVED' ? 'RESERVED' : 'OCCUPIED') : st.status,
              studentName: mainName,
              shift: mainShift,
              occupants: activeOccupants,
              roomId: rm.id,
              hasLocker: st.hasLocker || rw.hasLocker || false,
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
        const activeMembership = std.memberships.find((m) => m.status === 'ACTIVE') || std.memberships[0];
        const activeSeat = std.seatAssignments.find((sa) => sa.status === 'ACTIVE');
        const now = new Date();

        const studentTxList = (std.feeTransactions || []).map((t) => ({
          id: t.id,
          studentId: t.studentId,
          studentName: std.fullName,
          studentPhone: std.phone,
          seatNumber: activeSeat?.seat?.seatNumber || null,
          amount: Number(t.amount),
          totalFee: t.totalFee ? Number(t.totalFee) : Number(t.amount),
          remainingFee: t.remainingFee ? Number(t.remainingFee) : 0,
          validFrom: t.validFrom ? t.validFrom.toISOString() : undefined,
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
        let lastAssignedSeatNumber: string | null = null;
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
            lastAssignedSeatNumber = activeSeat.seat.seatNumber;
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

        // Determine candidate previous seat and inactive days for re-enrollment
        let candidatePreviousSeat = lastAssignedSeatNumber;
        if (!candidatePreviousSeat) {
          const historicalAssignment = std.seatAssignments.find((sa) => sa.seat?.seatNumber);
          if (historicalAssignment?.seat?.seatNumber) {
            candidatePreviousSeat = historicalAssignment.seat.seatNumber;
          }
        }

        let inactiveDays = 0;
        let lastActiveDate: Date | null = null;
        if (activeMembership?.expectedEndDate) {
          lastActiveDate = new Date(activeMembership.expectedEndDate);
        } else if (studentTxList.length > 0) {
          const latestTx = studentTxList[0];
          if (latestTx.validTo) {
            lastActiveDate = new Date(latestTx.validTo);
          } else if (latestTx.paymentDate) {
            const pDate = new Date(latestTx.paymentDate);
            pDate.setDate(pDate.getDate() + 30);
            lastActiveDate = pDate;
          }
        }

        if (lastActiveDate && lastActiveDate.getTime() < now.getTime()) {
          inactiveDays = Math.max(0, Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (!assignedSeatNumber && !lastActiveDate) {
          inactiveDays = 999;
        }

        // Rule: If inactive for <= 30 days, suggest old seat. If > 30 days (e.g. 2 months), do not suggest.
        const previousSeatNumber = (!assignedSeatNumber && candidatePreviousSeat && inactiveDays <= 30)
          ? candidatePreviousSeat
          : null;

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

        // The true agreed monthly fee rate (respects student's custom monthly enrollment rate e.g. ₹500, ₹600)
        const latestTx = studentTxList[0];
        const latestTxFee = latestTx?.totalFee ? Number(latestTx.totalFee) : (latestTx?.amount ? Number(latestTx.amount) : 0);
        const membershipPlanFee = activeMembership?.feeAmount ? Number(activeMembership.feeAmount) : 0;
        const computedMonthlyFee = latestTxFee > 0
          ? latestTxFee
          : membershipPlanFee > 0
          ? membershipPlanFee
          : maxRecordedTotalFee > 0
          ? maxRecordedTotalFee
          : highestMonthPaymentSum > 0
          ? highestMonthPaymentSum
          : 0; // No default fee — student must be enrolled+fee paid first

        const studentRemainingFee = hasPaidTx
          ? totalRemainingDue
          : !assignedSeatNumber
          ? 0
          : computedMonthlyFee;

        // Determine stay duration and normalized shift strictly based on enrollment/seat
        let stayDuration: 'FOUR_HOURS' | 'HALF_DAY' | 'FULL_DAY' | undefined = undefined;
        let normalizedShift: string = '';

        if (hasPaidTx || assignedSeatNumber) {
          const rawShift = activeMembership?.shift;
          if (rawShift === 'FOUR_HOURS') {
            stayDuration = 'FOUR_HOURS';
          } else if (rawShift === 'HALF_DAY') {
            stayDuration = 'HALF_DAY';
          } else if (rawShift === 'FULL_DAY') {
            stayDuration = 'FULL_DAY';
          } else {
            const noteText = (studentTxList[0]?.notes || '').toUpperCase();
            if (noteText.includes('FOUR_HOURS') || noteText.includes('4 HOUR') || noteText.includes('4-HOUR')) {
              stayDuration = 'FOUR_HOURS';
            } else if (noteText.includes('HALF_DAY') || noteText.includes('HALF DAY') || noteText.includes('6-8')) {
              stayDuration = 'HALF_DAY';
            } else {
              stayDuration = 'FOUR_HOURS';
            }
          }

          normalizedShift = activeMembership?.shift || (assignedSeatNumber ? 'FULL_DAY' : '');
          if (normalizedShift === 'FOUR_HOURS' || normalizedShift === 'HALF_DAY') {
            normalizedShift = 'MORNING';
          }
        }

        return {
          id: std.id,
          fullName: std.fullName,
          phone: std.phone,
          seatNumber: assignedSeatNumber,
          previousSeatNumber,
          inactiveDays,
          stayDuration,
          status: (!assignedSeatNumber ? 'INACTIVE' : (isExpired ? 'EXPIRED' : (activeMembership?.status || 'ACTIVE'))) as 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'INACTIVE',
          membershipEndsInDays: daysRemaining,
          shift: normalizedShift,
          studyPurpose: std.studyPurpose || undefined,
          photoUrl: std.photoUrl || undefined,
          kycPhotoUrl: std.kycPhotoUrl || undefined,
          kycDocId: std.kycDocId || undefined,
          kycType: std.kycDocType,
          monthlyFee: computedMonthlyFee,
          remainingFee: studentRemainingFee,
          totalFee: computedMonthlyFee,
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
        totalFee: t.totalFee ? Number(t.totalFee) : Number(t.amount),
        remainingFee: t.remainingFee ? Number(t.remainingFee) : 0,
        validFrom: t.validFrom ? t.validFrom.toISOString() : undefined,
        validTo: t.validTo ? t.validTo.toISOString() : undefined,
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
