import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        _count: {
          select: { usages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
      maxRedemptions: c.maxRedemptions,
      perUserLimit: c.perUserLimit,
      validFrom: c.validFrom.toISOString(),
      validUntil: c.validUntil.toISOString(),
      isActive: c.isActive,
      usageCount: c._count.usages,
    }));

    return NextResponse.json({ success: true, coupons: formatted });
  } catch (error: any) {
    console.error('API GET /api/admin/coupons error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      discountType = 'PERCENTAGE',
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      maxRedemptions,
      perUserLimit = 1,
      validUntil,
    } = body;

    if (!code || !discountValue) {
      return NextResponse.json({ error: 'Code and discountValue are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Coupon code '${cleanCode}' already exists.` }, { status: 409 });
    }

    const now = new Date();
    const expiry = validUntil ? new Date(validUntil) : new Date(now.getTime() + 90 * 86400000);

    const coupon = await prisma.coupon.create({
      data: {
        id: crypto.randomUUID(),
        code: cleanCode,
        discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
        discountValue,
        minOrderAmount: minOrderAmount || null,
        maxDiscountAmount: maxDiscountAmount || null,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        perUserLimit: Number(perUserLimit) || 1,
        validFrom: now,
        validUntil: expiry,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        isActive: coupon.isActive,
      },
    });
  } catch (error: any) {
    console.error('API POST /api/admin/coupons error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
