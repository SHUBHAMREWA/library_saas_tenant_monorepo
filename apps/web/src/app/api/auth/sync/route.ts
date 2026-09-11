import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const rawBackend =
  (process.env.API_URL && process.env.API_URL.startsWith('http') ? process.env.API_URL : null) ||
  (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http') ? process.env.NEXT_PUBLIC_API_URL : null) ||
  'https://seelibrarybackend.onrender.com';

const RENDER_BACKEND_URL = rawBackend
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '')
  .replace('://localhost:', '://127.0.0.1:');

const KNOWN_SUPER_ADMINS = new Set([
  'shubhamrewamp17@gmail.com',
  'kushwahashubham5932@gmail.com',
  ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map((e: string) => e.trim().toLowerCase()) : []),
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAIL ? process.env.NEXT_PUBLIC_ADMIN_EMAIL.split(',').map((e: string) => e.trim().toLowerCase()) : []),
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, phone, avatar } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName?.trim() || cleanEmail.split('@')[0] || 'User';
    const isKnownSuperAdmin = KNOWN_SUPER_ADMINS.has(cleanEmail);

    let canonicalUser: {
      id: string;
      email: string;
      fullName: string;
      phone: string;
      role: string;
      avatar?: string;
    } | null = null;

    // Strategy 1: If DATABASE_URL is set, query Prisma directly
    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import('@library/database');
        const existingUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        const isSuperAdmin =
          isKnownSuperAdmin ||
          existingUser?.role === 'SUPER_ADMIN';

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

    let debugInfo: any = {
      RENDER_BACKEND_URL,
      databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    };

    // Strategy 2: Forward to Render backend
    if (!canonicalUser) {
      try {
        const targetSyncUrl = `${RENDER_BACKEND_URL}/api/v1/auth/sync`;
        const renderRes = await fetch(targetSyncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, fullName: cleanName, phone, avatar }),
          signal: AbortSignal.timeout(7000),
        });

        debugInfo.renderStatus = renderRes.status;
        debugInfo.renderOk = renderRes.ok;

        if (renderRes.ok) {
          const renderData = await renderRes.json();
          if (renderData.user) {
            canonicalUser = {
              id: renderData.user.id || crypto.randomUUID(),
              email: renderData.user.email || cleanEmail,
              fullName: renderData.user.fullName || cleanName,
              phone: renderData.user.phone || phone || '',
              role: isKnownSuperAdmin ? 'SUPER_ADMIN' : (renderData.user.role || 'USER'),
              avatar: renderData.user.avatar || avatar,
            };
            console.log('[auth/sync] Successfully synced via Render backend:', canonicalUser.role);
          }
        } else {
          debugInfo.renderText = await renderRes.text();
        }
      } catch (renderErr: any) {
        debugInfo.renderError = renderErr?.message || String(renderErr);
        console.warn('[auth/sync] Primary backend sync request failed, trying production direct:', renderErr);

        // Fallback directly to production Render if primary failed
        if (!RENDER_BACKEND_URL.includes('seelibrarybackend.onrender.com')) {
          try {
            const prodRes = await fetch('https://seelibrarybackend.onrender.com/api/v1/auth/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, fullName: cleanName, phone, avatar }),
              signal: AbortSignal.timeout(8000),
            });
            if (prodRes.ok) {
              const pData = await prodRes.json();
              if (pData.user) {
                canonicalUser = {
                  id: pData.user.id || crypto.randomUUID(),
                  email: pData.user.email || cleanEmail,
                  fullName: pData.user.fullName || cleanName,
                  phone: pData.user.phone || phone || '',
                  role: isKnownSuperAdmin ? 'SUPER_ADMIN' : (pData.user.role || 'USER'),
                  avatar: pData.user.avatar || avatar,
                };
              }
            }
          } catch {}
        }
      }
    }

    // Fallback: If both fail, return user with determined role (SUPER_ADMIN if in known list)
    if (!canonicalUser) {
      canonicalUser = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: cleanName,
        phone: phone || '',
        role: isKnownSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        avatar,
      };
    }

    const res = NextResponse.json({
      success: true,
      user: canonicalUser,
      _debug: debugInfo,
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
