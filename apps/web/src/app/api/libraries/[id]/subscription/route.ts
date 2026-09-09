import { NextRequest, NextResponse } from 'next/server';

const rawBackendUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.RENDER_BACKEND_URL ||
  'https://seelibrarybackend.onrender.com';

const RENDER_BACKEND_ORIGIN = rawBackendUrl
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '');

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;

    let availablePlans: any[] = [];
    let hasActiveSubscription = false;
    let daysRemaining = 0;
    let formattedSub = null;
    let formattedPayments: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
        const { prisma, ensureDefaultSubscriptionPlans } = await import('@library/database');
        await ensureDefaultSubscriptionPlans(prisma);

        const dbPlans = await prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          orderBy: { priceMonthly: 'asc' },
        });

        availablePlans = dbPlans.map((p) => {
          const feats = (p.features || {}) as Record<string, any>;
          const origPrice = feats.originalPrice !== undefined ? Number(feats.originalPrice) : Number(p.priceYearly);
          return {
            id: p.id,
            code: p.code,
            name: p.name,
            price: Number(p.priceMonthly),
            originalPrice: origPrice,
            durationMonths: feats.durationMonths || (p.code === 'PRO' ? 12 : p.code === 'ADVANCE' ? 3 : 1),
            badge: feats.badge || '',
            description: feats.description || '',
            allFeatures: true,
          };
        });

        const now = new Date();
        const latestSub = await prisma.subscription.findFirst({
          where: { libraryId },
          include: { plan: true },
          orderBy: { endDate: 'desc' },
        });

        if (latestSub) {
          const end = new Date(latestSub.endDate);
          const isNotExpired = end.getTime() > now.getTime();
          hasActiveSubscription = isNotExpired && (latestSub.status === 'ACTIVE' || latestSub.status === 'MANUAL');
          daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          formattedSub = {
            id: latestSub.id,
            planId: latestSub.planId,
            planCode: latestSub.plan.code,
            planName: latestSub.plan.name,
            status: hasActiveSubscription ? 'ACTIVE' : 'EXPIRED',
            startDate: latestSub.startDate.toISOString().split('T')[0],
            endDate: latestSub.endDate.toISOString().split('T')[0],
            daysRemaining,
            autoRenew: latestSub.autoRenew,
            autoRenewCancelledAt: latestSub.autoRenewCancelledAt ? latestSub.autoRenewCancelledAt.toISOString() : null,
            cancellationReason: latestSub.cancellationReason || null,
            provider: latestSub.provider,
          };
        }

        const payments = await prisma.payment.findMany({
          where: { libraryId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        formattedPayments = payments.map((p) => {
          const meta = (p.metadata || {}) as Record<string, any>;
          return {
            id: p.id,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            provider: p.provider,
            paymentId: p.providerPaymentId || p.providerOrderId || p.idempotencyKey,
            orderId: p.providerOrderId,
            createdAt: p.createdAt.toISOString(),
            planCode: meta.planCode || 'PRO',
            planName: meta.planName || (meta.planCode ? `${meta.planCode} Plan` : 'SaaS Plan'),
            durationMonths: meta.durationMonths !== undefined ? Number(meta.durationMonths) : 1,
            adjustmentAction: meta.adjustmentAction || (meta.durationMonths < 0 ? 'DECREASE' : 'INCREASE'),
            daysAdjusted: meta.daysAdjusted !== undefined ? Number(meta.daysAdjusted) : null,
            previousEndDate: meta.previousEndDate || null,
            newEndDate: meta.newEndDate || null,
            discountApplied: meta.discountApplied || 0,
            failureReason: meta.failureReason || null,
            statusDetail: meta.statusDetail || null,
          };
        });
      } catch (dbErr) {
        console.warn('[subscription] Prisma query failed, falling back to Render backend:', dbErr);
      }
    }

    // Fallback: Fetch available plans from Render backend
    if (availablePlans.length === 0) {
      try {
        const renderRes = await fetch(`${RENDER_BACKEND_ORIGIN}/api/v1/payments/plans`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        if (renderRes.ok) {
          const renderData = await renderRes.json();
          const rawList = renderData.plans || renderData.data || [];
          if (Array.isArray(rawList) && rawList.length > 0) {
            availablePlans = rawList.map((p: any) => ({
              id: p.id,
              code: p.code,
              name: p.name,
              price: Number(p.priceMonthly ?? p.price),
              originalPrice: Number(p.originalPrice ?? p.priceYearly),
              durationMonths: Number(p.durationMonths || 1),
              badge: p.badge || '',
              description: p.description || '',
              allFeatures: true,
            }));
          }
        }
      } catch (renderErr) {
        console.warn('[subscription] Render backend plans fetch failed:', renderErr);
      }
    }

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
      subscription: formattedSub,
      payments: formattedPayments,
      availablePlans,
    });
  } catch (error: any) {
    console.error('API GET /api/libraries/[id]/subscription error:', error);
    return NextResponse.json({
      success: true,
      hasActiveSubscription: false,
      subscription: null,
      payments: [],
      availablePlans: [],
    });
  }
}
