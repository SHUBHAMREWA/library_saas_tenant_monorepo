import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function handleGetTransactions(req: NextRequest, libraryId: string) {
  try {
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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '150', 10), 1), 500);
    const month = searchParams.get('month')?.trim();

    const whereClause: any = { libraryId };
    if (month && month !== 'ALL') {
      whereClause.paidForMonth = { contains: month, mode: 'insensitive' };
    }

    const transactions = await prisma.studentFeeTransaction.findMany({
      where: whereClause,
      take: limit,
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

    return NextResponse.json({ success: true, transactions: formatted }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('API GET /api/libraries/[id]/transactions error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleCreateTransaction(req: NextRequest, libraryId: string) {
  try {
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

    const parsedStart = validFrom ? new Date(validFrom) : parsedPaymentDate;
    const parsedEnd = validTo ? new Date(validTo) : new Date(parsedStart.getTime() + 30 * 86400000);
    const txMonths = (validFrom && validTo)
      ? Math.max(1, Math.round((new Date(validTo).getTime() - new Date(validFrom).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 1;
    const singleMonthFee = totalFee !== undefined && Number(totalFee) > 0
      ? Math.round(Number(totalFee) / (txMonths || 1))
      : Number(amount);

    if (!activeMembership) {
      activeMembership = await prisma.membership.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          studentId: student.id,
          startDate: parsedStart,
          expectedEndDate: parsedEnd,
          status: 'ACTIVE',
          feeAmount: singleMonthFee,
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
        ? Number(activeMembership.feeAmount || singleMonthFee)
        : singleMonthFee;

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

export async function handleUpdateTransaction(req: NextRequest, libraryId: string, transactionId: string) {
  try {
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
            error: 'Active SaaS subscription required to update transactions.',
            code: 'SUBSCRIPTION_REQUIRED',
          },
          { status: 403 }
        );
      }
    }

    const existingTx = await prisma.studentFeeTransaction.findFirst({
      where: { id: transactionId, libraryId },
      include: {
        student: {
          include: {
            memberships: {
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
        },
      },
    });

    if (!existingTx) {
      return NextResponse.json({ error: 'Transaction not found in this library' }, { status: 404 });
    }

    const body = await req.json();
    const {
      amount,
      totalFee,
      remainingFee,
      paidForMonth,
      validFrom,
      validTo,
      paymentDate,
      paymentMode,
      notes,
    } = body;

    const parsedAmount = amount !== undefined ? Number(amount) : Number(existingTx.amount);
    const parsedTotalFee = totalFee !== undefined && Number(totalFee) > 0
      ? Number(totalFee)
      : (existingTx.totalFee ? Number(existingTx.totalFee) : parsedAmount);
    const parsedRemainingFee = remainingFee !== undefined
      ? Number(remainingFee)
      : Math.max(0, parsedTotalFee - parsedAmount);
    const newStatus = parsedRemainingFee > 0 ? 'PARTIAL' : 'PAID';

    const updatedTx = await prisma.studentFeeTransaction.update({
      where: { id: transactionId },
      data: {
        amount: parsedAmount,
        totalFee: parsedTotalFee,
        remainingFee: parsedRemainingFee,
        paidForMonth: paidForMonth ? paidForMonth.trim() : existingTx.paidForMonth,
        validFrom: validFrom ? new Date(validFrom) : existingTx.validFrom,
        validTo: validTo ? new Date(validTo) : existingTx.validTo,
        paymentDate: paymentDate ? new Date(paymentDate) : existingTx.paymentDate,
        paymentMode: paymentMode || existingTx.paymentMode,
        status: newStatus,
        notes: notes !== undefined ? (notes?.trim() || null) : existingTx.notes,
      },
    });

    let updatedDaysRemaining: number | undefined;
    const student = existingTx.student;
    const activeMembership = student?.memberships?.[0];

    // Find latest transaction for this student by validTo / paymentDate
    const allStudentTxs = await prisma.studentFeeTransaction.findMany({
      where: { studentId: existingTx.studentId, libraryId },
      orderBy: [{ validTo: 'desc' }, { paymentDate: 'desc' }],
    });

    const latestTx = allStudentTxs[0];
    if (activeMembership && latestTx?.validTo) {
      const now = new Date();
      updatedDaysRemaining = Math.max(
        0,
        Math.ceil((new Date(latestTx.validTo).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      const txMonths = (latestTx.validFrom && latestTx.validTo)
        ? Math.max(1, Math.round((new Date(latestTx.validTo).getTime() - new Date(latestTx.validFrom).getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 1;
      const singleMonthFee = latestTx.totalFee
        ? Math.round(Number(latestTx.totalFee) / (txMonths || 1))
        : Number(latestTx.amount);

      await prisma.membership.update({
        where: { id: activeMembership.id },
        data: {
          expectedEndDate: latestTx.validTo,
          feeAmount: singleMonthFee,
          status: updatedDaysRemaining > 0 ? 'ACTIVE' : 'EXPIRED',
        },
      });
    }

    // Total remaining dues for this student
    const totalStudentRemainingDue = allStudentTxs.reduce(
      (sum, t) => sum + (Number(t.remainingFee) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      transaction: {
        id: updatedTx.id,
        studentId: updatedTx.studentId,
        studentName: student?.fullName || 'Student',
        studentPhone: student?.phone || '',
        seatNumber: student?.seatAssignments?.[0]?.seat?.seatNumber || null,
        amount: Number(updatedTx.amount),
        totalFee: updatedTx.totalFee ? Number(updatedTx.totalFee) : Number(updatedTx.amount),
        remainingFee: updatedTx.remainingFee ? Number(updatedTx.remainingFee) : 0,
        validFrom: updatedTx.validFrom ? updatedTx.validFrom.toISOString() : undefined,
        validTo: updatedTx.validTo ? updatedTx.validTo.toISOString() : undefined,
        paidForMonth: updatedTx.paidForMonth,
        paymentDate: updatedTx.paymentDate.toISOString(),
        paymentMode: updatedTx.paymentMode,
        status: updatedTx.status,
        receiptNumber: updatedTx.receiptNumber || undefined,
        notes: updatedTx.notes || undefined,
      },
      updatedStudent: {
        id: existingTx.studentId,
        remainingFee: totalStudentRemainingDue,
        membershipEndsInDays: updatedDaysRemaining,
      },
    });
  } catch (error: any) {
    console.error('API PATCH /api/libraries/[id]/transactions/[txId] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleDeleteTransaction(req: NextRequest, libraryId: string, transactionId: string) {
  try {
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
            error: 'Active SaaS subscription required to delete transactions.',
            code: 'SUBSCRIPTION_REQUIRED',
          },
          { status: 403 }
        );
      }
    }

    const existingTx = await prisma.studentFeeTransaction.findFirst({
      where: { id: transactionId, libraryId },
      include: {
        student: {
          include: {
            memberships: {
              where: { status: { in: ['ACTIVE', 'PAUSED', 'EXPIRED'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!existingTx) {
      return NextResponse.json({ error: 'Transaction not found in this library' }, { status: 404 });
    }

    const studentId = existingTx.studentId;

    // Delete transaction
    await prisma.studentFeeTransaction.delete({
      where: { id: transactionId },
    });

    // Recalculate student validity & membership from remaining transactions
    const remainingTxs = await prisma.studentFeeTransaction.findMany({
      where: { studentId, libraryId },
      orderBy: [{ validTo: 'desc' }, { paymentDate: 'desc' }],
    });

    let updatedDaysRemaining: number = 0;
    const activeMembership = existingTx.student?.memberships?.[0];

    if (remainingTxs.length > 0 && activeMembership) {
      const latestTx = remainingTxs[0];
      if (latestTx.validTo) {
        const now = new Date();
        updatedDaysRemaining = Math.max(
          0,
          Math.ceil((new Date(latestTx.validTo).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );

        const txMonths = (latestTx.validFrom && latestTx.validTo)
          ? Math.max(1, Math.round((new Date(latestTx.validTo).getTime() - new Date(latestTx.validFrom).getTime()) / (1000 * 60 * 60 * 24 * 30)))
          : 1;
        const singleMonthFee = latestTx.totalFee
          ? Math.round(Number(latestTx.totalFee) / (txMonths || 1))
          : Number(latestTx.amount);

        await prisma.membership.update({
          where: { id: activeMembership.id },
          data: {
            expectedEndDate: latestTx.validTo,
            feeAmount: singleMonthFee,
            status: updatedDaysRemaining > 0 ? 'ACTIVE' : 'EXPIRED',
          },
        });
      }
    } else if (activeMembership) {
      const now = new Date();
      await prisma.membership.update({
        where: { id: activeMembership.id },
        data: {
          expectedEndDate: now,
          status: 'EXPIRED',
        },
      });
      updatedDaysRemaining = 0;
    }

    const totalStudentRemainingDue = remainingTxs.reduce(
      (sum, t) => sum + (Number(t.remainingFee) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      deletedTransactionId: transactionId,
      studentId,
      updatedStudent: {
        id: studentId,
        remainingFee: totalStudentRemainingDue,
        membershipEndsInDays: updatedDaysRemaining,
      },
    });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id]/transactions/[txId] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}