import { Request, Response, NextFunction } from 'express';
import { spaceService } from './space.service';
import {
  CreateRoomSchema,
  CreateRowSchema,
  BatchGenerateSeatsSchema,
  UpdateSeatStatusSchema,
} from '@library/validation';

export class SpaceController {
  // Rooms
  async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateRoomSchema.parse(req.body);
      const room = spaceService.createRoom(req.tenant!.libraryId, input);
      res.status(201).json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  async listRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rooms = spaceService.listRooms(req.tenant!.libraryId);
      res.status(200).json({ success: true, data: rooms });
    } catch (err) {
      next(err);
    }
  }

  async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      spaceService.deleteRoom(req.tenant!.libraryId, req.params.roomId);
      res.status(200).json({ success: true, data: { message: 'Room archived successfully' } });
    } catch (err) {
      next(err);
    }
  }

  // Rows
  async createRow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateRowSchema.parse(req.body);
      const row = spaceService.createRow(req.tenant!.libraryId, input);
      res.status(201).json({ success: true, data: row });
    } catch (err) {
      next(err);
    }
  }

  async listRows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roomId = req.query.roomId as string | undefined;
      const rows = spaceService.listRows(req.tenant!.libraryId, roomId);
      res.status(200).json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }

  async deleteRow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      spaceService.deleteRow(req.tenant!.libraryId, req.params.rowId);
      res.status(200).json({ success: true, data: { message: 'Row archived successfully' } });
    } catch (err) {
      next(err);
    }
  }

  // Seats
  async batchGenerateSeats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = BatchGenerateSeatsSchema.parse(req.body);
      const seats = spaceService.batchGenerateSeats(req.tenant!.libraryId, input);
      res.status(201).json({
        success: true,
        data: {
          count: seats.length,
          seats,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async listSeats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId, rowId, status } = req.query;
      const seats = spaceService.listSeats(req.tenant!.libraryId, {
        roomId: roomId as string | undefined,
        rowId: rowId as string | undefined,
        status: status as any,
      });
      res.status(200).json({ success: true, data: seats });
    } catch (err) {
      next(err);
    }
  }

  async updateSeatStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = UpdateSeatStatusSchema.parse(req.body);
      const seat = spaceService.updateSeatStatus(req.tenant!.libraryId, req.params.seatId, status);
      res.status(200).json({ success: true, data: seat });
    } catch (err) {
      next(err);
    }
  }

  async getSpaceStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = spaceService.getSpaceStats(req.tenant!.libraryId);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}

export const spaceController = new SpaceController();
