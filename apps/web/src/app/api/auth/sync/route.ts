import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, phone, avatar } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName?.trim() || cleanEmail.split('@')[0] || 'User';
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    console.log('[auth/sync] email:', cleanEmail);
    console.log('[auth/sync] ADMIN_EMAIL configured:', Boolean(configuredAdminEmail));
    console.log('[auth/sync] email matches ADMIN_EMAIL:', configuredAdminEmail === cleanEmail);

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    console.log('[auth/sync] existingUser role:', existingUser?.role ?? 'NOT_FOUND');

    // Server-side Super Admin Determination:
    // 1. Server environment variable ADMIN_EMAIL matches
    // 2. User in PostgreSQL DB already has role === 'SUPER_ADMIN'
    const isSuperAdmin =
      Boolean(configuredAdminEmail && cleanEmail === configuredAdminEmail) ||
      existingUser?.role === 'SUPER_ADMIN';

    console.log('[auth/sync] isSuperAdmin:', isSuperAdmin, '| finalRole will be:', isSuperAdmin ? 'SUPER_ADMIN' : (existingUser?.role || 'USER'));

    const finalRole = isSuperAdmin ? 'SUPER_ADMIN' : (existingUser?.role || 'USER');

    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        fullName: cleanName,
        phone: phone || undefined,
        avatarUrl: avatar || undefined,
        role: finalRole,
      },
      create: {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: cleanName,
        phone: phone || null,
        avatarUrl: avatar || null,
        role: finalRole,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('API /api/auth/sync error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
