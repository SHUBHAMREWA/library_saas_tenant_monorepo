import { Request, Response, NextFunction } from 'express';
import { membershipService } from './membership.service';
import {
  CreateMembershipSchema,
  PauseMembershipSchema,
  ResumeMembershipSchema,
} from '@library/validation';

export class MembershipController {
  async createMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateMembershipSchema.parse(req.body);
      const membership = membershipService.createMembership(
        req.tenant!.libraryId,
        req.tenant!.userId,
        input
      );
      res.status(201).json({ success: true, data: membership });
    } catch (err) {
      next(err);
    }
  }

  async pauseMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = PauseMembershipSchema.parse(req.body);
      const membership = membershipService.pauseMembership(
        req.tenant!.libraryId,
        req.tenant!.userId,
        req.params.membershipId,
        input
      );
      res.status(200).json({ success: true, data: membership });
    } catch (err) {
      next(err);
    }
  }

  async resumeMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ResumeMembershipSchema.parse(req.body);
      const membership = membershipService.resumeMembership(
        req.tenant!.libraryId,
        req.tenant!.userId,
        req.params.membershipId,
        input
      );
      res.status(200).json({ success: true, data: membership });
    } catch (err) {
      next(err);
    }
  }

  async renewMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newEndDate, additionalFee } = req.body;
      if (!newEndDate || !additionalFee) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'newEndDate and additionalFee are required' },
        });
        return;
      }
      const membership = membershipService.renewMembership(
        req.tenant!.libraryId,
        req.tenant!.userId,
        req.params.membershipId,
        newEndDate,
        Number(additionalFee)
      );
      res.status(200).json({ success: true, data: membership });
    } catch (err) {
      next(err);
    }
  }

  async getExpiring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 5;
      const list = membershipService.listExpiring(req.tenant!.libraryId, days);
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }
}

export const membershipController = new MembershipController();
