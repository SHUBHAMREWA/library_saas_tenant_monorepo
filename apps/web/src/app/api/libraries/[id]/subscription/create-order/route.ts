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
    let appliedCouponObj: any = null;

    // Validate Coupon if provided
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
