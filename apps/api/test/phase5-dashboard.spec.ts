import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';

describe('Phase 5: Real-Time Dashboard Metrics', () => {
  const app = createApp();
  let token: string;
  let libraryId: string;
  let student1Id: string;
  let student2Id: string;

  beforeEach(async () => {
    dataStore.clear();

    // Authenticate owner & create library
    const authRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.dashboard@example.com', otp: '123456' });
    token = authRes.body.data.accessToken;

    const libRes = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Apex Central Hub',
        contactPhone: '9876543210',
      });
    libraryId = libRes.body.data.id;

    // Create 2 students
    const s1Res = await request(app)
      .post(`/api/v1/libraries/${libraryId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({ fullName: 'Student One', phone: '9900112233' });
    student1Id = s1Res.body.data.id;

    const s2Res = await request(app)
      .post(`/api/v1/libraries/${libraryId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({ fullName: 'Student Two', phone: '9900112234' });
    student2Id = s2Res.body.data.id;

    // Create seats & generate memberships
    const room = dataStore.createRoom(libraryId, { name: 'Ground Floor' });
    const row = dataStore.createRow(libraryId, room.id, { name: 'Row A' });
    const seats = dataStore.batchGenerateSeats(libraryId, row.id, 'A-', 1, 10);

    // Give student1 an active membership
    dataStore.createMembership(libraryId, {
      studentId: student1Id,
      startDate: new Date(Date.now() - 26 * 86400000).toISOString().split('T')[0],
      expectedEndDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], // Expiring in 4 days!
      feeAmount: 1200,
      shift: 'FULL_DAY',
    });
    dataStore.createSeatAssignment(libraryId, {
      seatId: seats[0].id,
      studentId: student1Id,
      membershipId: 'mem-1',
      shift: 'FULL_DAY',
      startDate: '2026-09-01',
    });
  });

  it('Real-Time Dashboard API: Computes actionable counters and expiring alerts', async () => {
    // Query dashboard summary
    const dashRes = await request(app)
      .get(`/api/v1/libraries/${libraryId}/dashboard`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.totalActiveStudents).toBe(2);
    expect(dashRes.body.data.totalSeats).toBe(10);
    expect(dashRes.body.data.occupiedSeats).toBe(1);
    expect(dashRes.body.data.availableSeats).toBe(9);
    expect(dashRes.body.data.membershipsEndingSoonCount).toBe(1); // Ending in 4 days
    expect(dashRes.body.data.recentActivity.length).toBeGreaterThan(0);
  });
});
