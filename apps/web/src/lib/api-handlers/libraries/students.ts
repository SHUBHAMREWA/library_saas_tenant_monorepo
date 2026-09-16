import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import crypto from 'crypto';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function handleGetStudents(req: NextRequest, libraryId: string) {
  try {
    if (!libraryId) {
      return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();

    const whereClause: any = { libraryId, isActive: true };
    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        memberships: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        seatAssignments: {
          where: { status: 'ACTIVE' },
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
          take: 1,
        },
        feeTransactions: {
          orderBy: [
            { paymentDate: 'desc' },
            { createdAt: 'desc' },
          ],
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const formattedStudents = students.map((std) => {
      const activeMembership = std.memberships.find((m) => m.status === 'ACTIVE') || std.memberships[0];
      const activeSeat = std.seatAssignments[0];

      const studentTxList = (std.feeTransactions || []).map((t) => ({
        id: t.id,
        studentId: t.studentId,
        studentName: std.fullName,
        studentPhone: std.phone,
        seatNumber: activeSeat?.seat?.seatNumber || null,
        amount: Number(t.amount),
        totalFee: t.totalFee ? Number(t.totalFee) : undefined,
        remainingFee: t.remainingFee ? Number(t.remainingFee) : undefined,
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
      }

      let studentStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
      if (activeSeat) {
        studentStatus = isExpired ? 'EXPIRED' : 'ACTIVE';
      } else if (hasPaidTx && !isExpired && daysRemaining > 0) {
        studentStatus = 'ACTIVE';
      } else {
        studentStatus = isExpired && hasPaidTx ? 'EXPIRED' : 'INACTIVE';
      }

      const assignedShift = activeSeat?.shift || (activeMembership?.status === 'ACTIVE' && activeSeat ? activeMembership?.shift : undefined) || undefined;

      return {
        id: std.id,
        fullName: std.fullName,
        phone: std.phone,
        studyPurpose: std.studyPurpose || undefined,
        photoUrl: std.photoUrl || undefined,
        kycPhotoUrl: std.kycPhotoUrl || undefined,
        kycDocId: std.kycDocId || undefined,
        kycType: std.kycDocType || 'AADHAAR',
        shift: assignedShift,
        seatId: activeSeat?.seat?.id || null,
        seatNumber: activeSeat?.seat?.seatNumber || null,
        roomId: activeSeat?.seat?.row?.roomId || null,
        roomName: activeSeat?.seat?.row?.room?.name || null,
        rowName: activeSeat?.seat?.row?.name || null,
        status: studentStatus,
        membershipEndsInDays: daysRemaining,
        monthlyFee: activeMembership?.feeAmount ? Number(activeMembership.feeAmount) : 0,
        totalFee: studentTxList[0]?.totalFee,
        remainingFee: hasPaidTx ? (studentTxList[0]?.remainingFee ?? 0) : 0,
        transactions: studentTxList,
        hasLocker: Boolean(activeSeat?.seat?.hasLocker),
      };
    });

    return NextResponse.json(
      {
        success: true,
        students: formattedStudents,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('API GET /api/libraries/[id]/students error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleCreateStudent(req: NextRequest, libraryId: string) {
  try {
    const body = await req.json();
    const { fullName, phone, studyPurpose, photoUrl, kycPhotoUrl, kycDocId, kycDocType } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: 'fullName and phone are required' }, { status: 400 });
    }

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

export async function handleUpdateStudent(req: NextRequest, libraryId: string, studentId: string) {
  try {
    const body = await req.json();
    const {
      fullName,
      phone,
      studyPurpose,
      shift,
      photoUrl,
      kycPhotoUrl,
      kycDocId,
      kycDocType,
      monthlyFee,
    } = body;

    const existingStudent = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found in this library' }, { status: 404 });
    }

    if (photoUrl !== undefined && existingStudent.photoUrl && existingStudent.photoUrl !== photoUrl) {
      deleteFromCloudinary(existingStudent.photoUrl).catch((err) =>
        console.error('Failed to delete old student photo from Cloudinary:', err)
      );
    }
    if (kycPhotoUrl !== undefined && existingStudent.kycPhotoUrl && existingStudent.kycPhotoUrl !== kycPhotoUrl) {
      deleteFromCloudinary(existingStudent.kycPhotoUrl).catch((err) =>
        console.error('Failed to delete old KYC photo from Cloudinary:', err)
      );
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(studyPurpose !== undefined ? { studyPurpose: studyPurpose ? studyPurpose.trim() : null } : {}),
        ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
        ...(kycPhotoUrl !== undefined ? { kycPhotoUrl: kycPhotoUrl || null } : {}),
        ...(kycDocId !== undefined ? { kycDocId: kycDocId ? kycDocId.trim() : null } : {}),
        ...(kycDocType !== undefined ? { kycDocType: kycDocType as any } : {}),
      },
    });

    if (shift || monthlyFee !== undefined) {
      await prisma.membership.updateMany({
        where: { studentId, libraryId, status: { in: ['ACTIVE', 'PAUSED'] } },
        data: {
          ...(shift ? { shift: shift as any } : {}),
          ...(monthlyFee !== undefined ? { feeAmount: Number(monthlyFee) } : {}),
        },
      });
    }

    if (shift) {
      await prisma.seatAssignment.updateMany({
        where: { studentId, libraryId, status: 'ACTIVE' },
        data: { shift: shift as any },
      });
    }

    return NextResponse.json({
      success: true,
      student: {
        id: updatedStudent.id,
        fullName: updatedStudent.fullName,
        phone: updatedStudent.phone,
        studyPurpose: updatedStudent.studyPurpose || undefined,
        photoUrl: updatedStudent.photoUrl || undefined,
        kycPhotoUrl: updatedStudent.kycPhotoUrl || undefined,
        kycDocId: updatedStudent.kycDocId || undefined,
        kycType: updatedStudent.kycDocType,
        shift: shift || undefined,
        monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : undefined,
      },
    });
  } catch (error: any) {
    console.error('API PATCH /api/libraries/[id]/students/[studentId] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleDeleteStudent(_req: NextRequest, libraryId: string, studentId: string) {
  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found in this library' }, { status: 404 });
    }

    if (student.photoUrl) {
      deleteFromCloudinary(student.photoUrl).catch((err) =>
        console.error('Failed to clean up student photo from Cloudinary:', err)
      );
    }
    if (student.kycPhotoUrl) {
      deleteFromCloudinary(student.kycPhotoUrl).catch((err) =>
        console.error('Failed to clean up KYC photo from Cloudinary:', err)
      );
    }

    const activeAssignments = await prisma.seatAssignment.findMany({
      where: { studentId, libraryId, status: 'ACTIVE' },
    });

    for (const assignment of activeAssignments) {
      await prisma.seatAssignment.update({
        where: { id: assignment.id },
        data: { status: 'RELEASED', endDate: new Date() },
      });
      const remainingCount = await prisma.seatAssignment.count({
        where: { seatId: assignment.seatId, libraryId, status: 'ACTIVE' },
      });
      if (remainingCount === 0) {
        await prisma.seat.update({
          where: { id: assignment.seatId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    await prisma.student.delete({
      where: { id: studentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id]/students/[studentId] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}