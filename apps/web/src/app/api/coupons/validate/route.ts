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
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive coupon code' }, { status: 400 });
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    if (coupon.maxRedemptions && coupon._count.usages >= coupon.maxRedemptions) {
      return NextResponse.json({ error: 'This coupon has reached its maximum redemptions' }, { status: 400 });
    }

    const orderAmount = Number(amount || 0);
    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount)) {
      return NextResponse.json(
        { error: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.round((orderAmount * Number(coupon.discountValue)) / 100);
      if (coupon.maxDiscountAmount && discount > Number(coupon.maxDiscountAmount)) {
        discount = Number(coupon.maxDiscountAmount);
      }
    } else {
      discount = Number(coupon.discountValue);
    }

    discount = Math.min(discount, orderAmount);

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
      },
      discountAmount: discount,
      finalAmount: Math.max(0, orderAmount - discount),
    });
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
