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
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      planCode = 'BASIC',
      couponCode,
      userEmail,
      bypassPayment = false,
      isAutopay = false,
    } = body;

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
    let appliedCoupon: any = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      let dbCoupon: any = null;

      try {
        dbCoupon = await prisma.coupon.findUnique({
          where: { code: cleanCoupon },
        });
      } catch (dbErr) {
        console.warn('Prisma coupon query in verify route error:', dbErr);
      }

      // Backend fallback if not in local Prisma
      if (!dbCoupon) {
        try {
          const rawBackendUrl =
            process.env.NEXT_PUBLIC_API_URL ||
            process.env.RENDER_BACKEND_URL ||
            'https://seelibrarybackend.onrender.com';
          const backendOrigin = rawBackendUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
          const bRes = await fetch(`${backendOrigin}/api/v1/admin/coupons`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(4000),
          });
          if (bRes.ok) {
            const bData = await bRes.json();
            const list = bData.coupons || bData.data || [];
            const found = list.find((c: any) => c.code?.toUpperCase() === cleanCoupon);
            if (found) {
              dbCoupon = {
                id: found.id,
                code: found.code,
                discountType: found.discountType,
                discountValue: Number(found.discountValue),
                maxDiscountAmount: found.maxDiscount ? Number(found.maxDiscount) : null,
                minOrderAmount: found.minOrderAmount ? Number(found.minOrderAmount) : null,
                validFrom: new Date(found.validFrom),
                validUntil: found.validUntil ? new Date(found.validUntil) : null,
                isActive: Boolean(found.isActive),
              };
            }
          }
        } catch (bErr) {
          console.warn('Backend coupon fallback error in verify route:', bErr);
        }
      }

      if (dbCoupon && dbCoupon.isActive) {
        const now = new Date();
        const isNotStarted = dbCoupon.validFrom && now < new Date(dbCoupon.validFrom);
        const isExpired = dbCoupon.validUntil && now > new Date(dbCoupon.validUntil);
        const minAmountFailed = dbCoupon.minOrderAmount && basePrice < Number(dbCoupon.minOrderAmount);

        if (!isNotStarted && !isExpired && !minAmountFailed) {
          appliedCoupon = dbCoupon;
          const discVal = Number(dbCoupon.discountValue);
          const discType = (dbCoupon.discountType || 'PERCENTAGE').toUpperCase();
          if (discType === 'PERCENTAGE') {
            discountAmount = Math.round((basePrice * discVal) / 100);
            if (dbCoupon.maxDiscountAmount && discountAmount > Number(dbCoupon.maxDiscountAmount)) {
              discountAmount = Number(dbCoupon.maxDiscountAmount);
            }
          } else {
            discountAmount = discVal;
          }
          discountAmount = Math.min(discountAmount, basePrice);
        }
      }
    }

    const finalAmount = Math.max(0, basePrice - discountAmount);

    // Verify Razorpay HMAC signature unless it was a 100% discount free bypass
    if (!bypassPayment || finalAmount > 0) {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json(
          { error: 'Missing Razorpay payment identification or signature' },
          { status: 400 }
        );
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'NHKoptikj7H2TiBvDl0rno3F';
      const textToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(textToSign)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.error('Invalid Razorpay signature mismatch');
        return NextResponse.json(
          { error: 'Payment signature verification failed. Possible fraud attempt.' },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // Check for existing active subscription to stack validity
    const existingActiveSub = await prisma.subscription.findFirst({
      where: {
        libraryId,
        status: { in: ['ACTIVE', 'MANUAL'] },
        endDate: { gt: now },
      },
      orderBy: { endDate: 'desc' },
    });

    let targetSubscriptionId: string;
    let subStartDate: Date;
    let previousEndDate: Date | null = null;
    let newEndDate: Date;

    const daysToAdd = months * 30;

    if (existingActiveSub) {
      // Validity Stacking: Increment from the current endDate!
      previousEndDate = new Date(existingActiveSub.endDate);
      newEndDate = new Date(previousEndDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      subStartDate = existingActiveSub.startDate;
      targetSubscriptionId = existingActiveSub.id;

      await prisma.subscription.update({
        where: { id: existingActiveSub.id },
        data: {
          planId: plan.id,
          endDate: newEndDate,
          status: 'ACTIVE',
          provider: 'RAZORPAY',
          autoRenew: Boolean(isAutopay),
          autoRenewCancelledAt: isAutopay ? null : existingActiveSub.autoRenewCancelledAt,
          updatedAt: new Date(),
        },
      });
    } else {
      // Fresh or expired subscription: Start from today
      subStartDate = now;
      newEndDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      targetSubscriptionId = crypto.randomUUID();

      await prisma.subscription.create({
        data: {
          id: targetSubscriptionId,
          libraryId,
          planId: plan.id,
          userId: library.ownerId,
          status: 'ACTIVE',
          startDate: subStartDate,
          endDate: newEndDate,
          provider: 'RAZORPAY',
          autoRenew: Boolean(isAutopay),
          autoRenewCancelledAt: null,
        },
      });
    }

    // Check if initiated payment exists
    const effectivePaymentId = razorpay_payment_id || `FREE-${Date.now()}`;
    const effectiveOrderId = razorpay_order_id || `ORD-${Date.now()}`;

    let existingPayment = null;
    if (razorpay_order_id) {
      existingPayment = await prisma.payment.findFirst({
        where: {
          libraryId,
          providerOrderId: razorpay_order_id,
        },
      });
    }

    let savedPayment;
    if (existingPayment) {
      const curMeta = (existingPayment.metadata || {}) as Record<string, any>;
      savedPayment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          subscriptionId: targetSubscriptionId,
          amount: finalAmount,
          status: 'SUCCESS',
          providerPaymentId: effectivePaymentId,
          metadata: {
            ...curMeta,
            planCode: plan.code,
            planName: plan.name,
            durationMonths: months,
            isAutopay: Boolean(isAutopay),
            previousEndDate: previousEndDate ? previousEndDate.toISOString() : null,
            newEndDate: newEndDate.toISOString(),
            originalAmount: basePrice,
            discountApplied: discountAmount,
            couponCode: appliedCoupon ? appliedCoupon.code : (couponCode ? String(couponCode).trim().toUpperCase() : null),
            razorpay_payment_id: effectivePaymentId,
            razorpay_order_id: effectiveOrderId,
            paidByEmail: userEmail || library.owner?.email,
            verifiedAt: new Date().toISOString(),
            statusDetail: 'Success - Subscription Activated',
          },
        },
      });
    } else {
      savedPayment = await prisma.payment.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          subscriptionId: targetSubscriptionId,
          amount: finalAmount,
          currency: 'INR',
          provider: 'RAZORPAY',
          status: 'SUCCESS',
          providerPaymentId: effectivePaymentId,
          providerOrderId: effectiveOrderId,
          idempotencyKey: `rzp_${effectivePaymentId}`,
          metadata: {
            planCode: plan.code,
            planName: plan.name,
            durationMonths: months,
            isAutopay: Boolean(isAutopay),
            previousEndDate: previousEndDate ? previousEndDate.toISOString() : null,
            newEndDate: newEndDate.toISOString(),
            originalAmount: basePrice,
            discountApplied: discountAmount,
            couponCode: appliedCoupon ? appliedCoupon.code : (couponCode ? String(couponCode).trim().toUpperCase() : null),
            razorpay_payment_id: effectivePaymentId,
            razorpay_order_id: effectiveOrderId,
            paidByEmail: userEmail || library.owner?.email,
            verifiedAt: new Date().toISOString(),
            statusDetail: 'Success - Subscription Activated',
          },
        },
      });
    }

    // Record Coupon usage if applicable
    if (appliedCoupon) {
      try {
        await prisma.couponUsage.create({
          data: {
            id: crypto.randomUUID(),
            couponId: appliedCoupon.id,
            userId: library.ownerId,
            paymentId: savedPayment.id,
            discountApplied: discountAmount,
          },
        });
      } catch (cErr) {
        console.warn('Coupon usage record error:', cErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Subscription '${plan.name}' activated successfully via Razorpay!`,
      subscription: {
        id: targetSubscriptionId,
        planCode: plan.code,
        planName: plan.name,
        startDate: subStartDate.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0],
        status: 'ACTIVE',
      },
      payment: {
        id: savedPayment.id,
        amount: finalAmount,
        provider: 'RAZORPAY',
        status: 'SUCCESS',
        paymentId: effectivePaymentId,
        orderId: effectiveOrderId,
      },
    });
  } catch (error: any) {
    console.error('API POST /subscription/verify error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
