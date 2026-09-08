import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const adminEmail = (req.headers.get('x-admin-email') || '').toLowerCase().trim();
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    if (adminEmail) {
      const caller = await prisma.user.findUnique({ where: { email: adminEmail } });
      const isSuperAdmin = caller?.role === 'SUPER_ADMIN' || (configuredAdminEmail && adminEmail === configuredAdminEmail);
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { role } = body;

    if (!role || !['SUPER_ADMIN', 'USER', 'OWNER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Allowed values: SUPER_ADMIN, USER, OWNER' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updated.email} role updated to ${updated.role}`,
      user: updated,
    });
  } catch (error: any) {
    console.error('API PUT /api/admin/users/[id]/role error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
