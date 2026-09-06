import { dataStore, StoredRoom, StoredRow, StoredSeat } from '../../services/data-store';
import { SeatStatus } from '@library/types';

export class SpaceService {
  createRoom(libraryId: string, data: { name: string; floor?: string; sortOrder?: number }): StoredRoom {
    return dataStore.createRoom(libraryId, data);
  }

  listRooms(libraryId: string): StoredRoom[] {
    return dataStore.listRooms(libraryId);
  }

  deleteRoom(libraryId: string, roomId: string): void {
    const success = dataStore.deleteRoom(libraryId, roomId);
    if (!success) {
      throw Object.assign(new Error('Room not found'), { statusCode: 404, code: 'ROOM_NOT_FOUND' });
    }
  }

  createRow(libraryId: string, data: { roomId: string; name: string; sortOrder?: number }): StoredRow {
    const room = dataStore.findRoomById(libraryId, data.roomId);
    if (!room) {
      throw Object.assign(new Error('Room not found'), { statusCode: 404, code: 'ROOM_NOT_FOUND' });
    }
    return dataStore.createRow(libraryId, data.roomId, data);
  }

  listRows(libraryId: string, roomId?: string): StoredRow[] {
    return dataStore.listRows(libraryId, roomId);
  }

  deleteRow(libraryId: string, rowId: string): void {
    const success = dataStore.deleteRow(libraryId, rowId);
    if (!success) {
      throw Object.assign(new Error('Row not found'), { statusCode: 404, code: 'ROW_NOT_FOUND' });
    }
  }

  batchGenerateSeats(
    libraryId: string,
    data: { rowId: string; prefix?: string; startNumber?: number; count: number }
  ): StoredSeat[] {
    const row = dataStore.findRowById(libraryId, data.rowId);
    if (!row) {
      throw Object.assign(new Error('Row not found'), { statusCode: 404, code: 'ROW_NOT_FOUND' });
    }
    return dataStore.batchGenerateSeats(
      libraryId,
      data.rowId,
      data.prefix || '',
      data.startNumber || 1,
      data.count
    );
  }

  listSeats(
    libraryId: string,
    filters?: { roomId?: string; rowId?: string; status?: SeatStatus }
  ): StoredSeat[] {
    return dataStore.listSeats(libraryId, filters);
  }

  updateSeatStatus(libraryId: string, seatId: string, status: SeatStatus): StoredSeat {
    const seat = dataStore.updateSeatStatus(libraryId, seatId, status);
    if (!seat) {
      throw Object.assign(new Error('Seat not found'), { statusCode: 404, code: 'SEAT_NOT_FOUND' });
    }
    return seat;
  }

  getSpaceStats(libraryId: string): {
    totalSeats: number;
    availableSeats: number;
    occupiedSeats: number;
    maintenanceSeats: number;
    reservedSeats: number;
    occupancyRate: number;
  } {
    const seats = dataStore.listSeats(libraryId);
    const total = seats.length;
    let available = 0;
    let occupied = 0;
    let maintenance = 0;
    let reserved = 0;

    for (const seat of seats) {
      if (seat.status === 'AVAILABLE') available++;
      else if (seat.status === 'OCCUPIED') occupied++;
      else if (seat.status === 'MAINTENANCE') maintenance++;
      else if (seat.status === 'RESERVED') reserved++;
    }

    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return {
      totalSeats: total,
      availableSeats: available,
      occupiedSeats: occupied,
      maintenanceSeats: maintenance,
      reservedSeats: reserved,
      occupancyRate,
    };
  }
}

export const spaceService = new SpaceService();
