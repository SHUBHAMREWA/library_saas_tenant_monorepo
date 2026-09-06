import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';

describe('Phase 2: Physical Spaces (Rooms, Rows & Seats)', () => {
  const app = createApp();
  let token: string;
  let libraryId: string;

  beforeEach(async () => {
    dataStore.clear();

    // Authenticate owner and create library
    const authRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.space@example.com', otp: '123456' });
    token = authRes.body.data.accessToken;

    const libRes = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Space Testing Library',
        contactPhone: '9876543210',
      });
    libraryId = libRes.body.data.id;
  });

  it('Room Management: Create, List, and Delete Rooms', async () => {
    // 1. Create Second Floor Room
    const createRoomRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/spaces/rooms`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        name: 'Silent Hall B',
        floor: 'First Floor',
        sortOrder: 2,
      });

    expect(createRoomRes.status).toBe(201);
    expect(createRoomRes.body.data.name).toBe('Silent Hall B');
    const roomId = createRoomRes.body.data.id;

    // 2. List Rooms (should include default created room + new room)
    const listRes = await request(app)
      .get(`/api/v1/libraries/${libraryId}/spaces/rooms`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);

    // 3. Delete Room (soft-delete)
    const deleteRes = await request(app)
      .delete(`/api/v1/libraries/${libraryId}/spaces/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(deleteRes.status).toBe(200);

    // Verify deleted room no longer returned in list
    const afterList = await request(app)
      .get(`/api/v1/libraries/${libraryId}/spaces/rooms`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(afterList.body.data.length).toBe(1);
  });

  it('Row & Batch Seat Generation: Generate 25 seats with sequence', async () => {
    // 1. Create Room & Row
    const roomRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/spaces/rooms`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({ name: 'Study Hall 1' });
    const roomId = roomRes.body.data.id;

    const rowRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/spaces/rows`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({ roomId, name: 'Row B' });
    const rowId = rowRes.body.data.id;

    // 2. Batch generate 25 seats with prefix "B-"
    const batchRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/spaces/seats/batch-generate`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        rowId,
        prefix: 'B-',
        startNumber: 1,
        count: 25,
      });

    expect(batchRes.status).toBe(201);
    expect(batchRes.body.data.count).toBe(25);
    expect(batchRes.body.data.seats[0].seatNumber).toBe('B-01');
    expect(batchRes.body.data.seats[24].seatNumber).toBe('B-25');
    expect(batchRes.body.data.seats[0].status).toBe('AVAILABLE');

    // 3. Update Seat B-05 status to MAINTENANCE
    const seat05 = batchRes.body.data.seats[4];
    const updateRes = await request(app)
      .put(`/api/v1/libraries/${libraryId}/spaces/seats/${seat05.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({ status: 'MAINTENANCE' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('MAINTENANCE');

    // 4. Update Seat B-01 status to OCCUPIED
    const seat01 = batchRes.body.data.seats[0];
    await request(app)
      .put(`/api/v1/libraries/${libraryId}/spaces/seats/${seat01.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({ status: 'OCCUPIED' });

    // 5. Fetch space stats
    const statsRes = await request(app)
      .get(`/api/v1/libraries/${libraryId}/spaces/stats`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.totalSeats).toBe(25);
    expect(statsRes.body.data.availableSeats).toBe(23);
    expect(statsRes.body.data.occupiedSeats).toBe(1);
    expect(statsRes.body.data.maintenanceSeats).toBe(1);
    expect(statsRes.body.data.occupancyRate).toBe(4); // 1/25 = 4%
  });
});
