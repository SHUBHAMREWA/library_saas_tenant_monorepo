import { Request, Response, NextFunction } from 'express';
import { attendanceService } from './attendance.service';
import { AttendanceCheckInSchema, AttendanceCheckOutSchema } from '@library/validation';

export class AttendanceController {
  async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = AttendanceCheckInSchema.parse(req.body);
      const log = await attendanceService.checkIn(
        req.tenant!.libraryId,
        req.tenant!.userId,
        input
      );
      res.status(200).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = AttendanceCheckOutSchema.parse(req.body);
      const log = await attendanceService.checkOut(
        req.tenant!.libraryId,
        req.tenant!.userId,
        input.studentId
      );
      res.status(200).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }

  async getTodayRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roster = attendanceService.getTodayRoster(req.tenant!.libraryId);
      res.status(200).json({ success: true, data: roster });
    } catch (err) {
      next(err);
    }
  }

  async getStudentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = attendanceService.getStudentHistory(
        req.tenant!.libraryId,
        req.params.studentId
      );
      res.status(200).json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = attendanceService.getDashboardSummary(req.tenant!.libraryId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
}

export const attendanceController = new AttendanceController();
