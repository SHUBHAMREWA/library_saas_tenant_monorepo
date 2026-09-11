import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDefaultSubscriptionPlans } from '@library/database';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await req.json();
    const { planCode = 'BASIC', couponCode, userEmail, isAutopay = false } = body;

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      include: { owner: true },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    await ensureDefaultSubscriptionPlans(prisma);
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });

    if (!plan) {
      return NextResponse.json({ error: `Subscription plan '${planCode}' not found` }, { status: 404 });
    }

    const planFeatures = (plan.features || {}) as Record<string, any>;
    const months = planFeatures.durationMonths || (plan.code === 'PRO' ? 12 : plan.code === 'ADVANCE' ? 3 : 1);
    const basePrice = Number(plan.priceMonthly);
    let discountAmount = 0;

    // Validate Coupon if provided
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      const dbCoupon = await prisma.coupon.findUnique({
        where: { code: cleanCoupon },
      });

      if (dbCoupon && dbCoupon.isActive) {
        const nowIso = new Date().toISOString();
        if (nowIso >= dbCoupon.validFrom.toISOString() && nowIso <= dbCoupon.validUntil.toISOString()) {
          if (dbCoupon.discountType === 'PERCENTAGE') {
            discountAmount = Math.round((basePrice * Number(dbCoupon.discountValue)) / 100);
            if (dbCoupon.maxDiscountAmount && discountAmount > Number(dbCoupon.maxDiscountAmount)) {
              discountAmount = Number(dbCoupon.maxDiscountAmount);
            }
          } else {
            discountAmount = Number(dbCoupon.discountValue);
          }
          discountAmount = Math.min(discountAmount, basePrice);
        }
      }
    }

    const finalAmount = Math.max(0, basePrice - discountAmount);

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TY0J274cB5Ztcg';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'NHKoptikj7H2TiBvDl0rno3F';

    // If 100% discount, bypass gateway
    if (finalAmount <= 0) {
      return NextResponse.json({
        success: true,
        bypassPayment: true,
        amount: 0,
        currency: 'INR',
        planCode: plan.code,
        planName: plan.name,
        finalAmount: 0,
        discountAmount,
        isAutopay: Boolean(isAutopay),
      });
    }

    // Amount in paise for Razorpay
    const amountInPaise = Math.round(finalAmount * 100);
    const receiptId = `sub_${libraryId.slice(0, 8)}_${Date.now()}`.slice(0, 40);

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          libraryId,
          planCode: plan.code,
          planName: plan.name,
          durationMonths: months,
          isAutopay: isAutopay ? 'true' : 'false',
          userEmail: userEmail || library.owner?.email || '',
        },
      }),
    });

    if (!rzpResponse.ok) {
      const errData = await rzpResponse.json();
      console.error('Razorpay order creation failed:', errData);
      return NextResponse.json(
        { error: errData.error?.description || 'Failed to create Razorpay order' },
        { status: 500 }
      );
    }

    const rzpOrder = await rzpResponse.json();

    // RECORD INITIATED / PENDING PAYMENT IN DATABASE
    try {
      await prisma.payment.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          amount: finalAmount,
          currency: 'INR',
          provider: 'RAZORPAY',
          status: 'PENDING',
          providerOrderId: rzpOrder.id,
          idempotencyKey: `init_${rzpOrder.id}`,
          metadata: {
            planCode: plan.code,
            planName: plan.name,
            durationMonths: months,
            isAutopay: Boolean(isAutopay),
            originalAmount: basePrice,
            discountApplied: discountAmount,
            couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
            initiatedAt: new Date().toISOString(),
            paidByEmail: userEmail || library.owner?.email,
            statusDetail: isAutopay ? 'Payment Initiated (Monthly Autopay Enabled)' : 'Payment Initiated in Razorpay Modal',
          },
        },
      });
    } catch (dbErr) {
      console.warn('Could not pre-record pending payment:', dbErr);
    }

    return NextResponse.json({
      success: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId,
      planCode: plan.code,
      planName: plan.name,
      finalAmount,
      discountAmount,
    });
  } catch (error: any) {
    console.error('API POST /subscription/create-order error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
