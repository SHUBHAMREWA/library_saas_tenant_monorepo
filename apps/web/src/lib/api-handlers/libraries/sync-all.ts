import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function handleSyncAll(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0],
        },
      });
    }

    const finalDbLibs = await prisma.library.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { owner: { email: { equals: cleanEmail, mode: 'insensitive' } } },
          { contactEmail: { equals: cleanEmail, mode: 'insensitive' } },
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
                  include: {
                    seat: {
                      include: {
                        row: {
                          include: {
                            room: true,
                          },
                        },
                      },
                    },
                  },
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
              include: {
                seat: {
                  include: {
                    row: {
                      include: {
                        room: true,
                      },
                    },
                  },
                },
              },
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

    const userSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'MANUAL'] },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
      take: 1,
    });
    const latestUserSub = userSubscriptions[0] || null;

    const formattedLibraries = finalDbLibs.map((lib) => {
      const allSeats: any[] = [];
      const seenSeatKeys = new Set<string>();
      const phantomOccupiedSeatsToFix: string[] = [];

      const formattedRooms = lib.rooms.map((rm) => {
        const uniqueRowNames = Array.from(new Set(rm.rows.map((rw) => rw.name.trim())));
        rm.rows.forEach((rw) => {
          rw.seats.forEach((st) => {
            const seatKey = `${rm.id}_${rw.name.trim().toLowerCase()}_${st.seatNumber.trim().toLowerCase()}`;
            if (seenSeatKeys.has(seatKey)) {
              return;
            }
            seenSeatKeys.add(seatKey);

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

            let seatStatus = st.status;
            if (activeOccupants.length > 0) {
              seatStatus = st.status === 'RESERVED' ? 'RESERVED' : 'OCCUPIED';
            } else if (st.status === 'OCCUPIED') {
              seatStatus = 'AVAILABLE';
              phantomOccupiedSeatsToFix.push(st.id);
            }

            allSeats.push({
              id: st.id,
              seatNumber: st.seatNumber,
              rowName: rw.name,
              status: seatStatus,
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
          rows: uniqueRowNames,
        };
      });

      allSeats.sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
      );

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

        let latestValidEndDate: Date | null = null;
        for (const tx of studentTxList) {
          if (tx.validTo) {
            const d = new Date(tx.validTo);
            if (!isNaN(d.getTime()) && (!latestValidEndDate || d > latestValidEndDate)) {
              latestValidEndDate = d;
            }
          }
        }
        if (activeMembership?.expectedEndDate && (activeMembership.status === 'ACTIVE' || activeSeat)) {
          const d = new Date(activeMembership.expectedEndDate);
          if (!isNaN(d.getTime()) && (!latestValidEndDate || d > latestValidEndDate)) {
            latestValidEndDate = d;
          }
        }

        if (latestValidEndDate) {
          daysRemaining = Math.max(0, Math.ceil((latestValidEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          isExpired = daysRemaining <= 0;
        } else if (activeSeat) {
          daysRemaining = 30;
          isExpired = false;
        } else {
          daysRemaining = 0;
          isExpired = false;
        }

        let assignedSeatNumber: string | null = null;
        let lastAssignedSeatNumber: string | null = null;
        if (activeSeat?.seat) {
          const matchingSeat = allSeats.find((s) => s.id === activeSeat.seat.id);
          if (!isExpired) {
            assignedSeatNumber = activeSeat.seat.seatNumber;
            if (matchingSeat) {
              matchingSeat.status = activeSeat.seat.status === 'RESERVED' ? 'RESERVED' : 'OCCUPIED';
              if (!matchingSeat.occupants || matchingSeat.occupants.length <= 1) {
                matchingSeat.studentName = std.fullName;
                matchingSeat.shift = activeSeat.shift || activeMembership?.shift || 'FULL_DAY';
              }
            }
          } else {
            assignedSeatNumber = null;
            lastAssignedSeatNumber = activeSeat.seat.seatNumber;
            assignmentsToRelease.push(activeSeat.id);

            if (matchingSeat) {
              matchingSeat.occupants = (matchingSeat.occupants || []).filter(
                (o: any) => o.studentId !== std.id
              );

              if (matchingSeat.occupants.length === 0) {
                matchingSeat.status = 'AVAILABLE';
                matchingSeat.studentName = null;
                matchingSeat.shift = undefined;
                seatsToRelease.push(activeSeat.seat.id);
              } else {
                matchingSeat.status = 'OCCUPIED';
                matchingSeat.studentName =
                  matchingSeat.occupants.length === 1
                    ? matchingSeat.occupants[0].studentName
                    : matchingSeat.occupants.map((o: any) => `${o.studentName} (${(o.shift || 'F').charAt(0)})`).join(' • ');
                matchingSeat.shift =
                  matchingSeat.occupants.length === 1
                    ? matchingSeat.occupants[0].shift
                    : 'SHARED';
              }
            }
          }
        }

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

        const previousSeatNumber = (!assignedSeatNumber && candidatePreviousSeat && inactiveDays <= 30)
          ? candidatePreviousSeat
          : null;

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
          : 0;

        const studentRemainingFee = hasPaidTx
          ? totalRemainingDue
          : !assignedSeatNumber
          ? 0
          : computedMonthlyFee;

        let stayDuration: 'FOUR_HOURS' | 'HALF_DAY' | 'FULL_DAY' | undefined = undefined;
        let normalizedShift: string = '';

        if (hasPaidTx || assignedSeatNumber) {
          const rawShift = activeSeat?.shift || (activeMembership?.status === 'ACTIVE' ? activeMembership?.shift : undefined);
          if (rawShift === 'FOUR_HOURS') {
            stayDuration = 'FOUR_HOURS';
          } else if (rawShift === 'HALF_DAY') {
            stayDuration = 'HALF_DAY';
          } else if (rawShift === 'FULL_DAY') {
            stayDuration = 'FULL_DAY';
          } else if (rawShift === 'MORNING' || rawShift === 'EVENING') {
            const noteText = (studentTxList[0]?.notes || '').toUpperCase();
            if (noteText.includes('HALF_DAY') || noteText.includes('HALF DAY') || noteText.includes('6-8')) {
              stayDuration = 'HALF_DAY';
            } else {
              stayDuration = 'FOUR_HOURS';
            }
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

          if (rawShift === 'MORNING' || rawShift === 'EVENING' || rawShift === 'FULL_DAY') {
            normalizedShift = rawShift;
          } else if (rawShift === 'FOUR_HOURS' || rawShift === 'HALF_DAY') {
            normalizedShift = 'MORNING';
          } else {
            normalizedShift = assignedSeatNumber ? 'FULL_DAY' : '';
          }
        }

        return {
          id: std.id,
          fullName: std.fullName,
          phone: std.phone,
          seatId: activeSeat?.seat?.id || null,
          seatNumber: assignedSeatNumber,
          roomId: activeSeat?.seat?.row?.roomId || null,
          roomName: activeSeat?.seat?.row?.room?.name || null,
          rowName: activeSeat?.seat?.row?.name || null,
          previousSeatNumber,
          inactiveDays,
          stayDuration,
          status: (!assignedSeatNumber && (!hasPaidTx || isExpired || daysRemaining <= 0) ? 'INACTIVE' : (isExpired ? 'EXPIRED' : (activeMembership?.status || 'ACTIVE'))) as 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'INACTIVE',
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

      const allSeatsToSetAvailable = [...seatsToRelease, ...phantomOccupiedSeatsToFix];
      if (allSeatsToSetAvailable.length > 0) {
        prisma.seat.updateMany({
          where: { id: { in: allSeatsToSetAvailable } },
          data: { status: 'AVAILABLE' },
        }).catch(() => {});
      }
      if (assignmentsToRelease.length > 0) {
        prisma.seatAssignment.updateMany({
          where: { id: { in: assignmentsToRelease } },
          data: { status: 'RELEASED' },
        }).catch(() => {});
      }

      const latestSub = (lib as any).subscriptions?.[0] || latestUserSub;
      const now = new Date();
      let hasActiveSub = false;
      let subDaysRemaining = 0;

      if (latestSub) {
        const subEndDate = new Date(latestSub.endDate);
        subEndDate.setHours(23, 59, 59, 999);
        hasActiveSub = Boolean(
          (latestSub.status === 'ACTIVE' || latestSub.status === 'MANUAL') &&
          subEndDate.getTime() >= now.getTime()
        );
        subDaysRemaining = Math.max(0, Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

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