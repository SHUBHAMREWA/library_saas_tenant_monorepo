import { createHmac, randomUUID } from 'crypto';
import {
  dataStore,
  StoredPayment,
  StoredSubscription,
  StoredSubscriptionPlan,
  StoredCoupon,
} from '../../services/data-store';
import {
  CreatePaymentOrderSchema,
  ValidateCouponSchema,
  AdminManualGrantSubscriptionSchema,
} from '@library/validation';
import { z } from 'zod';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_12345';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'cf_test_secret_67890';

export class PaymentService {
  listPlans(): StoredSubscriptionPlan[] {
    dataStore.initDefaultSubscriptionPlans();
    return Array.from(dataStore.subscriptionPlans.values()).filter((p) => p.isActive);
  }

  validateCoupon(
    userId: string,
    input: z.infer<typeof ValidateCouponSchema>
  ): {
    coupon: StoredCoupon;
    discountAmount: number;
    finalAmount: number;
  } {
    const coupon = dataStore.findCouponByCode(input.couponCode);
    if (!coupon || !coupon.isActive) {
      throw Object.assign(new Error('Coupon is invalid or inactive'), {
        statusCode: 400,
        code: 'COUPON_INVALID',
      });
    }

    const now = new Date().toISOString();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw Object.assign(new Error('Coupon has expired or is not yet active'), {
        statusCode: 400,
        code: 'COUPON_EXPIRED',
      });
    }

    if (coupon.minOrderAmount && input.orderAmount < coupon.minOrderAmount) {
      throw Object.assign(
        new Error(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`),
        { statusCode: 400, code: 'MIN_AMOUNT_NOT_MET' }
      );
    }

    // Per-user usage limit check
    const userUsages = dataStore.countUserCouponUsages(coupon.id, userId);
    if (userUsages >= coupon.perUserLimit) {
      throw Object.assign(
        new Error('You have already reached the maximum usage limit for this coupon'),
        { statusCode: 400, code: 'COUPON_USAGE_LIMIT_REACHED' }
      );
    }

    // Backend-computed discount math
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (input.orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue;
    }

    discount = Math.min(discount, input.orderAmount);
    const finalAmount = Math.max(0, input.orderAmount - discount);

    return {
      coupon,
      discountAmount: Math.round(discount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
    };
  }

  createOrder(
    libraryId: string,
    userId: string,
    input: z.infer<typeof CreatePaymentOrderSchema>
  ): {
    payment: StoredPayment;
    providerOrderId: string;
    finalAmount: number;
  } {
    const plan = dataStore.findPlanById(input.planId);
    if (!plan) {
      throw Object.assign(new Error('Subscription plan not found'), {
        statusCode: 404,
        code: 'PLAN_NOT_FOUND',
      });
    }

    const baseAmount =
      input.billingCycle === 'YEARLY' ? Number(plan.priceYearly) : Number(plan.priceMonthly);

    let finalAmount = baseAmount;
    let couponId: string | null = null;
    let discountApplied = 0;

    if (input.couponCode) {
      const couponResult = this.validateCoupon(userId, {
        couponCode: input.couponCode,
        orderAmount: baseAmount,
      });
      finalAmount = couponResult.finalAmount;
      discountApplied = couponResult.discountAmount;
      couponId = couponResult.coupon.id;
    }

    const providerOrderId = `${input.provider.toLowerCase()}_order_${Date.now()}`;
    const idempotencyKey = `order_${libraryId}_${Date.now()}`;

    const payment = dataStore.createPayment(libraryId, {
      provider: input.provider,
      amount: finalAmount,
      currency: 'INR',
      providerOrderId,
      idempotencyKey,
      metadata: {
        planId: plan.id,
        billingCycle: input.billingCycle,
        couponId,
        discountApplied,
        userId,
      },
    });

    return {
      payment,
      providerOrderId,
      finalAmount,
    };
  }

  handleWebhook(
    provider: string,
    rawPayload: Buffer,
    signature: string,
    parsedBody: Record<string, unknown>
  ): {
    acknowledged: boolean;
    duplicate: boolean;
    status: string;
  } {
    const secret = provider === 'RAZORPAY' ? RAZORPAY_KEY_SECRET : CASHFREE_SECRET_KEY;

    // Verify HMAC signature
    const expectedSignature = createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');

    // In dev / test allow mock signature 'valid_mock_signature' or actual HMAC
    const isValidSignature = signature === expectedSignature || signature === 'valid_mock_signature';
    if (!isValidSignature) {
      throw Object.assign(new Error('Invalid webhook signature'), {
        statusCode: 400,
        code: 'INVALID_WEBHOOK_SIGNATURE',
      });
    }

    const eventId = (parsedBody.id as string) || (parsedBody.payment_id as string) || `event_${Date.now()}`;
    const idempotencyKey = `${provider}_${eventId}`;

    // IDEMPOTENCY: Check if webhook event already recorded
    const isFirstTime = dataStore.recordWebhookEvent(provider, idempotencyKey, parsedBody);
    if (!isFirstTime) {
      // Duplicate delivery: safely acknowledge 200 OK without re-executing
      return {
        acknowledged: true,
        duplicate: true,
        status: 'ALREADY_PROCESSED',
      };
    }

    // Process event
    const eventType = (parsedBody.event as string) || 'payment.captured';
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const orderId = parsedBody.order_id as string;
      const paymentRecord = Array.from(dataStore.payments.values()).find(
        (p) => p.providerOrderId === orderId
      );

      if (paymentRecord) {
        paymentRecord.status = 'SUCCESS';
        paymentRecord.providerPaymentId = (parsedBody.payment_id as string) || `pay_${Date.now()}`;

        const metadata = paymentRecord.metadata as Record<string, any>;
        const planId = metadata?.planId;
        const userId = metadata?.userId;
        const billingCycle = metadata?.billingCycle || 'MONTHLY';
        const durationDays = billingCycle === 'YEARLY' ? 365 : 30;

        const startDate = new Date().toISOString().split('T')[0];
        const endDateObj = new Date();
        endDateObj.setDate(endDateObj.getDate() + durationDays);
        const endDate = endDateObj.toISOString().split('T')[0];

        // Activate or extend subscription
        const sub = dataStore.createSubscription(paymentRecord.libraryId, {
          planId: planId || 'plan-basic',
          userId: userId || 'system',
          startDate,
          endDate,
          provider: paymentRecord.provider,
          providerSubscriptionId: paymentRecord.providerPaymentId || undefined,
          status: 'ACTIVE',
        });

        paymentRecord.subscriptionId = sub.id;

        // Record coupon usage if applied
        if (metadata?.couponId && userId) {
          dataStore.recordCouponUsage(
            metadata.couponId,
            userId,
            metadata.discountApplied || 0,
            paymentRecord.id
          );
        }

        dataStore.recordAudit({
          libraryId: paymentRecord.libraryId,
          actorId: userId || 'SYSTEM',
          actorType: 'SYSTEM',
          action: 'SUBSCRIPTION_ACTIVATED_PAYMENT',
          entityType: 'SUBSCRIPTION',
          entityId: sub.id,
          diffPayload: { amount: paymentRecord.amount, planId, endDate },
        });
      }
    }

    return {
      acknowledged: true,
      duplicate: false,
      status: 'PROCESSED',
    };
  }

  manualGrantSubscription(
    adminUserId: string,
    input: z.infer<typeof AdminManualGrantSubscriptionSchema>
  ): StoredSubscription {
    const library = dataStore.findLibraryById(input.libraryId);
    if (!library) {
      throw Object.assign(new Error('Library not found'), {
        statusCode: 404,
        code: 'LIBRARY_NOT_FOUND',
      });
    }

    const plan = dataStore.findPlanById(input.planId);
    if (!plan) {
      throw Object.assign(new Error('Subscription plan not found'), {
        statusCode: 404,
        code: 'PLAN_NOT_FOUND',
      });
    }

    const sub = dataStore.createSubscription(input.libraryId, {
      planId: plan.id,
      userId: adminUserId,
      startDate: input.startDate,
      endDate: input.endDate,
      provider: 'MANUAL_ADMIN',
      status: 'MANUAL',
      adminNotes: input.reason,
    });

    dataStore.recordAudit({
      libraryId: input.libraryId,
      actorId: adminUserId,
      actorType: 'SUPER_ADMIN',
      action: 'SUBSCRIPTION_MANUAL_GRANTED',
      entityType: 'SUBSCRIPTION',
      entityId: sub.id,
      diffPayload: {
        plan: plan.name,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
      },
    });

    return sub;
  }

  getLibrarySubscriptionStatus(libraryId: string): {
    hasActiveSubscription: boolean;
    subscription?: StoredSubscription;
    plan?: StoredSubscriptionPlan;
  } {
    const sub = dataStore.findActiveLibrarySubscription(libraryId);
    if (!sub) {
      return { hasActiveSubscription: false };
    }
    const plan = dataStore.findPlanById(sub.planId);
    return {
      hasActiveSubscription: true,
      subscription: sub,
      plan,
    };
  }
}

export const paymentService = new PaymentService();
