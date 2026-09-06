import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { dataStore } from '../src/services/data-store';

describe('Phase 3: Student Management & Secure KYC', () => {
  const app = createApp();
  let token: string;
  let libraryId: string;

  beforeEach(async () => {
    dataStore.clear();

    // Authenticate owner & create library
    const authRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ email: 'owner.students@example.com', otp: '123456' });
    token = authRes.body.data.accessToken;

    const libRes = await request(app)
      .post('/api/v1/libraries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Student Testing Library',
        contactPhone: '9876543210',
      });
    libraryId = libRes.body.data.id;
  });

  it('Cloudinary Signed Upload: Generates signed parameters for KYC upload', async () => {
    const signRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/storage/sign-upload`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({ resourceType: 'kyc' });

    expect(signRes.status).toBe(200);
    expect(signRes.body.success).toBe(true);
    expect(signRes.body.data.signature).toBeDefined();
    expect(signRes.body.data.accessMode).toBe('authenticated'); // Private mode
    expect(signRes.body.data.folder).toContain(`library_saas/${libraryId}/kyc`);
  });

  it('Student CRUD: Registers student and prevents duplicate phone in same library', async () => {
    // 1. Register student
    const createRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        fullName: 'Vikram Mehta',
        phone: '9811223344',
        email: 'vikram.m@example.com',
        fatherName: 'Rajesh Mehta',
        studyPurpose: 'UPSC Civil Services',
        kycDocId: 'kyc_doc_vikram_123',
        kycDocType: 'AADHAAR',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.fullName).toBe('Vikram Mehta');
    expect(createRes.body.data.kycDocId).toBe('kyc_doc_vikram_123');

    // 2. Duplicate phone registration in same library should fail
    const dupRes = await request(app)
      .post(`/api/v1/libraries/${libraryId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId)
      .send({
        fullName: 'Another Student',
        phone: '9811223344', // Same phone
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('STUDENT_PHONE_EXISTS');

    // 3. Search student
    const searchRes = await request(app)
      .get(`/api/v1/libraries/${libraryId}/students?search=Vikram`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].phone).toBe('9811223344');
  });

  it('Confidential KYC Viewer: Generates expiring signed URL for Aadhaar (TTL: 60s)', async () => {
    const kycDocId = 'kyc_doc_secure_aadhaar_888';

    const kycRes = await request(app)
      .get(`/api/v1/libraries/${libraryId}/storage/kyc/${kycDocId}/view-url`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Library-Id', libraryId);

    expect(kycRes.status).toBe(200);
    expect(kycRes.body.success).toBe(true);
    expect(kycRes.body.data.url).toContain('https://res.cloudinary.com');
    expect(kycRes.body.data.url).toContain('/authenticated/');
    expect(kycRes.body.data.expiresInSeconds).toBe(60);
  });
});
