import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const callerEmail = req.headers.get('x-admin-email')?.toLowerCase().trim();
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    if (callerEmail) {
      const dbUser = await prisma.user.findUnique({ where: { email: callerEmail } });
      const isSuperAdmin = dbUser?.role === 'SUPER_ADMIN' || (configuredAdminEmail && callerEmail === configuredAdminEmail);
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
    }

    const body = await req.json();
    const {
      name,
      durationMonths,
      priceMonthly,
      priceYearly,
      badge,
      description,
      isActive,
    } = body;

    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const currentFeatures = (existing.features || {}) as Record<string, any>;
    const duration = durationMonths !== undefined ? Math.max(1, parseInt(durationMonths, 10) || 1) : (currentFeatures.durationMonths || 1);
    const sellingPrice = priceMonthly !== undefined ? parseFloat(priceMonthly) : Number(existing.priceMonthly);
    const origPrice = priceYearly !== undefined ? parseFloat(priceYearly) : Number(existing.priceYearly);

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        priceMonthly: sellingPrice,
        priceYearly: origPrice,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        features: {
          ...currentFeatures,
          durationMonths: duration,
          originalPrice: origPrice,
          badge: badge !== undefined ? badge.trim() : (currentFeatures.badge || ''),
          description: description !== undefined ? description.trim() : (currentFeatures.description || ''),
          allFeatures: true,
        },
      },
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (err: any) {
    console.error('API PUT /api/admin/plans/[id] error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
