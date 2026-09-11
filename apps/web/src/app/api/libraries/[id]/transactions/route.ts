import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;

    const callerEmail = (req.headers.get('x-user-email') || req.headers.get('x-admin-email'))?.toLowerCase().trim();
    const configuredAdmin = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    let isSuperAdmin = Boolean(configuredAdmin && callerEmail === configuredAdmin);
    if (!isSuperAdmin && callerEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: callerEmail } });
      isSuperAdmin = dbUser?.role === 'SUPER_ADMIN';
    }

    if (!isSuperAdmin) {
      const activeSub = await prisma.subscription.findFirst({
        where: {
          libraryId,
          status: { in: ['ACTIVE', 'MANUAL'] },
          endDate: { gt: new Date() },
        },
      });

      if (!activeSub) {
        return NextResponse.json({
          success: true,
          subscriptionRequired: true,
          transactions: [],
          message: 'Active SaaS subscription required to access the Fee Ledger.',
        });
      }
    }

    const transactions = await prisma.studentFeeTransaction.findMany({
      where: { libraryId },
      include: {
        student: {
          include: {
            seatAssignments: {
              where: { status: 'ACTIVE' },
              include: { seat: true },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { paymentDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const formatted = transactions.map((t) => ({
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

    return NextResponse.json({ success: true, transactions: formatted });
  } catch (error: any) {
    console.error('API GET /api/libraries/[id]/transactions error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await req.json();
    const {
      studentId,
      amount,
      totalFee,
      remainingFee,
      validFrom,
      validTo,
      paidForMonth,
      paymentMode,
      paymentDate,
      notes,
      extendDays,
      shift,
      stayDuration,
      isSettlingDue,
    } = body;

    if (!studentId || amount === undefined || !paidForMonth) {
      return NextResponse.json(
        { error: 'studentId, amount, and paidForMonth are required' },
        { status: 400 }
      );
    }

    // Subscription Guard: Check if library has active subscription or caller is super admin
    const callerEmail = (req.headers.get('x-user-email') || req.headers.get('x-admin-email'))?.toLowerCase().trim();
    const configuredAdmin = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    let isSuperAdmin = Boolean(configuredAdmin && callerEmail === configuredAdmin);
    if (!isSuperAdmin && callerEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: callerEmail } });
      isSuperAdmin = dbUser?.role === 'SUPER_ADMIN';
    }

    if (!isSuperAdmin) {
      const activeSub = await prisma.subscription.findFirst({
        where: {
          libraryId,
          status: { in: ['ACTIVE', 'MANUAL'] },
          endDate: { gt: new Date() },
        },
      });

      if (!activeSub) {
        return NextResponse.json(
          {
            error: 'Active SaaS subscription required to collect student fees. Please upgrade your plan in Branch Settings.',
            code: 'SUBSCRIPTION_REQUIRED',
          },
          { status: 403 }
        );
      }
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
      include: {
        memberships: {
          // Include ACTIVE, PAUSED, or EXPIRED memberships — allows re-enrollment renewal
          where: { status: { in: ['ACTIVE', 'PAUSED', 'EXPIRED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        seatAssignments: {
          where: { status: 'ACTIVE' },
          include: { seat: true },
          take: 1,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found in this library' }, { status: 404 });
    }

    let activeMembership = student.memberships[0];
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();

    // If student has no membership record at all, create an active one
    if (!activeMembership) {
      const parsedStart = validFrom ? new Date(validFrom) : parsedPaymentDate;
      const parsedEnd = validTo ? new Date(validTo) : new Date(parsedStart.getTime() + 30 * 86400000);
      activeMembership = await prisma.membership.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          studentId: student.id,
          startDate: parsedStart,
          expectedEndDate: parsedEnd,
          status: 'ACTIVE',
          feeAmount: totalFee !== undefined ? Number(totalFee) : Number(amount),
          shift: (shift || 'FULL_DAY') as any,
        },
      });
    }

    const transaction = await prisma.studentFeeTransaction.create({
      data: {
        id: crypto.randomUUID(),
        libraryId,
        studentId: student.id,
        membershipId: activeMembership?.id || null,
        amount: Number(amount),
        totalFee: totalFee !== undefined ? Number(totalFee) : Number(amount),
        remainingFee: remainingFee !== undefined ? Number(remainingFee) : 0,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        paidForMonth: paidForMonth.trim(),
        paymentDate: parsedPaymentDate,
        paymentMode: paymentMode || 'UPI',
        status: (remainingFee !== undefined && Number(remainingFee) > 0) ? 'PARTIAL' : 'PAID',
        receiptNumber,
        notes: notes?.trim() || null,
      },
    });

    // When settling a due or recording a payment that clears a month's dues,
    // update previous partial transactions for this month/student so their remainingFee is reduced/cleared
    if (isSettlingDue || (remainingFee !== undefined && Number(remainingFee) === 0)) {
      try {
        let pendingTxs = await prisma.studentFeeTransaction.findMany({
          where: {
            studentId: student.id,
            libraryId,
            id: { not: transaction.id },
            remainingFee: { gt: 0 },
            ...(paidForMonth ? { paidForMonth: paidForMonth.trim() } : {}),
          },
          orderBy: { createdAt: 'asc' },
        });

        if (pendingTxs.length === 0 && isSettlingDue) {
          pendingTxs = await prisma.studentFeeTransaction.findMany({
            where: {
              studentId: student.id,
              libraryId,
              id: { not: transaction.id },
              remainingFee: { gt: 0 },
            },
            orderBy: { createdAt: 'asc' },
          });
        }

        let credit = Number(amount);
        for (const pTx of pendingTxs) {
          if (credit <= 0) break;
          const curRem = Number(pTx.remainingFee || 0);
          const reduction = Math.min(curRem, credit);
          const updatedRem = curRem - reduction;
          credit -= reduction;

          await prisma.studentFeeTransaction.update({
            where: { id: pTx.id },
            data: {
              remainingFee: updatedRem,
              status: updatedRem === 0 ? 'PAID' : 'PARTIAL',
            },
          });
        }
      } catch (err) {
        console.error('Failed to update pending prior transactions:', err);
      }
    }

    let newDaysRemaining: number | undefined;

    // Extend membership validity if requested & update membership fee amount + shift
    if (activeMembership) {
      const daysToAdd = extendDays !== undefined ? Number(extendDays) : 30;
      let newEndDate = validTo && daysToAdd > 0 ? new Date(validTo) : activeMembership.expectedEndDate;
      if (!validTo && daysToAdd > 0) {
        const currentEnd = new Date(activeMembership.expectedEndDate);
        const now = new Date();
        const baseDate = currentEnd > now ? currentEnd : now;
        newEndDate = new Date(baseDate);
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);
      }

      if (newEndDate) {
        const now = new Date();
        newDaysRemaining = Math.max(
          0,
          Math.ceil((new Date(newEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
      }

      const effectiveFeeAmount = isSettlingDue
        ? Number(activeMembership.feeAmount || totalFee || amount)
        : (totalFee !== undefined && Number(totalFee) > 0 ? Number(totalFee) : Number(amount));

      await prisma.membership.update({
        where: { id: activeMembership.id },
        data: {
          ...(daysToAdd > 0 && newEndDate ? { expectedEndDate: newEndDate } : {}),
          ...(isSettlingDue ? {} : { feeAmount: effectiveFeeAmount }),
          ...(shift ? { shift: shift as any } : {}),
          status: 'ACTIVE',
        },
      });
    }

    // Also update any active seat assignment's shift
    if (shift) {
      await prisma.seatAssignment.updateMany({
        where: { studentId: student.id, libraryId, status: 'ACTIVE' },
        data: { shift: shift as any },
      });
    }

    const effectiveStudentFee = isSettlingDue
      ? Number(activeMembership?.feeAmount || totalFee || amount)
      : (totalFee !== undefined && Number(totalFee) > 0 ? Number(totalFee) : Number(amount));

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        studentId: transaction.studentId,
        studentName: student.fullName,
        studentPhone: student.phone,
        seatNumber: student.seatAssignments[0]?.seat?.seatNumber || null,
        amount: Number(transaction.amount),
        totalFee: transaction.totalFee ? Number(transaction.totalFee) : Number(transaction.amount),
        remainingFee: transaction.remainingFee ? Number(transaction.remainingFee) : 0,
        validFrom: transaction.validFrom ? transaction.validFrom.toISOString() : undefined,
        validTo: transaction.validTo ? transaction.validTo.toISOString() : undefined,
        paidForMonth: transaction.paidForMonth,
        paymentDate: transaction.paymentDate.toISOString(),
        paymentMode: transaction.paymentMode,
        status: transaction.status,
        receiptNumber: transaction.receiptNumber || undefined,
        notes: transaction.notes || undefined,
      },
      updatedStudent: {
        id: student.id,
        monthlyFee: effectiveStudentFee,
        totalFee: effectiveStudentFee,
        remainingFee: remainingFee !== undefined ? Number(remainingFee) : 0,
        membershipEndsInDays: newDaysRemaining,
        shift: shift || activeMembership?.shift || 'FULL_DAY',
        stayDuration: stayDuration || (shift === 'FULL_DAY' ? 'FULL_DAY' : 'FOUR_HOURS'),
      },
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/transactions error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
