import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';

describe('Phase 1: Authentication & Multi-Tenant Isolation', () => {
  const app = createApp();

  beforeEach(() => {
    dataStore.clear();
  });

  it('Flow: User requests OTP, verifies OTP, and receives JWT tokens', async () => {
    // 1. Request OTP
    const reqRes = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ email: 'owner.rahul@example.com' });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);
    const testOtp = reqRes.body.data.testOtp;
    expect(testOtp).toBeDefined();

    // 2. Verify OTP
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.rahul@example.com', otp: testOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.accessToken).toBeDefined();
    expect(verifyRes.body.data.user.email).toBe('owner.rahul@example.com');
  });

  it('Multi-Tenancy: A user can own multiple libraries', async () => {
    // Authenticate user
    const authRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'multi.owner@example.com', otp: '123456' });
    const token = authRes.body.data.accessToken;

    // Create Library 1
    const lib1Res = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Apex Study Library North',
        contactPhone: '9876543210',
      });
    expect(lib1Res.status).toBe(201);
    expect(lib1Res.body.data.name).toBe('Apex Study Library North');

    // Create Library 2
    const lib2Res = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Apex Study Library South',
        contactPhone: '9876543211',
      });
    expect(lib2Res.status).toBe(201);

    // List user libraries
    const listRes = await request(app)
      .get('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);
    expect(listRes.body.data[0].role).toBe('OWNER');
    expect(listRes.body.data[1].role).toBe('OWNER');
  });

  it('SECURITY CRITICAL: Cross-Tenant Isolation (User B cannot access User A Library)', async () => {
    // User A registers and creates Library A
    const userARes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.a@example.com', otp: '123456' });
    const tokenA = userARes.body.data.accessToken;

    const libARes = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Library Alpha',
        contactPhone: '9876543210',
      });
    const libraryAId = libARes.body.data.id;

    // User B registers and creates Library B
    const userBRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.b@example.com', otp: '123456' });
    const tokenB = userBRes.body.data.accessToken;

    // User B attempts to access Library A details
    const unauthorizedGet = await request(app)
      .get(`/api/v1/libraries/${libraryAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(unauthorizedGet.status).toBe(403);
    expect(unauthorizedGet.body.success).toBe(false);
    expect(unauthorizedGet.body.error.code).toBe('TENANT_ACCESS_DENIED');

    // User B attempts to access Library A spaces via X-Library-Id header
    const unauthorizedSpaces = await request(app)
      .get(`/api/v1/libraries/${libraryAId}/spaces/rooms`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Library-Id', libraryAId);

    expect(unauthorizedSpaces.status).toBe(403);
    expect(unauthorizedSpaces.body.success).toBe(false);
    expect(unauthorizedSpaces.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });

  it('Authentication: Rejects requests with missing or expired token', async () => {
    const res = await request(app).get('/api/v1/libraries');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
