import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get('seelibrary_role')?.value;

  // Protect /admin — if cookie explicitly says non-admin (e.g. 'USER'), redirect to home.
  // If cookie is not set yet, allow /admin to load so client-side DB verification runs.
  if (pathname.startsWith('/admin')) {
    if (role && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect /user — must be logged in (any role, including SUPER_ADMIN who switched to library view)
  if (pathname.startsWith('/user')) {
    if (!role) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/user/:path*'],
};
