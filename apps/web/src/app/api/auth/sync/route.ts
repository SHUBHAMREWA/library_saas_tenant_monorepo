import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const RENDER_BACKEND_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://seelibrarybackend.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, phone, avatar } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName?.trim() || cleanEmail.split('@')[0] || 'User';

    let canonicalUser: {
      id: string;
      email: string;
      fullName: string;
      phone: string;
      role: string;
      avatar?: string;
    } | null = null;

    // Strategy 1: If DATABASE_URL is set on Vercel, query Prisma directly
    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import('@library/database');
        const existingUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const isSuperAdmin =
          existingUser?.role === 'SUPER_ADMIN' ||
          Boolean(configuredAdminEmail && cleanEmail === configuredAdminEmail);

        const roleToSave = isSuperAdmin ? 'SUPER_ADMIN' : (existingUser?.role || 'USER');

        const user = await prisma.user.upsert({
          where: { email: cleanEmail },
          update: {
            fullName: cleanName,
            phone: phone || undefined,
            avatarUrl: avatar || undefined,
            role: roleToSave,
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

        canonicalUser = {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone || '',
          role: user.role,
          avatar: user.avatarUrl || undefined,
        };
      } catch (localDbErr) {
        console.warn('[auth/sync] Local Prisma DB query failed, falling back to Render backend:', localDbErr);
      }
    }

    // Strategy 2: Forward to Render backend (which has Neon PostgreSQL DB + ADMIN_EMAIL env)
    if (!canonicalUser) {
      try {
        const renderRes = await fetch(`${RENDER_BACKEND_URL}/api/v1/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, fullName: cleanName, phone, avatar }),
          signal: AbortSignal.timeout(10000),
        });

        if (renderRes.ok) {
          const renderData = await renderRes.json();
          if (renderData.user) {
            canonicalUser = renderData.user;
            console.log('[auth/sync] Successfully synced via Render backend:', canonicalUser?.role);
          }
        }
      } catch (renderErr) {
        console.warn('[auth/sync] Render backend sync request failed:', renderErr);
      }
    }

    // Fallback: If both fail, return user with USER role
    if (!canonicalUser) {
      canonicalUser = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: cleanName,
        phone: phone || '',
        role: 'USER',
        avatar,
      };
    }

    const res = NextResponse.json({
      success: true,
      user: canonicalUser,
    });

    // Set role cookie for middleware and client navigation
    res.cookies.set('seelibrary_role', canonicalUser.role, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch (error: any) {
    console.error('API /api/auth/sync error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
