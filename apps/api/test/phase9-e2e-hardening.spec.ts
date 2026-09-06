import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';
import { authService } from '../src/modules/auth/auth.service';
import { createHmac } from 'crypto';

describe('Phase 9: End-to-End Hardening & Security Verification', () => {
  const app = createApp();

  // Tenant 1
  let user1Token: string;
  let library1Id: string;

  // Tenant 2 (Adversary / Unrelated Study Center)
  let user2Token: string;
  let library2Id: string;

  beforeEach(async () => {
    dataStore.clear();

    // 1. Setup Tenant 1
    const u1 = dataStore.createUser({
      email: 'owner1@studyspace.com',
      fullName: 'Owner One',
      role: 'USER',
    });
    user1Token = authService.generateTokens(u1).accessToken;

    const lib1 = dataStore.createLibrary(u1.id, {
      name: 'Alpha Study Haven',
      contactPhone: '9988776655',
    });
    library1Id = lib1.id;

    // 2. Setup Tenant 2
    const u2 = dataStore.createUser({
      email: 'adversary@competitorlibrary.com',
      fullName: 'Owner Two',
      role: 'USER',
    });
    user2Token = authService.generateTokens(u2).accessToken;

    const lib2 = dataStore.createLibrary(u2.id, {
      name: 'Beta Reading Lounge',
      contactPhone: '9123456789',
    });
    library2Id = lib2.id;
  });

  it('Boundary Hardening: Complete cross-tenant data tampering prevention', async () => {
    // Tenant 1 creates a student
    const student1 = dataStore.createStudent(library1Id, {
      fullName: 'Confidential Student',
      phone: '9876543210',
      kycDocId: 'secure-vault-doc-123',
      kycDocType: 'AADHAAR',
    });

    // Tenant 2 attempts to query Tenant 1's student directory
    const breachListRes = await request(app)
      .get(`/api/v1/libraries/${library1Id}/students`)
      .set('Authorization', `Bearer ${user2Token}`)
      .set('X-Library-Id', library1Id);
    expect(breachListRes.status).toBe(403);
    expect(breachListRes.body.error.code).toBe('TENANT_ACCESS_DENIED');

    // Tenant 2 attempts to delete Tenant 1's student
    const breachDeleteRes = await request(app)
      .delete(`/api/v1/libraries/${library1Id}/students/${student1.id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .set('X-Library-Id', library1Id);
    expect(breachDeleteRes.status).toBe(403);

    // Tenant 2 attempts to request signed KYC view URL for Tenant 1's student
    const breachKycRes = await request(app)
      .get(`/api/v1/libraries/${library1Id}/storage/kyc-url/${student1.id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .set('X-Library-Id', library1Id);
    expect(breachKycRes.status).toBe(403);
  });

  it('Anti-Tampering & Shift Collision Hardening: Desk overbooking prevention', async () => {
    // 1. Tenant 1 creates a room and row
    const roomRes = await request(app)
      .post(`/api/v1/libraries/${library1Id}/spaces/rooms`)
      .set('Authorization', `Bearer ${user1Token}`)
      .set('X-Library-Id', library1Id)
      .send({ name: 'Silent Zone' });
    const roomId = roomRes.body.data.id;

    const rowRes = await request(app)
      .post(`/api/v1/libraries/${library1Id}/spaces/rows`)
      .set('Authorization', `Bearer ${user1Token}`)
      .set('X-Library-Id', library1Id)
      .send({ roomId, name: 'Row A' });
    const rowId = rowRes.body.data.id;

    // Generate seats
    const genRes = await request(app)
      .post(`/api/v1/libraries/${library1Id}/spaces/seats/batch-generate`)
      .set('Authorization', `Bearer ${user1Token}`)
      .set('X-Library-Id', library1Id)
      .send({ rowId, prefix: 'A', startNumber: 1, count: 5 });
    expect(genRes.status).toBe(201);
    const seat1 = genRes.body.data.seats[0];

    // Create 3 students
    const s1 = dataStore.createStudent(library1Id, { fullName: 'Student One', phone: '9000000001', kycDocType: 'AADHAAR' });
    const s2 = dataStore.createStudent(library1Id, { fullName: 'Student Two', phone: '9000000002', kycDocType: 'AADHAAR' });
    const s3 = dataStore.createStudent(library1Id, { fullName: 'Student Three', phone: '9000000003', kycDocType: 'AADHAAR' });

    // 1. Assign Student 1 to Seat 1 in MORNING shift
    const assign1 = await request(app)
      .post(`/api/v1/libraries/${library1Id}/memberships`)
      .set('Authorization', `Bearer ${user1Token}`)
      .set('X-Library-Id', library1Id)
      .send({
        studentId: s1.id,
        startDate: '2026-09-01',
        expectedEndDate: '2026-10-01',
        feeAmount: 1200,
        shift: 'MORNING',
        seatId: seat1.id,
      });
    expect(assign1.status).toBe(201);

    // 2. Assign Student 2 to the SAME Seat 1 in a DIFFERENT (EVENING) shift -> Allowed!
    const assign2 = await request(app)
      .post(`/api/v1/libraries/${library1Id}/memberships`)
      .set('Authorization', `Bearer ${user1Token}`)
      .set('X-Library-Id', library1Id)
      .send({
        studentId: s2.id,
        startDate: '2026-09-01',
        expectedEndDate: '2026-10-01',
        feeAmount: 1200,
        shift: 'EVENING',
        seatId: seat1.id,
      });
    expect(assign2.status).toBe(201);

    // 3. Attempt to assign Student 3 to the SAME Seat 1 in the SAME (MORNING) shift -> MUST CLASH with 409!
    const clashRes = await request(app)
      .post(`/api/v1/libraries/${library1Id}/memberships`)
      .set('Authorization', `Bearer ${user1Token}`)
      .set('X-Library-Id', library1Id)
      .send({
        studentId: s3.id,
        startDate: '2026-09-01',
        expectedEndDate: '2026-10-01',
        feeAmount: 1200,
        shift: 'MORNING',
        seatId: seat1.id,
      });
    expect(clashRes.status).toBe(409);
    expect(clashRes.body.error.code).toBe('SEAT_OCCUPIED_FOR_SHIFT');
  });

  it('Webhook Forgery Hardening: Invalid HMAC signatures are rejected', async () => {
    const webhookPayload = {
      payment_id: 'pay_spoofed_999',
      order_id: 'order_123',
      amount: 99900,
    };

    // Fake signature
    const forgedSignature = 'fake-forged-hmac-signature-abcdef123456';

    const spoofRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-provider', 'RAZORPAY')
      .set('x-signature', forgedSignature)
      .send(webhookPayload);

    // Must be rejected with 400 Bad Request
    expect(spoofRes.status).toBe(400);
    expect(spoofRes.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('Webhook Idempotency Stress Test: 3 identical deliveries succeed idempotently with zero duplicates', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post(`/api/v1/libraries/${library1Id}/subscriptions/orders`)
      .set('Authorization', `Bearer ${user1Token}`)
      .set('X-Library-Id', library1Id)
      .send({
        planId: 'plan-basic',
        billingCycle: 'MONTHLY',
        provider: 'RAZORPAY',
      });
    expect(orderRes.status).toBe(201);
    const order = orderRes.body.data;

    const webhookPayload = {
      payment_id: 'pay_stress_test_888',
      order_id: order.providerOrderId,
      amount: order.finalAmount,
    };

    // Deliver 1
    const d1 = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-provider', 'RAZORPAY')
      .set('x-signature', 'valid_mock_signature')
      .send(webhookPayload);
    expect(d1.status).toBe(200);
    expect(d1.body.data.acknowledged).toBe(true);
    expect(d1.body.data.duplicate).toBe(false);

    // Deliver 2 (duplicate retry)
    const d2 = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-provider', 'RAZORPAY')
      .set('x-signature', 'valid_mock_signature')
      .send(webhookPayload);
    expect(d2.status).toBe(200);
    expect(d2.body.data.acknowledged).toBe(true);
    expect(d2.body.data.duplicate).toBe(true);
    expect(d2.body.data.status).toBe('ALREADY_PROCESSED');

    // Deliver 3 (third retry)
    const d3 = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-provider', 'RAZORPAY')
      .set('x-signature', 'valid_mock_signature')
      .send(webhookPayload);
    expect(d3.status).toBe(200);
    expect(d3.body.data.acknowledged).toBe(true);
    expect(d3.body.data.duplicate).toBe(true);
    expect(d3.body.data.status).toBe('ALREADY_PROCESSED');

    // Verify payments recorded in store: exactly ONE payment with this provider payment id
    const matchingPayments = Array.from(dataStore.payments.values()).filter(
      (p) => p.providerPaymentId === 'pay_stress_test_888'
    );
    expect(matchingPayments.length).toBe(1);
  });
});
