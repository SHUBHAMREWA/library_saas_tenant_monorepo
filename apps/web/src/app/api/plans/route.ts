import { NextResponse } from 'next/server';

const rawBackendUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.RENDER_BACKEND_URL ||
  'https://seelibrarybackend.onrender.com';

const RENDER_BACKEND_ORIGIN = rawBackendUrl
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '');

export async function GET() {
  try {
    const res = await fetch(`${RENDER_BACKEND_ORIGIN}/api/v1/payments/plans`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
