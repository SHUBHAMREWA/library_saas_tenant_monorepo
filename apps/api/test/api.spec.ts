import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  CreateLibrarySchema,
  CreateStudentSchema,
  PauseMembershipSchema,
  BatchGenerateSeatsSchema,
} from '@library/validation';

describe('Library Management API - Foundation & Tenant Guard', () => {
  const app = createApp();

  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('library-management-api');
  });

  it('GET /api/v1 should return API status', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.architecture).toBe('Modular Monolith');
  });

  it('Zod validation should validate CreateLibrarySchema', () => {
    const valid = CreateLibrarySchema.safeParse({
      name: 'Apex Study Library',
      contactPhone: '9876543210',
      contactEmail: 'admin@apexlibrary.com',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateLibrarySchema.safeParse({
      name: 'A', // Too short
      contactPhone: '123', // Too short
    });
    expect(invalid.success).toBe(false);
  });

  it('Zod validation should enforce BatchGenerateSeatsSchema count bounds', () => {
    const valid = BatchGenerateSeatsSchema.safeParse({
      rowId: '11111111-1111-1111-1111-111111111111',
      prefix: 'Seat-',
      startNumber: 1,
      count: 50,
    });
    expect(valid.success).toBe(true);

    const tooMany = BatchGenerateSeatsSchema.safeParse({
      rowId: '11111111-1111-1111-1111-111111111111',
      count: 250, // Exceeds max 200
    });
    expect(tooMany.success).toBe(false);
  });

  it('Zod validation should correctly parse PauseMembershipSchema', () => {
    const valid = PauseMembershipSchema.safeParse({
      pauseStartDate: '2026-09-10',
      expectedResumeDate: '2026-09-15',
      reason: 'College Semester Exams',
      extendedMembershipDuration: true,
    });
    expect(valid.success).toBe(true);
  });

  it('Zod validation should validate CreateStudentSchema with shift and dates', () => {
    const valid = CreateStudentSchema.safeParse({
      fullName: 'Rahul Sharma',
      phone: '9876543210',
      studyPurpose: 'Civil Services Examination',
      initialMembership: {
        startDate: '2026-09-05',
        expectedEndDate: '2026-10-05',
        feeAmount: 1200,
        shift: 'MORNING',
      },
    });
    expect(valid.success).toBe(true);
  });
});
