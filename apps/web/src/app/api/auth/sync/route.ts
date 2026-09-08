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

    // Check existing user in DB first
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    console.log('[auth/sync] email:', cleanEmail, '| existingRole:', existingUser?.role ?? 'NOT_FOUND');

    // CRITICAL: Never downgrade a SUPER_ADMIN role.
    // The Render backend (via ADMIN_EMAIL env var) bootstraps SUPER_ADMIN into PostgreSQL DB at startup.
    // Vercel frontend just reads role from DB — no ADMIN_EMAIL env var needed on Vercel.
    const roleToSave = existingUser?.role === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : (existingUser?.role || 'USER');

    console.log('[auth/sync] roleToSave:', roleToSave);

    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        fullName: cleanName,
        phone: phone || undefined,
        avatarUrl: avatar || undefined,
        role: roleToSave, // ← never overwrites SUPER_ADMIN with USER
      },
      create: {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: cleanName,
        phone: phone || null,
        avatarUrl: avatar || null,
        role: roleToSave,
      },
    });

    const res = NextResponse.json({
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

    // Set role cookie — readable by middleware (httpOnly: false so JS can also read it)
    // This allows /admin route protection without any frontend env vars
    res.cookies.set('seelibrary_role', user.role, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch (error: any) {
    console.error('API /api/auth/sync error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

