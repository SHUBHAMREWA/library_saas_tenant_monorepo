import { dataStore, StoredLibrary } from '../../services/data-store';
import { CreateLibraryInput } from '@library/validation';
import { LibrarySummary } from '@library/types';

export class TenantService {
  createLibrary(userId: string, input: CreateLibraryInput): StoredLibrary {
    const library = dataStore.createLibrary(userId, {
      name: input.name,
      contactPhone: input.contactPhone,
      address: input.address,
      contactEmail: input.contactEmail,
    });

    // Automatically provision a default room and row to make library ready
    const defaultRoom = dataStore.createRoom(library.id, {
      name: 'Main Reading Hall',
      floor: 'Ground Floor',
      sortOrder: 1,
    });

    dataStore.createRow(library.id, defaultRoom.id, {
      name: 'Row A',
      sortOrder: 1,
    });

    // Record audit entry
    dataStore.recordAudit({
      libraryId: library.id,
      actorId: userId,
      actorType: 'USER',
      action: 'LIBRARY_CREATED',
      entityType: 'LIBRARY',
      entityId: library.id,
      diffPayload: { name: { before: null, after: library.name } },
    });

    return library;
  }

  listUserLibraries(userId: string): LibrarySummary[] {
    return dataStore.listUserLibraries(userId);
  }

  getLibraryDetails(libraryId: string, userId: string): StoredLibrary {
    const library = dataStore.findLibraryById(libraryId);
    if (!library) {
      throw Object.assign(new Error('Library not found'), {
        statusCode: 404,
        code: 'LIBRARY_NOT_FOUND',
      });
    }

    const membership = dataStore.getLibraryMember(libraryId, userId);
    if (!membership) {
      throw Object.assign(new Error('Access denied to this library'), {
        statusCode: 403,
        code: 'TENANT_ACCESS_DENIED',
      });
    }

    return library;
  }

  updateLibrary(libraryId: string, userId: string, data: Partial<CreateLibraryInput>): StoredLibrary {
    const membership = dataStore.getLibraryMember(libraryId, userId);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw Object.assign(new Error('Only an Owner or Admin can update library details'), {
        statusCode: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    const updated = dataStore.updateLibrary(libraryId, data);
    if (!updated) {
      throw Object.assign(new Error('Library not found'), {
        statusCode: 404,
        code: 'LIBRARY_NOT_FOUND',
      });
    }

    dataStore.recordAudit({
      libraryId,
      actorId: userId,
      actorType: 'USER',
      action: 'LIBRARY_UPDATED',
      entityType: 'LIBRARY',
      entityId: libraryId,
      diffPayload: data as any,
    });

    return updated;
  }

  getDashboardSummary(libraryId: string) {
    const students = dataStore.listStudents(libraryId, { isActive: true });
    const seats = dataStore.listSeats(libraryId);
    const expiringSoon = dataStore.listExpiringMemberships(libraryId, 5);

    const occupiedCount = seats.filter((s) => s.status === 'OCCUPIED').length;
    const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const expiredCount = Array.from(dataStore.memberships.values()).filter(
      (m) => m.libraryId === libraryId && (m.status === 'EXPIRED' || (m.status === 'ACTIVE' && m.expectedEndDate < todayStr))
    ).length;

    const recentLogs = dataStore.auditLogs
      .filter((a) => a.libraryId === libraryId)
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        action: a.action,
        timestamp: a.createdAt,
        details: `${a.action} on ${a.entityType}`,
      }));

    return {
      totalActiveStudents: students.length,
      totalSeats: seats.length,
      availableSeats: availableCount,
      occupiedSeats: occupiedCount,
      membershipsEndingSoonCount: expiringSoon.length,
      expiredMembershipsCount: expiredCount,
      recentActivity: recentLogs,
    };
  }
}

export const tenantService = new TenantService();
