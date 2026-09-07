import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
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
