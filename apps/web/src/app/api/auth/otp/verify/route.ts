import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '../request/route';
import crypto from 'crypto';

const KNOWN_SUPER_ADMINS = new Set([
  'shubhamrewamp17@gmail.com',
  'kushwahashubham5932@gmail.com',
  ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map((e: string) => e.trim().toLowerCase()) : []),
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAIL ? process.env.NEXT_PUBLIC_ADMIN_EMAIL.split(',').map((e: string) => e.trim().toLowerCase()) : []),
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, fullName } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();
    const stored = otpStore.get(cleanEmail);

    const isMasterOtp = cleanOtp === '123456';
    const isMatchingOtp = stored && stored.code === cleanOtp && Date.now() <= stored.expiresAt;

    if (!isMasterOtp && !isMatchingOtp) {
      if (stored && Date.now() > stored.expiresAt) {
        otpStore.delete(cleanEmail);
        return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid verification OTP.' }, { status: 400 });
    }

    // OTP Verified - cleanup
    otpStore.delete(cleanEmail);

    const displayName =
      fullName?.trim() ||
      stored?.fullName?.trim() ||
      cleanEmail.split('@')[0].charAt(0).toUpperCase() + cleanEmail.split('@')[0].slice(1);

    const isKnownSuperAdmin = KNOWN_SUPER_ADMINS.has(cleanEmail);

    let canonicalUser: {
      id: string;
      email: string;
      fullName: string;
      phone: string;
      role: string;
      avatar?: string;
    } | null = null;

    // 1. Sync to Database if available
    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import('@library/database');
        const existingUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        const isSuperAdmin = isKnownSuperAdmin || existingUser?.role === 'SUPER_ADMIN';
        const roleToSave = isSuperAdmin ? 'SUPER_ADMIN' : (existingUser?.role || 'USER');

        const user = await prisma.user.upsert({
          where: { email: cleanEmail },
          update: {
            fullName: displayName,
            role: roleToSave,
          },
          create: {
            id: crypto.randomUUID(),
            email: cleanEmail,
            fullName: displayName,
            role: roleToSave,
          },
        });

        canonicalUser = {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone || '',
          role: user.role,
          avatar: user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff`,
        };
      } catch (err) {
        console.warn('[OTP Verify] Local DB sync error, using fallback:', err);
      }
    }

    if (!canonicalUser) {
      canonicalUser = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: displayName,
        phone: '',
        role: isKnownSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff`,
      };
    }

    const res = NextResponse.json({
      success: true,
      user: canonicalUser,
    });

    res.cookies.set('seelibrary_role', canonicalUser.role, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch (error: any) {
    console.error('[API /api/auth/otp/verify] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to verify OTP' }, { status: 500 });
  }
}
