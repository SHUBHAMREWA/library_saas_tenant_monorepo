import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';

describe('Phase 4: Memberships, Pause Engine & Shift-Aware Seats', () => {
  const app = createApp();
  let token: string;
  let libraryId: string;
  let studentId: string;
  let seatId: string;

  beforeEach(async () => {
    dataStore.clear();

    // Authenticate owner and create library
    const authRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.membership@example.com', otp: '123456' });
    token = authRes.body.data.accessToken;

    const libRes = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Apex Study Prime',
        contactPhone: '9876543210',
      });
    libraryId = libRes.body.data.id;

    // Create Room, Row and Seat A-01
    const room = dataStore.createRoom(libraryId, { name: 'Floor 1' });
    const row = dataStore.createRow(libraryId, room.id, { name: 'Row A' });
    const seats = dataStore.batchGenerateSeats(libraryId, row.id, 'A-', 1, 5);
    seatId = seats[0].id;

    // Create student
    const studentRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        fullName: 'Aarav Sharma',
        phone: '9988776655',
      });
    studentId = studentRes.body.data.id;
  });

  it('Shift-Aware Seat Allocation & Clash Prevention', async () => {
    // 1. Assign Aarav to Seat A-01 for MORNING shift
    const memRes1 = await request(app)
      .post(`/api/v1/libraries/${libraryId}/memberships`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        studentId,
        startDate: '2026-09-01',
        expectedEndDate: '2026-10-01',
        feeAmount: 1000,
        shift: 'MORNING',
        seatId,
      });

    expect(memRes1.status).toBe(201);
    expect(memRes1.body.data.status).toBe('ACTIVE');

    // 2. Create second student
    const student2Res = await request(app)
      .post(`/api/v1/libraries/${libraryId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        fullName: 'Rohan Gupta',
        phone: '9988776656',
      });
    const student2Id = student2Res.body.data.id;

    // 3. Assign Rohan to Seat A-01 for EVENING shift (Allowed! Multi-shift sharing)
    const memRes2 = await request(app)
      .post(`/api/v1/libraries/${libraryId}/memberships`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        studentId: student2Id,
        startDate: '2026-09-01',
        expectedEndDate: '2026-10-01',
        feeAmount: 1000,
        shift: 'EVENING',
        seatId,
      });

    expect(memRes2.status).toBe(201);

    // 4. Create third student and attempt to assign to Seat A-01 for MORNING shift (Must clash!)
    const student3Res = await request(app)
      .post(`/api/v1/libraries/${libraryId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        fullName: 'Clash Student',
        phone: '9988776657',
      });
    const student3Id = student3Res.body.data.id;

    const clashRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/memberships`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        studentId: student3Id,
        startDate: '2026-09-01',
        expectedEndDate: '2026-10-01',
        feeAmount: 1000,
        shift: 'MORNING', // Conflict with Aarav
        seatId,
      });

    expect(clashRes.status).toBe(409);
    expect(clashRes.body.error.code).toBe('SEAT_OCCUPIED_FOR_SHIFT');
  });

  it('Membership Pause & Validity Extension Calculation', async () => {
    // 1. Create membership starting Sept 1, ending Oct 1 (30 days)
    const memRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/memberships`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        studentId,
        startDate: '2026-09-01',
        expectedEndDate: '2026-10-01',
        feeAmount: 1200,
        shift: 'FULL_DAY',
      });
    const membershipId = memRes.body.data.id;

    // 2. Pause membership for 5 days (Sept 10 to Sept 15) for exams
    const pauseRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/memberships/${membershipId}/pause`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        pauseStartDate: '2026-09-10',
        expectedResumeDate: '2026-09-15',
        reason: 'College Semester Examinations',
        extendedMembershipDuration: true,
      });

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.status).toBe('PAUSED');

    // 3. Resume membership on Sept 15 with extension
    const resumeRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/memberships/${membershipId}/resume`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        actualResumeDate: '2026-09-15',
        extendEndDate: true,
      });

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.status).toBe('ACTIVE');

    // The membership expectedEndDate should have shifted from 2026-10-01 to 2026-10-06 (extended by 5 days!)
    expect(resumeRes.body.data.expectedEndDate).toBe('2026-10-06');
  });
});
