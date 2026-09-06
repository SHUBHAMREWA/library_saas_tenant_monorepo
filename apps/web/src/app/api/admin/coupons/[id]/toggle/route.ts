import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });

    return NextResponse.json({
      success: true,
      coupon: {
        id: updated.id,
        code: updated.code,
        isActive: updated.isActive,
      },
    });
  } catch (error: any) {
    console.error('API PUT /api/admin/coupons/[id]/toggle error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
