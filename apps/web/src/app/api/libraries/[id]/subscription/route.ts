import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDefaultSubscriptionPlans } from '@library/database';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;

    await ensureDefaultSubscriptionPlans(prisma);

    const availablePlans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    const now = new Date();
    const latestSub = await prisma.subscription.findFirst({
      where: { libraryId },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    let hasActiveSubscription = false;
    let daysRemaining = 0;
    let formattedSub = null;

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
        provider: latestSub.provider,
      };
    }

    // Fetch ALL subscription payments (SUCCESS, FAILED/REJECTED, PENDING/INITIATED)
    const payments = await prisma.payment.findMany({
      where: {
        libraryId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formattedPayments = payments.map((p) => {
      const meta = (p.metadata || {}) as Record<string, any>;
      return {
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status, // 'SUCCESS' | 'FAILED' | 'PENDING'
        provider: p.provider,
        paymentId: p.providerPaymentId || p.providerOrderId || p.idempotencyKey,
        orderId: p.providerOrderId,
        createdAt: p.createdAt.toISOString(),
        planCode: meta.planCode || 'PRO',
        planName: meta.planName || (meta.planCode ? `${meta.planCode} Plan` : 'SaaS Plan'),
        durationMonths: meta.durationMonths || 1,
        previousEndDate: meta.previousEndDate || null,
        newEndDate: meta.newEndDate || null,
        discountApplied: meta.discountApplied || 0,
        failureReason: meta.failureReason || null,
        statusDetail: meta.statusDetail || null,
      };
    });

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
      subscription: formattedSub,
      payments: formattedPayments,
      availablePlans: availablePlans.map((p) => {
        const feats = (p.features || {}) as Record<string, any>;
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          price: Number(p.priceMonthly),
          originalPrice: feats.originalPrice ? Number(feats.originalPrice) : Number(p.priceYearly),
          durationMonths: feats.durationMonths || (p.code === 'PRO' ? 12 : p.code === 'ADVANCE' ? 3 : 1),
          badge: feats.badge || '',
          description: feats.description || '',
          allFeatures: true,
        };
      }),
    });
  } catch (error: any) {
    console.error('API GET /api/libraries/[id]/subscription error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
