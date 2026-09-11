import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, amount } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    let coupon: any = null;

    try {
      coupon = await prisma.coupon.findUnique({
        where: { code: cleanCode },
        include: {
          _count: {
            select: { usages: true },
          },
        },
      });
    } catch (dbErr) {
      console.warn('[Coupon Validate] Prisma query error:', dbErr);
    }

    // Fallback: check Express backend if prisma returned null or threw an error
    if (!coupon) {
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
          const found = list.find((c: any) => c.code?.toUpperCase() === cleanCode);
          if (found) {
            coupon = {
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
        console.warn('[Coupon Validate] Backend fallback query error:', bErr);
      }
    }

    if (!coupon) {
      return NextResponse.json({ error: `Coupon code '${cleanCode}' is invalid or does not exist` }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: `Coupon '${cleanCode}' has been disabled by admin` }, { status: 400 });
    }

    const now = new Date();
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return NextResponse.json({ error: `Coupon '${cleanCode}' is not active yet` }, { status: 400 });
    }

    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return NextResponse.json({ error: `Coupon '${cleanCode}' has expired` }, { status: 400 });
    }

    const usageCount = coupon._count?.usages ?? coupon.usageCount ?? 0;
    if (coupon.maxRedemptions && usageCount >= Number(coupon.maxRedemptions)) {
      return NextResponse.json({ error: `Coupon '${cleanCode}' has reached its maximum redemptions` }, { status: 400 });
    }

    const orderAmount = Number(amount || 0);
    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount)) {
      return NextResponse.json(
        { error: `Minimum order amount of ₹${coupon.minOrderAmount} required for coupon '${cleanCode}'` },
        { status: 400 }
      );
    }

    let discount = 0;
    const discountVal = Number(coupon.discountValue);
    const discountType = (coupon.discountType || 'PERCENTAGE').toUpperCase();

    if (discountType === 'PERCENTAGE') {
      discount = Math.round((orderAmount * discountVal) / 100);
      if (coupon.maxDiscountAmount && discount > Number(coupon.maxDiscountAmount)) {
        discount = Number(coupon.maxDiscountAmount);
      }
    } else {
      // FIXED / FLAT discount
      discount = discountVal;
    }

    discount = Math.min(discount, orderAmount);

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: discountType,
        discountValue: discountVal,
        maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
        minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      },
      discountAmount: discount,
      finalAmount: Math.max(0, orderAmount - discount),
    });
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: error.message || 'Server error during coupon validation' }, { status: 500 });
  }
}
