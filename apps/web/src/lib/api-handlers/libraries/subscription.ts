import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDefaultSubscriptionPlans } from '@library/database';
import crypto from 'crypto';

const rawBackendUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.RENDER_BACKEND_URL ||
  'https://seelibrarybackend.onrender.com';

const RENDER_BACKEND_ORIGIN = rawBackendUrl
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/$/, '');

export async function handleGetSubscription(_req: NextRequest, libraryId: string) {
  try {
    let availablePlans: any[] = [];
    let hasActiveSubscription = false;
    let daysRemaining = 0;
    let formattedSub = null;
    let formattedPayments: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
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
        const library = await prisma.library.findUnique({
          where: { id: libraryId },
          select: { ownerId: true },
        });

        const latestSub = await prisma.subscription.findFirst({
          where: {
            OR: [
              { libraryId },
              ...(library?.ownerId ? [{ userId: library.ownerId }] : []),
            ],
            status: { in: ['ACTIVE', 'MANUAL'] },
          },
          include: { plan: true },
          orderBy: { endDate: 'desc' },
        }) || await prisma.subscription.findFirst({
          where: {
            OR: [
              { libraryId },
              ...(library?.ownerId ? [{ userId: library.ownerId }] : []),
            ],
          },
          include: { plan: true },
          orderBy: { endDate: 'desc' },
        });

        if (latestSub) {
          const end = new Date(latestSub.endDate);
          end.setHours(23, 59, 59, 999);
          const isNotExpired = end.getTime() >= now.getTime();
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
          include: {
            couponUsages: {
              include: {
                coupon: true,
              },
            },
          },
          take: 100,
        });

        formattedPayments = payments.map((p) => {
          const meta = (p.metadata || {}) as Record<string, any>;
          const couponUsage = p.couponUsages?.[0];
          const couponCode = meta.couponCode || couponUsage?.coupon?.code || null;
          const discountApplied = Number(meta.discountApplied || couponUsage?.discountApplied || 0);
          const amount = Number(p.amount);
          const originalAmount = Number(meta.originalAmount || (amount + discountApplied));

          return {
            id: p.id,
            amount,
            originalAmount,
            discountApplied,
            couponCode,
            currency: p.currency,
            status: p.status,
            provider: p.provider,
            paymentId: p.providerPaymentId || meta.razorpay_payment_id || p.providerOrderId || p.idempotencyKey,
            orderId: p.providerOrderId || meta.razorpay_order_id || null,
            createdAt: p.createdAt.toISOString(),
            planCode: meta.planCode || 'BASIC',
            planName: meta.planName || (meta.planCode ? `${meta.planCode} Plan` : 'SaaS Plan'),
            durationMonths: meta.durationMonths !== undefined ? Number(meta.durationMonths) : 1,
            adjustmentAction: meta.adjustmentAction || (meta.durationMonths < 0 ? 'DECREASE' : 'INCREASE'),
            daysAdjusted: meta.daysAdjusted !== undefined ? Number(meta.daysAdjusted) : null,
            previousEndDate: meta.previousEndDate || null,
            newEndDate: meta.newEndDate || null,
            failureReason: meta.failureReason || null,
            statusDetail: meta.statusDetail || null,
          };
        });
      } catch (dbErr) {
        console.warn('[subscription] Prisma query failed, falling back to Render backend:', dbErr);
      }
    }

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

export async function handleCreateOrder(req: NextRequest, libraryId: string) {
  try {
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
    let appliedCouponObj: any = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      let dbCoupon: any = null;

      try {
        dbCoupon = await prisma.coupon.findUnique({
          where: { code: cleanCoupon },
          include: {
            _count: {
              select: { usages: true },
            },
          },
        });
      } catch (dbErr) {
        console.warn('Prisma coupon query in create-order error:', dbErr);
      }

      if (!dbCoupon) {
        try {
          const backendOrigin = RENDER_BACKEND_ORIGIN;
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
                maxRedemptions: found.maxUses ? Number(found.maxUses) : null,
                validFrom: new Date(found.validFrom),
                validUntil: found.validUntil ? new Date(found.validUntil) : null,
                isActive: Boolean(found.isActive),
                _count: { usages: found.usedCount || 0 },
              };
            }
          }
        } catch (bErr) {
          console.warn('Backend coupon fallback error in create-order:', bErr);
        }
      }

      if (!dbCoupon) {
        return NextResponse.json(
          { error: `Coupon '${cleanCoupon}' is invalid or does not exist` },
          { status: 400 }
        );
      }

      if (!dbCoupon.isActive) {
        return NextResponse.json(
          { error: `Coupon '${cleanCoupon}' has been disabled by admin` },
          { status: 400 }
        );
      }

      const now = new Date();
      if (dbCoupon.validFrom && now < new Date(dbCoupon.validFrom)) {
        return NextResponse.json(
          { error: `Coupon '${cleanCoupon}' is not active yet` },
          { status: 400 }
        );
      }

      if (dbCoupon.validUntil && now > new Date(dbCoupon.validUntil)) {
        return NextResponse.json(
          { error: `Coupon '${cleanCoupon}' has expired` },
          { status: 400 }
        );
      }

      const usageCount = dbCoupon._count?.usages ?? dbCoupon.usageCount ?? 0;
      if (dbCoupon.maxRedemptions && usageCount >= Number(dbCoupon.maxRedemptions)) {
        return NextResponse.json(
          { error: `Coupon '${cleanCoupon}' has reached its maximum redemptions` },
          { status: 400 }
        );
      }

      if (dbCoupon.minOrderAmount && basePrice < Number(dbCoupon.minOrderAmount)) {
        return NextResponse.json(
          { error: `Coupon '${cleanCoupon}' requires a minimum order amount of ₹${dbCoupon.minOrderAmount}` },
          { status: 400 }
        );
      }

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
      appliedCouponObj = dbCoupon;
    }

    const finalAmount = Math.max(0, basePrice - discountAmount);
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TY0J274cB5Ztcg';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'NHKoptikj7H2TiBvDl0rno3F';

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

export async function handleVerifySubscription(req: NextRequest, libraryId: string) {
  try {
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

      if (!dbCoupon) {
        try {
          const backendOrigin = RENDER_BACKEND_ORIGIN;
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

export async function handleCancelAutopay(req: NextRequest, libraryId: string) {
  try {
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

    const updatedSub = await prisma.subscription.update({
      where: { id: activeSub.id },
      data: {
        autoRenew: false,
        autoRenewCancelledAt: cancelledAt,
        cancellationReason: reason,
        updatedAt: cancelledAt,
      },
    });

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

export async function handleRecordFailure(req: NextRequest, libraryId: string) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      error_code,
      error_description,
      error_source,
      error_reason,
      planCode = 'BASIC',
      amount = 0,
      userEmail,
    } = body;

    const failureReason =
      error_description ||
      error_reason ||
      'Payment was cancelled or rejected by gateway/bank';

    let existingPayment = null;
    if (razorpay_order_id) {
      existingPayment = await prisma.payment.findFirst({
        where: {
          libraryId,
          providerOrderId: razorpay_order_id,
        },
      });
    }

    if (existingPayment) {
      const currentMeta = (existingPayment.metadata || {}) as Record<string, any>;
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'FAILED',
          providerPaymentId: razorpay_payment_id || existingPayment.providerPaymentId,
          metadata: {
            ...currentMeta,
            errorCode: error_code || 'GATEWAY_ERROR',
            errorSource: error_source || 'client_gateway',
            failureReason,
            failedAt: new Date().toISOString(),
            statusDetail: `Rejected: ${failureReason}`,
          },
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          id: crypto.randomUUID(),
          libraryId,
          amount: amount,
          currency: 'INR',
          provider: 'RAZORPAY',
          status: 'FAILED',
          providerOrderId: razorpay_order_id || null,
          providerPaymentId: razorpay_payment_id || null,
          idempotencyKey: `fail_${razorpay_order_id || Date.now()}-${Math.floor(Math.random() * 1000)}`,
          metadata: {
            planCode,
            errorCode: error_code || 'GATEWAY_ERROR',
            failureReason,
            failedAt: new Date().toISOString(),
            paidByEmail: userEmail,
            statusDetail: `Rejected: ${failureReason}`,
          },
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Payment failure recorded' });
  } catch (error: any) {
    console.error('API POST /subscription/record-failure error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}