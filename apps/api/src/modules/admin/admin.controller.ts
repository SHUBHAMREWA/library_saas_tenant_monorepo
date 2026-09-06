import { Request, Response, NextFunction } from 'express';
import { dataStore } from '../../services/data-store';
import { CreateCouponSchema } from '@library/validation';

export class AdminController {
  async listLibraries(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const libraries = dataStore.listAllLibrariesWithMetrics();
      res.status(200).json({ success: true, data: libraries });
    } catch (err) {
      next(err);
    }
  }

  async toggleLibraryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'isActive boolean is required' },
        });
        return;
      }

      const updated = dataStore.setLibraryActiveStatus(req.params.libraryId, isActive);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'LIBRARY_NOT_FOUND', message: 'Library not found' },
        });
        return;
      }

      dataStore.recordAudit({
        libraryId: req.params.libraryId,
        actorId: req.userId!,
        actorType: 'SUPER_ADMIN',
        action: isActive ? 'TENANT_ACTIVATED' : 'TENANT_SUSPENDED',
        entityType: 'LIBRARY',
        entityId: req.params.libraryId,
        diffPayload: { isActive: { before: !isActive, after: isActive } },
      });

      res.status(200).json({
        success: true,
        data: {
          libraryId: updated.id,
          isActive: updated.isActive,
          message: `Library has been ${isActive ? 'activated' : 'suspended'} successfully.`,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async listCoupons(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupons = dataStore.listAllCoupons();
      res.status(200).json({ success: true, data: coupons });
    } catch (err) {
      next(err);
    }
  }

  async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateCouponSchema.parse(req.body);
      const coupon = dataStore.createCoupon(input as any);

      dataStore.recordAudit({
        actorId: req.userId!,
        actorType: 'SUPER_ADMIN',
        action: 'COUPON_CREATED',
        entityType: 'COUPON',
        entityId: coupon.id,
        diffPayload: { code: coupon.code, discountValue: coupon.discountValue } as any,
      });

      res.status(201).json({ success: true, data: coupon });
    } catch (err) {
      next(err);
    }
  }

  async toggleCouponStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = dataStore.toggleCouponStatus(req.params.couponId);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'COUPON_NOT_FOUND', message: 'Coupon not found' },
        });
        return;
      }

      dataStore.recordAudit({
        actorId: req.userId!,
        actorType: 'SUPER_ADMIN',
        action: updated.isActive ? 'COUPON_ACTIVATED' : 'COUPON_DISABLED',
        entityType: 'COUPON',
        entityId: updated.id,
        diffPayload: { isActive: { before: !updated.isActive, after: updated.isActive } },
      });

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = dataStore.listAllAuditLogs(limit);
      res.status(200).json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = dataStore.getPlatformMetrics();
      res.status(200).json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
