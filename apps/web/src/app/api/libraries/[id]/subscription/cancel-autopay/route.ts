import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { reason = 'Cancelled by library owner from dashboard', userEmail } = body;

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      include: { owner: true },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    const now = new Date();

    // Find the latest active subscription
    const activeSub = await prisma.subscription.findFirst({
      where: {
        libraryId,
        status: { in: ['ACTIVE', 'MANUAL'] },
        endDate: { gt: now },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    if (!activeSub) {
      return NextResponse.json(
        { error: 'No active subscription found to cancel' },
        { status: 400 }
      );
    }

    const cancelledAt = new Date();

    // 1. Update subscription in database: disable autoRenew and record timestamp
    const updatedSub = await prisma.subscription.update({
      where: { id: activeSub.id },
      data: {
        autoRenew: false,
        autoRenewCancelledAt: cancelledAt,
        cancellationReason: reason,
        updatedAt: cancelledAt,
      },
    });

    // 2. If connected to a Razorpay subscription ID, cancel it with Razorpay API
    if (activeSub.providerSubscriptionId && activeSub.providerSubscriptionId.startsWith('sub_')) {
      try {
        const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (keyId && keySecret) {
          const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          await fetch(`https://api.razorpay.com/v1/subscriptions/${activeSub.providerSubscriptionId}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cancel_at_cycle_end: 1,
            }),
          });
        }
      } catch (rzpErr) {
        console.warn('Razorpay subscription cancellation notice failed:', rzpErr);
      }
    }

    // 3. Record a cancellation audit record in payments table for tracking
    try {
      await prisma.payment.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          subscriptionId: activeSub.id,
          amount: 0,
          currency: 'INR',
          provider: activeSub.provider,
          status: 'FAILED',
          providerOrderId: `CANCEL-${Date.now()}`,
          idempotencyKey: `cancel_${activeSub.id}_${Date.now()}`,
          metadata: {
            action: 'AUTOPAY_CANCELLED',
            planCode: activeSub.plan?.code || 'BASIC',
            planName: activeSub.plan?.name || 'Basic Plan',
            cancelledBy: userEmail || library.owner?.email || 'Owner',
            cancellationReason: reason,
            activeUntilDate: activeSub.endDate.toISOString().split('T')[0],
            cancelledAt: cancelledAt.toISOString(),
            statusDetail: 'Autopay Cancelled by User (Active until validity end)',
            failureReason: 'User cancelled monthly auto-renewal mandate',
          },
        },
      });
    } catch (payErr) {
      console.warn('Could not record cancellation payment log:', payErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly Autopay has been cancelled. Your subscription will remain fully active until your current validity date.',
      subscription: {
        id: updatedSub.id,
        autoRenew: false,
        autoRenewCancelledAt: cancelledAt.toISOString(),
        validUntil: activeSub.endDate.toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('API POST /subscription/cancel-autopay error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
