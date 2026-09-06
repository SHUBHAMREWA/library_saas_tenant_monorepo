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
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'kushwahashubham5932@gmail.com').toLowerCase().trim();
    const isSuperAdminEmail =
      cleanEmail === adminEmail ||
      cleanEmail === 'kushwahashubham5932@gmail.com' ||
      cleanEmail === 'admin@libraryhub.com';

    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        fullName: cleanName,
        phone: phone || undefined,
        avatarUrl: avatar || undefined,
        ...(isSuperAdminEmail ? { role: 'SUPER_ADMIN' } : {}),
      },
      create: {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: cleanName,
        phone: phone || null,
        avatarUrl: avatar || null,
        role: isSuperAdminEmail ? 'SUPER_ADMIN' : 'USER',
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
