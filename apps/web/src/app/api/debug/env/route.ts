import { NextResponse } from 'next/server';

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL;
  return NextResponse.json({
    ADMIN_EMAIL_SET: Boolean(adminEmail),
    ADMIN_EMAIL_LENGTH: adminEmail?.length ?? 0,
    ADMIN_EMAIL_FIRST_CHAR: adminEmail?.[0] ?? null,
    NODE_ENV: process.env.NODE_ENV,
  });
}
