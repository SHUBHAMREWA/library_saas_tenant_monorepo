import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Signature verification if webhook secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('Razorpay webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const event = payload.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // =========================================================================
    // CASE 1: subscription.charged (Recurring Autopay Payment Success)
    // =========================================================================
    if (event === 'subscription.charged' || event === 'payment.captured') {
      const subEntity = payload.payload?.subscription?.entity;
      const paymentEntity = payload.payload?.payment?.entity;

      // Extract metadata from notes or payment
      const notes = subEntity?.notes || paymentEntity?.notes || {};
      const libraryId = notes.libraryId;
      const subId = subEntity?.id;
      const paymentId = paymentEntity?.id || `PAY-${Date.now()}`;
      const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : 100;

      let targetSub = null;

      if (libraryId) {
        targetSub = await prisma.subscription.findFirst({
          where: { libraryId },
          include: { plan: true },
          orderBy: { endDate: 'desc' },
        });
      } else if (subId) {
        targetSub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subId },
          include: { plan: true },
        });
      }

      if (targetSub) {
        const now = new Date();
        const curEnd = new Date(targetSub.endDate);
        const baseDate = curEnd.getTime() > now.getTime() ? curEnd : now;
        const newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Extend validity
        await prisma.subscription.update({
          where: { id: targetSub.id },
          data: {
            endDate: newEndDate,
            status: 'ACTIVE',
            autoRenew: true,
            provider: 'RAZORPAY',
            providerSubscriptionId: subId || targetSub.providerSubscriptionId,
            updatedAt: now,
          },
        });

        // Record successful autopay payment in ledger
        await prisma.payment.create({
          data: {
            id: crypto.randomUUID(),
            libraryId: targetSub.libraryId,
            subscriptionId: targetSub.id,
            amount: amount,
            currency: 'INR',
            provider: 'RAZORPAY',
            status: 'SUCCESS',
            providerPaymentId: paymentId,
            providerOrderId: paymentEntity?.order_id || subId || null,
            idempotencyKey: `webhook_${paymentId}`,
            metadata: {
              event: 'subscription.charged',
              isAutopay: true,
              planCode: targetSub.plan?.code || 'BASIC',
              planName: targetSub.plan?.name || 'Basic Plan (Monthly Autopay)',
              durationMonths: 1,
              previousEndDate: curEnd.toISOString(),
              newEndDate: newEndDate.toISOString(),
              paidByEmail: notes.userEmail || null,
              statusDetail: 'Monthly Autopay Auto-Debited Successfully',
            },
          },
        });

        console.log(`[Razorpay Webhook] Successfully extended subscription for library ${targetSub.libraryId} until ${newEndDate.toISOString()}`);
      }
    }

    // =========================================================================
    // CASE 2: subscription.cancelled / subscription.halted
    // =========================================================================
    if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      const subEntity = payload.payload?.subscription?.entity;
      const subId = subEntity?.id;
      const notes = subEntity?.notes || {};
      const libraryId = notes.libraryId;

      let targetSub = null;
      if (subId) {
        targetSub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subId },
        });
      } else if (libraryId) {
        targetSub = await prisma.subscription.findFirst({
          where: { libraryId },
          orderBy: { endDate: 'desc' },
        });
      }

      if (targetSub) {
        await prisma.subscription.update({
          where: { id: targetSub.id },
          data: {
            autoRenew: false,
            autoRenewCancelledAt: new Date(),
            cancellationReason: event === 'subscription.cancelled' ? 'Cancelled in Razorpay' : 'Halted due to payment failure',
          },
        });
        console.log(`[Razorpay Webhook] Marked subscription ${targetSub.id} as autoRenew: false due to ${event}`);
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error: any) {
    console.error('[Razorpay Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
