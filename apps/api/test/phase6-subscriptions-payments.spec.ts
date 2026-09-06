import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';

describe('Phase 6: Subscriptions, Payments & Webhooks', () => {
  const app = createApp();
  let token: string;
  let libraryId: string;

  beforeEach(async () => {
    dataStore.clear();

    const authRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.billing@example.com', otp: '123456' });
    token = authRes.body.data.accessToken;

    const libRes = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Apex Billing Study Center',
        contactPhone: '9876543210',
      });
    libraryId = libRes.body.data.id;
  });

  it('Plans & Coupon Engine: Calculates percentage and cap accurately', async () => {
    // 1. List plans
    const plansRes = await request(app).get('/api/v1/payments/plans');
    expect(plansRes.status).toBe(200);
    expect(plansRes.body.data.length).toBeGreaterThanOrEqual(4);

    // 2. Validate Coupon LIBRARY20 (20% off, min order 500)
    const couponRes = await request(app)
      .post('/api/v1/payments/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        couponCode: 'LIBRARY20',
        orderAmount: 2000,
      });

    expect(couponRes.status).toBe(200);
    expect(couponRes.body.data.discountAmount).toBe(400); // 20% of 2000 = 400
    expect(couponRes.body.data.finalAmount).toBe(1600);
  });

  it('Order Creation & Webhook Idempotency: Duplicate deliveries do not create duplicate records', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/subscriptions/orders`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        planId: 'plan-basic',
        billingCycle: 'MONTHLY',
        couponCode: 'LIBRARY20',
        provider: 'RAZORPAY',
      });

    expect(orderRes.status).toBe(201);
    const providerOrderId = orderRes.body.data.providerOrderId;
    expect(providerOrderId).toBeDefined();

    // 2. First Webhook delivery (payment.captured)
    const webhookPayload = {
      event: 'payment.captured',
      id: 'pay_evt_unique_1001',
      payment_id: 'pay_rzp_999999',
      order_id: providerOrderId,
      amount: orderRes.body.data.finalAmount,
    };

    const firstDelivery = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-provider', 'RAZORPAY')
      .set('x-signature', 'valid_mock_signature')
      .send(webhookPayload);

    expect(firstDelivery.status).toBe(200);
    expect(firstDelivery.body.data.acknowledged).toBe(true);
    expect(firstDelivery.body.data.duplicate).toBe(false);

    // Verify library now has active subscription
    const subStatus1 = await request(app)
      .get(`/api/v1/libraries/${libraryId}/subscriptions/status`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(subStatus1.status).toBe(200);
    expect(subStatus1.body.data.hasActiveSubscription).toBe(true);
    expect(subStatus1.body.data.subscription.status).toBe('ACTIVE');

    const subscriptionCountAfterFirst = dataStore.subscriptions.size;

    // 3. IDEMPOTENCY TEST: Redeliver identical webhook 2nd time
    const secondDelivery = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-provider', 'RAZORPAY')
      .set('x-signature', 'valid_mock_signature')
      .send(webhookPayload);

    expect(secondDelivery.status).toBe(200);
    expect(secondDelivery.body.data.acknowledged).toBe(true);
    expect(secondDelivery.body.data.duplicate).toBe(true);
    expect(secondDelivery.body.data.status).toBe('ALREADY_PROCESSED');

    // Verify subscription count did NOT increase
    expect(dataStore.subscriptions.size).toBe(subscriptionCountAfterFirst);
  });

  it('Admin Manual Subscription Override: Issues standard active subscription', async () => {
    // Authenticate as Super Admin
    const adminUser = dataStore.createUser({
      email: 'superadmin@libraryplatform.com',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
    });
    const adminTokens = (await import('../src/modules/auth/auth.service')).authService.generateTokens(adminUser);

    const grantRes = await request(app)
      .post('/api/v1/payments/admin/manual-grant')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({
        libraryId,
        planId: 'plan-pro',
        startDate: '2026-09-01',
        endDate: '2026-12-01',
        reason: 'Bank NEFT Offline Payment Verified',
      });

    expect(grantRes.status).toBe(201);
    expect(grantRes.body.data.provider).toBe('MANUAL_ADMIN');
    expect(grantRes.body.data.status).toBe('MANUAL');

    // Check that standard subscription check recognizes the library as active!
    const subStatus = await request(app)
      .get(`/api/v1/libraries/${libraryId}/subscriptions/status`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(subStatus.status).toBe(200);
    expect(subStatus.body.data.hasActiveSubscription).toBe(true);
  });
});
