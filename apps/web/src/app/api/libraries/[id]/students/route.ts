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
    const { fullName, phone, studyPurpose, shift, durationMonths, feeAmount, seatNumber, photoUrl, kycPhotoUrl, kycDocId, kycDocType } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: 'fullName and phone are required' }, { status: 400 });
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
            error: 'Active SaaS subscription required to enroll students. Please upgrade your plan in Branch Settings.',
            code: 'SUBSCRIPTION_REQUIRED',
          },
          { status: 403 }
        );
      }
    }

    const studentId = crypto.randomUUID();
    const student = await prisma.student.create({
      data: {
        id: studentId,
        libraryId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        studyPurpose: studyPurpose?.trim() || null,
        photoUrl: photoUrl || null,
        kycPhotoUrl: kycPhotoUrl || null,
        kycDocId: kycDocId?.trim() || null,
        kycDocType: kycDocType || 'AADHAAR',
      },
    });

    const initialAmount = feeAmount ? Number(feeAmount) : 0;
    const months = Math.max(1, durationMonths || 1);
    const startDate = new Date();
    const expectedEndDate = new Date(startDate.getTime() + months * 30 * 86400000);

    const membership = await prisma.membership.create({
      data: {
        id: crypto.randomUUID(),
        libraryId,
        studentId: student.id,
        startDate,
        expectedEndDate,
        status: 'ACTIVE',
        feeAmount: initialAmount > 0 ? initialAmount : 1000,
        shift: (shift || 'FULL_DAY') as any,
      },
    });

    // Assign and occupy seat if seatNumber provided
    let finalAssignedSeatNumber: string | null = null;
    if (seatNumber) {
      const seat = await prisma.seat.findFirst({
        where: { libraryId, seatNumber },
      });
      if (seat) {
        await prisma.seat.update({
          where: { id: seat.id },
          data: { status: 'OCCUPIED' },
        });

        await prisma.seatAssignment.create({
          data: {
            id: crypto.randomUUID(),
            libraryId,
            seatId: seat.id,
            studentId: student.id,
            membershipId: membership.id,
            shift: (shift || 'FULL_DAY') as any,
            startDate,
            status: 'ACTIVE',
          },
        });
        finalAssignedSeatNumber = seatNumber;
      }
    }

    // Only auto-record initial fee transaction if feeAmount was explicitly passed and > 0
    let formattedTx: any = null;
    if (initialAmount > 0) {
      const initialMonth = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const initialTransaction = await prisma.studentFeeTransaction.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          studentId: student.id,
          membershipId: membership.id,
          amount: initialAmount,
          paidForMonth: initialMonth,
          paymentDate: startDate,
          paymentMode: 'UPI',
          status: 'PAID',
          receiptNumber,
          notes: `Initial registration fee (${months} month${months > 1 ? 's' : ''})`,
        },
      });

      formattedTx = {
        id: initialTransaction.id,
        studentId: student.id,
        studentName: student.fullName,
        studentPhone: student.phone,
        seatNumber: finalAssignedSeatNumber,
        amount: initialAmount,
        paidForMonth: initialMonth,
        paymentDate: initialTransaction.paymentDate.toISOString(),
        paymentMode: initialTransaction.paymentMode,
        status: initialTransaction.status,
        receiptNumber: initialTransaction.receiptNumber || undefined,
        notes: initialTransaction.notes || undefined,
      };
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        phone: student.phone,
        studyPurpose: student.studyPurpose || undefined,
        photoUrl: student.photoUrl || undefined,
        kycPhotoUrl: student.kycPhotoUrl || undefined,
        kycDocId: student.kycDocId || undefined,
        kycType: student.kycDocType,
        shift: membership.shift,
        seatNumber: finalAssignedSeatNumber,
        status: !finalAssignedSeatNumber ? 'INACTIVE' : 'ACTIVE',
        membershipEndsInDays: initialAmount > 0 ? months * 30 : 0,
        monthlyFee: initialAmount,
        transactions: formattedTx ? [formattedTx] : [],
      },
      transaction: formattedTx,
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/students error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
