import { NextRequest, NextResponse } from 'next/server';

const rawBackendUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.RENDER_BACKEND_URL ||
  'https://seelibrarybackend.onrender.com';

const RENDER_BACKEND_ORIGIN = rawBackendUrl
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '')
  .replace('://localhost:', '://127.0.0.1:');

const PRODUCTION_RENDER_ORIGIN = 'https://seelibrarybackend.onrender.com';

export async function proxyAdminRequest(req: NextRequest, subpath: string): Promise<NextResponse> {
  const url = new URL(req.url);
  const cleanSubpath = subpath.replace(/^\/+/, '');
  const targetUrl = `${RENDER_BACKEND_ORIGIN}/api/v1/admin/${cleanSubpath}${url.search}`;

  const forwardHeaders: Record<string, string> = {
    'content-type': req.headers.get('content-type') || 'application/json',
  };

  const adminEmail = req.headers.get('x-admin-email');
  if (adminEmail) {
    forwardHeaders['x-admin-email'] = adminEmail;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    forwardHeaders['authorization'] = authHeader;
  }

  let body: any = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    try {
      body = await req.text();
    } catch {}
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body || undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.warn(`[Admin Proxy] Local endpoint ${targetUrl} failed (${error?.message || error}), attempting production fallback...`);

    // If local endpoint failed and is not already production, try Render production backend
    if (RENDER_BACKEND_ORIGIN !== PRODUCTION_RENDER_ORIGIN) {
      try {
        const fallbackUrl = `${PRODUCTION_RENDER_ORIGIN}/api/v1/admin/${cleanSubpath}${url.search}`;
        const fbRes = await fetch(fallbackUrl, {
          method: req.method,
          headers: forwardHeaders,
          body: body || undefined,
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });

        const fbData = await fbRes.text();
        return new NextResponse(fbData, {
          status: fbRes.status,
          headers: {
            'content-type': fbRes.headers.get('content-type') || 'application/json',
          },
        });
      } catch (fbErr: any) {
        console.error(`[Admin Proxy] Fallback to production also failed:`, fbErr);
      }
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to reach backend service' },
      { status: 502 }
    );
  }
}
