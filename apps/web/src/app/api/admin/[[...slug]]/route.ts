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