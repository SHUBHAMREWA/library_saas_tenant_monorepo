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
    const { fullName, phone, studyPurpose, photoUrl, kycPhotoUrl, kycDocId, kycDocType } = body;

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
      const library = await prisma.library.findUnique({
        where: { id: libraryId },
        select: { ownerId: true },
      });

      const activeSub = await prisma.subscription.findFirst({
        where: {
          OR: [
            { libraryId },
            ...(library?.ownerId ? [{ userId: library.ownerId }] : []),
          ],
          status: { in: ['ACTIVE', 'MANUAL'] },
        },
        orderBy: { endDate: 'desc' },
      });

      let hasValidSub = false;
      if (activeSub) {
        const subEnd = new Date(activeSub.endDate);
        subEnd.setHours(23, 59, 59, 999);
        hasValidSub = subEnd.getTime() >= Date.now();
      }

      if (!hasValidSub) {
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

    const startDate = new Date();
    const expectedEndDate = new Date(startDate.getTime() + 30 * 86400000);

    // Create initial membership record — status PAUSED until student is enrolled / fee paid / seat allocated
    await prisma.membership.create({
      data: {
        id: crypto.randomUUID(),
        libraryId,
        studentId: student.id,
        startDate,
        expectedEndDate,
        status: 'PAUSED',
        feeAmount: 0,
        shift: 'FULL_DAY',
      },
    });

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
        shift: undefined,
        seatNumber: null,
        status: 'INACTIVE',
        membershipEndsInDays: 0,
        monthlyFee: 0,
        remainingFee: 0,
        totalFee: 0,
        transactions: [],
      },
    });
  } catch (error: any) {
    console.error('API POST /api/libraries/[id]/students error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
