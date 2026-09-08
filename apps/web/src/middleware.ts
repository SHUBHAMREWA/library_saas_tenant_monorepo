import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get('seelibrary_role')?.value;

  // Protect /admin — only SUPER_ADMIN can access
  if (pathname.startsWith('/admin')) {
    if (role !== 'SUPER_ADMIN') {
      // Not admin → send to home (user dashboard / login)
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect /user — must be logged in (any role)
  if (pathname.startsWith('/user')) {
    if (!role) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // If SUPER_ADMIN tries to go to /user → redirect to /admin
    if (role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/user/:path*'],
};
