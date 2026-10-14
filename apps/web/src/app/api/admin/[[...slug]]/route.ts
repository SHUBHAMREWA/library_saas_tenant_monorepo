import { NextRequest, NextResponse } from 'next/server';
import { proxyAdminRequest } from '@/lib/admin-proxy';

export const dynamic = 'force-dynamic';

function getSubpath(slug?: string[]): string {
  if (!slug || slug.length === 0) return '';
  return slug.join('/');
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  const subpath = getSubpath(slug);

  if (slug && slug.length === 1 && slug[0] === 'users') {
    try {
      const { prisma } = await import('@library/database');
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { ownedLibraries: true },
          },
        },
      });
      const formatted = users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        librariesOwned: u._count?.ownedLibraries || 0,
      }));
      return NextResponse.json({ success: true, users: formatted, data: formatted });
    } catch {
      // Fallback to proxy
    }
  }

  if (slug && slug.length === 1 && slug[0] === 'metrics') {
    try {
      const { prisma } = await import('@library/database');
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

      const suspendedLibraries = Math.max(0, totalLibraries - activeLibraries);
      const totalRevenue = totalPayments.reduce((acc, p) => acc + Number(p.amount), 0);

      const metricsData = {
        totalLibraries,
        activeLibraries,
        suspendedLibraries,
        totalStudents,
        totalSeats,
        totalUsers,
        activeSubscriptions,
        totalRevenue,
      };

      return NextResponse.json({ success: true, data: metricsData });
    } catch {
      // Fallback to proxy
    }
  }

  if (slug && slug.length === 1 && slug[0] === 'libraries') {
    try {
      const { prisma } = await import('@library/database');
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
          subscriptions: {
            orderBy: { endDate: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              autoRenew: true,
              autoRenewCancelledAt: true,
              cancellationReason: true,
              startDate: true,
              endDate: true,
              plan: {
                select: {
                  name: true,
                  code: true,
                },
              },
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

      const libIds = libraries.map((l) => l.id);
      const ownerIds = libraries.map((l) => l.owner?.id).filter(Boolean) as string[];

      const allSubs = await prisma.subscription.findMany({
        where: {
          OR: [
            { libraryId: { in: libIds } },
            { userId: { in: ownerIds } },
          ],
        },
        include: {
          plan: {
            select: { name: true, code: true },
          },
        },
        orderBy: { endDate: 'desc' },
      });

      const formatted = libraries.map((lib) => {
        const sub =
          allSubs.find((s) => s.libraryId === lib.id) ||
          allSubs.find((s) => s.userId === lib.owner?.id) ||
          lib.subscriptions?.[0] ||
          null;

        const subObj = sub
          ? {
              id: sub.id,
              status: sub.status,
              planName: sub.plan?.name || 'SaaS Plan',
              planCode: sub.plan?.code || 'BASIC',
              startDate: sub.startDate ? new Date(sub.startDate).toISOString() : null,
              endDate: sub.endDate ? new Date(sub.endDate).toISOString() : null,
              validUntil: sub.endDate
                ? new Date(sub.endDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A',
              daysRemaining: sub.endDate
                ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 0,
              isExpired: sub.endDate ? new Date(sub.endDate).getTime() < Date.now() : false,
              autoRenew: Boolean(sub.autoRenew),
              autoRenewCancelledAt: sub.autoRenewCancelledAt
                ? new Date(sub.autoRenewCancelledAt).toISOString()
                : null,
              cancellationReason: sub.cancellationReason || null,
              plan: sub.plan ? { name: sub.plan.name, code: sub.plan.code } : null,
            }
          : null;

        return {
          id: lib.id,
          name: lib.name,
          slug: lib.slug,
          contactPhone: lib.contactPhone,
          contactEmail: lib.contactEmail,
          address: lib.address,
          isActive: lib.isActive,
          createdAt: lib.createdAt.toISOString(),
          owner: lib.owner
            ? {
                id: lib.owner.id,
                fullName: lib.owner.fullName,
                email: lib.owner.email,
                phone: lib.owner.phone,
              }
            : null,
          studentCount: lib._count?.students || 0,
          seatCount: lib._count?.seats || 0,
          roomCount: lib._count?.rooms || 0,
          counts: {
            students: lib._count?.students || 0,
            seats: lib._count?.seats || 0,
            rooms: lib._count?.rooms || 0,
          },
          subscription: subObj,
          activeSubscription: subObj,
        };
      });

      return NextResponse.json({ success: true, libraries: formatted, data: formatted });
    } catch {
      // Fallback to proxy
    }
  }

  return proxyAdminRequest(req, subpath);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  const subpath = getSubpath(slug);
  if (subpath === 'notifications/broadcast') {
    const { POST: broadcastHandler } = await import('../notifications/broadcast/route');
    return broadcastHandler(req);
  }
  return proxyAdminRequest(req, subpath);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  const subpath = getSubpath(slug);

  if (slug && slug.length === 3 && slug[0] === 'users' && slug[2] === 'role') {
    try {
      const { prisma } = await import('@library/database');
      const body = await req.json();
      const { role } = body;
      if (!role || !['USER', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role. Must be USER or SUPER_ADMIN' }, { status: 400 });
      }
      const userId = slug[1];
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
      return NextResponse.json({
        success: true,
        user: { id: updated.id, email: updated.email, fullName: updated.fullName, role: updated.role },
      });
    } catch {
      // Fallback to proxy
    }
  }

  return proxyAdminRequest(req, subpath);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  return proxyAdminRequest(req, getSubpath(slug));
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  return proxyAdminRequest(req, getSubpath(slug));
}