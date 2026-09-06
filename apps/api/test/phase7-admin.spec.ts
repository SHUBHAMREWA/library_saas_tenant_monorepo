import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';
import { authService } from '../src/modules/auth/auth.service';

describe('Phase 7: Platform Super Admin Portal', () => {
  const app = createApp();
  let normalToken: string;
  let superAdminToken: string;
  let superAdminId: string;
  let testLibraryId: string;

  beforeEach(async () => {
    dataStore.clear();

    // 1. Create a standard user and get their token
    const normalUser = dataStore.createUser({
      email: 'regular.owner@example.com',
      fullName: 'Regular Owner',
      role: 'USER',
    });
    const normalAuth = authService.generateTokens(normalUser);
    normalToken = normalAuth.accessToken;

    // 2. Create a library owned by normal user
    const lib = dataStore.createLibrary(normalUser.id, {
      name: 'Bright Mind Library',
      contactPhone: '9876543210',
      contactEmail: 'contact@brightmind.com',
    });
    testLibraryId = lib.id;

    // 3. Create a super admin user and get their token
    const superAdminUser = dataStore.createUser({
      email: 'superadmin@apexlibrary.io',
      fullName: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
    });
    superAdminId = superAdminUser.id;
    const adminAuth = authService.generateTokens(superAdminUser);
    superAdminToken = adminAuth.accessToken;
  });

  it('Access Control: Denies unauthorized or regular users with 401/403', async () => {
    // Unauthenticated
    const unauthRes = await request(app).get('/api/v1/admin/libraries');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');

    // Regular user
    const forbiddenRes = await request(app)
      .get('/api/v1/admin/libraries')
      .set('Authorization', `Bearer ${normalToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('SUPER_ADMIN_ACCESS_REQUIRED');
  });

  it('Global Libraries & Suspension: Super admin can inspect and suspend/activate tenants', async () => {
    // 1. List all libraries
    const listRes = await request(app)
      .get('/api/v1/admin/libraries')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].name).toBe('Bright Mind Library');
    expect(listRes.body.data[0].isActive).toBe(true);

    // 2. Suspend library
    const suspendRes = await request(app)
      .put(`/api/v1/admin/libraries/${testLibraryId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isActive: false });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.isActive).toBe(false);

    // 3. Verify status changed in store
    const checkLib = dataStore.findLibraryById(testLibraryId);
    expect(checkLib?.isActive).toBe(false);

    // 4. Reactivate library
    const reactivateRes = await request(app)
      .put(`/api/v1/admin/libraries/${testLibraryId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isActive: true });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.isActive).toBe(true);
  });

  it('Coupon Governance: Super admin can create, toggle and list promotional codes', async () => {
    // 1. Create a new coupon
    const createRes = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'FESTIVAL50',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maxDiscountAmount: 1000,
        minOrderAmount: 500,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe('FESTIVAL50');
    expect(createRes.body.data.isActive).toBe(true);
    const couponId = createRes.body.data.id;

    // 2. List coupons
    const listRes = await request(app)
      .get('/api/v1/admin/coupons')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find((c: any) => c.code === 'FESTIVAL50');
    expect(found).toBeDefined();

    // 3. Toggle coupon status to disabled
    const toggleRes = await request(app)
      .put(`/api/v1/admin/coupons/${couponId}/toggle`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.isActive).toBe(false);
  });

  it('Audit Logs & Platform Metrics: Super admin can monitor platform-wide telemetry and actions', async () => {
    // 1. Trigger an action that creates an audit entry
    await request(app)
      .put(`/api/v1/admin/libraries/${testLibraryId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isActive: false });

    // 2. Query audit logs
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs?limit=10')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBeGreaterThan(0);
    const latest = auditRes.body.data[0];
    expect(latest.actorId).toBe(superAdminId);
    expect(latest.action).toBe('TENANT_SUSPENDED');

    // 3. Query platform metrics
    const metricsRes = await request(app)
      .get('/api/v1/admin/metrics')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.data.totalLibraries).toBe(1);
    expect(typeof metricsRes.body.data.totalRevenue).toBe('number');
    expect(typeof metricsRes.body.data.activeMemberships).toBe('number');
  });
});
