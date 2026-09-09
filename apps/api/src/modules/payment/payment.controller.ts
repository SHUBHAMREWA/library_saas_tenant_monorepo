import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import {
  CreatePaymentOrderSchema,
  ValidateCouponSchema,
  AdminManualGrantSubscriptionSchema,
} from '@library/validation';

export class PaymentController {
  async listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma } = await import('@library/database');
      const dbPlans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });

      if (dbPlans && dbPlans.length > 0) {
        const formatted = dbPlans.map((p) => {
          const feats = (p.features || {}) as Record<string, any>;
          const origPrice = feats.originalPrice !== undefined ? Number(feats.originalPrice) : Number(p.priceYearly);
          return {
            id: p.id,
            code: p.code,
            name: p.name,
            price: Number(p.priceMonthly),
            priceMonthly: Number(p.priceMonthly),
            priceYearly: origPrice,
            originalPrice: origPrice,
            durationMonths: feats.durationMonths || (p.code === 'PRO' ? 12 : p.code === 'ADVANCE' ? 3 : 1),
            badge: feats.badge || '',
            description: feats.description || '',
            allFeatures: true,
            isActive: p.isActive,
          };
        });

        res.status(200).json({ success: true, plans: formatted, data: formatted, availablePlans: formatted });
        return;
      }

      const plans = paymentService.listPlans();
      res.status(200).json({ success: true, plans, data: plans, availablePlans: plans });
    } catch {
      try {
        const plans = paymentService.listPlans();
        res.status(200).json({ success: true, plans, data: plans, availablePlans: plans });
      } catch (err) {
        next(err);
      }
    }
  }

  async validateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ValidateCouponSchema.parse(req.body);
      const result = paymentService.validateCoupon(req.userId || 'guest', input);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreatePaymentOrderSchema.parse(req.body);
      const order = paymentService.createOrder(
        req.tenant!.libraryId,
        req.tenant!.userId,
        input
      );
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = (req.headers['x-provider'] as string) || 'RAZORPAY';
      const signature =
        (req.headers['x-razorpay-signature'] as string) ||
        (req.headers['x-cashfree-signature'] as string) ||
        (req.headers['x-signature'] as string) ||
        '';

      const rawPayload = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body));

      const result = paymentService.handleWebhook(
        provider.toUpperCase(),
        rawPayload,
        signature,
        req.body
      );

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getSubscriptionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = paymentService.getLibrarySubscriptionStatus(req.tenant!.libraryId);
      res.status(200).json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  async adminManualGrant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.isSuperAdmin) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Platform Admin access required' },
        });
        return;
      }
      const input = AdminManualGrantSubscriptionSchema.parse(req.body);
      const sub = paymentService.manualGrantSubscription(req.userId!, input);
      res.status(201).json({ success: true, data: sub });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
