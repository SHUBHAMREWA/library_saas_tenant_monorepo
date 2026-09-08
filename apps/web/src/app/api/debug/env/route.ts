import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  let dbUser: { email: string; role: string } | null = null;
  let dbError: string | null = null;

  try {
    if (email) {
      const found = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      dbUser = found ? { email: found.email, role: found.role } : null;
    }
  } catch (e: any) {
    dbError = e?.message || 'DB query failed';
  }

  return NextResponse.json({
    DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
    ADMIN_EMAIL_SET: Boolean(process.env.ADMIN_EMAIL),
    NODE_ENV: process.env.NODE_ENV,
    queried_email: email || null,
    db_user: dbUser,
    db_error: dbError,
  });
}
