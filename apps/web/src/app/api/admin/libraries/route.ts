import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(req: NextRequest) {
  try {
    const adminEmail = (req.headers.get('x-admin-email') || '').toLowerCase().trim();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@libraryhub.com').toLowerCase().trim();

    if (adminEmail && adminEmail !== configuredAdminEmail) {
      const user = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!user || user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
      }
    }

    const libraries = await prisma.library.findMany({
      where: { deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            rooms: true,
            seats: true,
            students: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = libraries.map((lib) => ({
      id: lib.id,
      name: lib.name,
      slug: lib.slug,
      contactPhone: lib.contactPhone,
      contactEmail: lib.contactEmail,
      address: lib.address,
      isActive: lib.isActive,
      createdAt: lib.createdAt.toISOString(),
      owner: lib.owner,
      counts: {
        rooms: lib._count.rooms,
        seats: lib._count.seats,
        students: lib._count.students,
      },
    }));

    return NextResponse.json({ success: true, libraries: formatted });
  } catch (error: any) {
    console.error('API GET /api/admin/libraries error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
