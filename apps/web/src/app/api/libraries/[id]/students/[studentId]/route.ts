import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: libraryId, studentId } = await context.params;
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

    // Automatically remove replaced or cleared photos from Cloudinary
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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: libraryId, studentId } = await context.params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, libraryId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found in this library' }, { status: 404 });
    }

    // 0. Clean up images from Cloudinary if student has uploaded photos
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

    // 1. Release any active seats assigned to this student
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

    // 2. Delete the student record (Memberships, SeatAssignments cascade via Prisma schema)
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
