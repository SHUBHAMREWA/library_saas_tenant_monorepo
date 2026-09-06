import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(_req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            ownedLibraries: true,
            memberships: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      librariesCount: u._count.ownedLibraries + u._count.memberships,
    }));

    return NextResponse.json({ success: true, users: formatted });
  } catch (error: any) {
    console.error('API GET /api/admin/users error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
