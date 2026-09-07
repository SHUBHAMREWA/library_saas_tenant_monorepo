import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDefaultSubscriptionPlans } from '@library/database';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'kushwahashubham5932@gmail.com').toLowerCase().trim();
    const callerEmail = req.headers.get('x-admin-email')?.toLowerCase().trim();

    if (callerEmail && callerEmail !== adminEmail && callerEmail !== 'kushwahashubham5932@gmail.com' && callerEmail !== 'admin@libraryhub.com') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    await ensureDefaultSubscriptionPlans(prisma);

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
    });

    const formatted = plans.map((p) => {
      const feats = (p.features || {}) as Record<string, any>;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        durationMonths: feats.durationMonths || (p.code === 'PRO' ? 12 : p.code === 'ADVANCE' ? 3 : 1),
        originalPrice: feats.originalPrice ? Number(feats.originalPrice) : Number(p.priceYearly),
        badge: feats.badge || '',
        description: feats.description || '',
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, plans: formatted });
  } catch (err: any) {
    console.error('API GET /api/admin/plans error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'kushwahashubham5932@gmail.com').toLowerCase().trim();
    const callerEmail = req.headers.get('x-admin-email')?.toLowerCase().trim();

    if (callerEmail && callerEmail !== adminEmail && callerEmail !== 'kushwahashubham5932@gmail.com' && callerEmail !== 'admin@libraryhub.com') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      code,
      name,
      durationMonths = 1,
      priceMonthly,
      priceYearly,
      badge,
      description,
    } = body;

    if (!code || !name || priceMonthly === undefined) {
      return NextResponse.json({ error: 'code, name, and priceMonthly are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Plan code '${cleanCode}' already exists` }, { status: 400 });
    }

    const duration = Math.max(1, parseInt(durationMonths, 10) || 1);
    const sellingPrice = parseFloat(priceMonthly);
    const origPrice = priceYearly ? parseFloat(priceYearly) : sellingPrice;

    const plan = await prisma.subscriptionPlan.create({
      data: {
        id: crypto.randomUUID(),
        code: cleanCode,
        name: name.trim(),
        priceMonthly: sellingPrice,
        priceYearly: origPrice,
        maxSeats: 10000,
        maxLibraries: 10,
        features: {
          durationMonths: duration,
          originalPrice: origPrice,
          badge: badge?.trim() || '',
          description: description?.trim() || '',
          allFeatures: true,
        },
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    console.error('API POST /api/admin/plans error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
