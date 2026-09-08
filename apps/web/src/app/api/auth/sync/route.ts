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

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    const isSuperAdmin =
      (configuredAdminEmail && cleanEmail === configuredAdminEmail) ||
      existingUser?.role === 'SUPER_ADMIN';

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
