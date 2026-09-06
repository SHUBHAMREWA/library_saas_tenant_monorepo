import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isActive, adminEmail } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive boolean is required' }, { status: 400 });
    }

    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@libraryhub.com').toLowerCase().trim();
    const effectiveAdminEmail = (adminEmail || req.headers.get('x-admin-email') || configuredAdminEmail).toLowerCase().trim();

    const adminUser = await prisma.user.findUnique({
      where: { email: effectiveAdminEmail },
    });

    const updatedLib = await prisma.library.update({
      where: { id },
      data: { isActive },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Record audit log
    if (adminUser) {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          libraryId: updatedLib.id,
          actorId: adminUser.id,
          actorType: 'SUPER_ADMIN',
          action: isActive ? 'TENANT_ACTIVATED' : 'TENANT_SUSPENDED',
          entityType: 'LIBRARY',
          entityId: updatedLib.id,
          diffPayload: { isActive: { after: isActive } },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedLib.id,
        name: updatedLib.name,
        isActive: updatedLib.isActive,
        message: `Library "${updatedLib.name}" has been ${isActive ? 'activated' : 'suspended'} successfully.`,
      },
    });
 } catch (error: any) {
 console.error('API PUT /api/admin/libraries/[id]/status error:', error);
 return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
 }
}
