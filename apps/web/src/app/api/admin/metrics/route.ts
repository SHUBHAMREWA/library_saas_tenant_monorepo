import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(req: NextRequest) {
  try {
    const adminEmail = (req.headers.get('x-admin-email') || '').toLowerCase().trim();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@libraryhub.com').toLowerCase().trim();

    // Verify user is super admin in DB if email provided
    if (adminEmail && adminEmail !== configuredAdminEmail) {
      const user = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!user || user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
      }
    }

    const [
      totalLibraries,
      activeLibraries,
      totalStudents,
      totalSeats,
      totalUsers,
      totalPayments,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.library.count({ where: { deletedAt: null } }),
      prisma.library.count({ where: { deletedAt: null, isActive: true } }),
      prisma.student.count({ where: { deletedAt: null, isActive: true } }),
      prisma.seat.count({ where: { deletedAt: null, isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        select: { amount: true },
      }),
      prisma.subscription.count({
        where: {
          status: { in: ['ACTIVE', 'TRIAL', 'MANUAL'] },
        },
      }),
    ]);

    const suspendedLibraries = totalLibraries - activeLibraries;
    const totalRevenue = totalPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalLibraries,
        activeLibraries,
        suspendedLibraries,
        totalStudents,
        totalSeats,
        totalUsers,
        activeSubscriptions,
        totalRevenue,
      },
    });
  } catch (error: any) {
    console.error('API GET /api/admin/metrics error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
