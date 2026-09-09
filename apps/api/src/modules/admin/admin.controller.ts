import { Request, Response, NextFunction } from 'express';
import { dataStore } from '../../services/data-store';
import { CreateCouponSchema } from '@library/validation';

export class AdminController {
  async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma } = await import('@library/database');
      const [
        totalLibraries,
        activeLibraries,
        totalStudents,
        totalSeats,
        totalUsers,
        totalPayments,
        activeSubscriptions,
      ] = await Promise.all([
        prisma.library.count({ where: { deletedAt: null } }),
        prisma.library.count({ where: { deletedAt: null, isActive: true } }),
        prisma.student.count({ where: { deletedAt: null, isActive: true } }),
        prisma.seat.count({ where: { deletedAt: null, isActive: true } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.payment.findMany({
          where: { status: 'SUCCESS' },
          select: { amount: true },
        }),
        prisma.subscription.count({
          where: {
            status: { in: ['ACTIVE', 'TRIAL', 'MANUAL'] },
          },
        }),
      ]);

      const suspendedLibraries = Math.max(0, totalLibraries - activeLibraries);
      const totalRevenue = totalPayments.reduce((acc, p) => acc + Number(p.amount), 0);

      const metricsData = {
        totalLibraries,
        activeLibraries,
        suspendedLibraries,
        totalStudents,
        totalSeats,
        totalUsers,
        activeSubscriptions,
        totalRevenue,
      };

      res.status(200).json({ success: true, data: metricsData });
    } catch (err) {
      try {
        const metrics = dataStore.getPlatformMetrics();
        res.status(200).json({ success: true, data: metrics });
      } catch {
        next(err);
      }
    }
  }

  async listLibraries(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma } = await import('@library/database');
      const libraries = await prisma.library.findMany({
        where: { deletedAt: null },
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          subscriptions: {
            orderBy: { endDate: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              autoRenew: true,
              autoRenewCancelledAt: true,
              cancellationReason: true,
              endDate: true,
              plan: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
          _count: {
            select: {
              rooms: true,
              seats: true,
              students: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = libraries.map((lib) => {
        const sub = lib.subscriptions?.[0] || null;
        return {
          id: lib.id,
          name: lib.name,
          slug: lib.slug,
          contactPhone: lib.contactPhone,
          contactEmail: lib.contactEmail,
          address: lib.address,
          isActive: lib.isActive,
          createdAt: lib.createdAt.toISOString(),
          owner: lib.owner
            ? {
                id: lib.owner.id,
                fullName: lib.owner.fullName,
                email: lib.owner.email,
                phone: lib.owner.phone,
              }
            : null,
          studentCount: lib._count?.students || 0,
          seatCount: lib._count?.seats || 0,
          roomCount: lib._count?.rooms || 0,
          activeSubscription: sub
            ? {
                id: sub.id,
                status: sub.status,
                autoRenew: sub.autoRenew,
                autoRenewCancelledAt: sub.autoRenewCancelledAt?.toISOString() || null,
                cancellationReason: sub.cancellationReason || null,
                endDate: sub.endDate?.toISOString() || null,
                plan: sub.plan ? { name: sub.plan.name, code: sub.plan.code } : null,
              }
            : null,
        };
      });

      res.status(200).json({ success: true, libraries: formatted, data: formatted });
    } catch (err) {
      try {
        const libraries = dataStore.listAllLibrariesWithMetrics();
        res.status(200).json({ success: true, libraries, data: libraries });
      } catch {
        next(err);
      }
    }
  }

  async toggleLibraryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { libraryId } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'isActive boolean is required' },
        });
        return;
      }

      const { prisma } = await import('@library/database');
      const updated = await prisma.library.update({
        where: { id: libraryId },
        data: { isActive },
      });

      try {
        await prisma.auditLog.create({
          data: {
            id: (await import('crypto')).randomUUID(),
            libraryId,
            actorId: req.userId || 'system-admin',
            actorType: 'SUPER_ADMIN',
            action: isActive ? 'TENANT_ACTIVATED' : 'TENANT_SUSPENDED',
            entityType: 'LIBRARY',
            entityId: libraryId,
            diffPayload: { isActive: { before: !isActive, after: isActive } },
          },
        });
      } catch {}

      res.status(200).json({
        success: true,
        message: `Library has been ${isActive ? 'activated' : 'suspended'} successfully.`,
        data: { libraryId: updated.id, isActive: updated.isActive },
      });
    } catch (err) {
      next(err);
    }
  }

  async listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma, ensureDefaultSubscriptionPlans } = await import('@library/database');
      try {
        await ensureDefaultSubscriptionPlans(prisma);
      } catch {}

      const plans = await prisma.subscriptionPlan.findMany({
        orderBy: { priceMonthly: 'asc' },
      });

      const formatted = plans.map((p) => {
        const feats = (p.features || {}) as Record<string, any>;
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          priceMonthly: Number(p.priceMonthly),
          priceYearly: Number(p.priceYearly),
          durationMonths: feats.durationMonths || (p.code === 'PRO' ? 12 : p.code === 'ADVANCE' ? 3 : 1),
          originalPrice: feats.originalPrice ? Number(feats.originalPrice) : Number(p.priceYearly),
          badge: feats.badge || '',
          description: feats.description || '',
          isActive: p.isActive,
          createdAt: p.createdAt.toISOString(),
        };
      });

      res.status(200).json({ success: true, plans: formatted, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        code,
        name,
        priceMonthly,
        priceYearly,
        durationMonths,
        originalPrice,
        badge,
        description,
        isActive = true,
      } = req.body;

      if (!code || !name) {
        res.status(400).json({ error: 'Code and Name are required' });
        return;
      }

      const { prisma } = await import('@library/database');
      const crypto = await import('crypto');

      const plan = await prisma.subscriptionPlan.create({
        data: {
          id: crypto.randomUUID(),
          code: code.toUpperCase().trim(),
          name: name.trim(),
          priceMonthly: Number(priceMonthly) || 0,
          priceYearly: Number(priceYearly) || 0,
          maxSeats: 9999,
          maxLibraries: 10,
          isActive: Boolean(isActive),
          features: {
            durationMonths: Number(durationMonths) || 1,
            originalPrice: originalPrice ? Number(originalPrice) : null,
            badge: badge || '',
            description: description || '',
          },
        },
      });

      const feats = (plan.features || {}) as Record<string, any>;
      const formatted = {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        priceMonthly: Number(plan.priceMonthly),
        priceYearly: Number(plan.priceYearly),
        durationMonths: feats.durationMonths || 1,
        originalPrice: feats.originalPrice ? Number(feats.originalPrice) : null,
        badge: feats.badge || '',
        description: feats.description || '',
        isActive: plan.isActive,
        createdAt: plan.createdAt.toISOString(),
      };

      res.status(201).json({ success: true, plan: formatted, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { planId } = req.params;
      const {
        name,
        priceMonthly,
        priceYearly,
        durationMonths,
        originalPrice,
        badge,
        description,
        isActive,
      } = req.body;

      const { prisma } = await import('@library/database');
      const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!existing) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }

      const origPriceVal = originalPrice !== undefined && originalPrice !== null
        ? Number(originalPrice)
        : (priceYearly !== undefined && priceYearly !== null ? Number(priceYearly) : undefined);

      const currentFeats = (existing.features || {}) as Record<string, any>;
      const updatedFeats = {
        ...currentFeats,
        ...(durationMonths !== undefined && { durationMonths: Number(durationMonths) }),
        ...(origPriceVal !== undefined && { originalPrice: origPriceVal }),
        ...(badge !== undefined && { badge }),
        ...(description !== undefined && { description }),
      };

      const updated = await prisma.subscriptionPlan.update({
        where: { id: planId },
        data: {
          ...(name && { name: name.trim() }),
          ...(priceMonthly !== undefined && { priceMonthly: Number(priceMonthly) }),
          ...(origPriceVal !== undefined && { priceYearly: origPriceVal }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          features: updatedFeats,
        },
      });

      const feats = (updated.features || {}) as Record<string, any>;
      const finalOrigPrice = feats.originalPrice !== undefined && feats.originalPrice !== null
        ? Number(feats.originalPrice)
        : Number(updated.priceYearly);

      const formatted = {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        priceMonthly: Number(updated.priceMonthly),
        priceYearly: finalOrigPrice,
        durationMonths: feats.durationMonths || 1,
        originalPrice: finalOrigPrice,
        badge: feats.badge || '',
        description: feats.description || '',
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
      };

      res.status(200).json({ success: true, plan: formatted, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  async listCoupons(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma } = await import('@library/database');
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { usages: true },
          },
        },
      });

      const formatted = coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        maxDiscount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
        minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
        maxUses: c.maxRedemptions,
        usedCount: c._count?.usages || 0,
        validFrom: c.validFrom.toISOString(),
        validUntil: c.validUntil ? c.validUntil.toISOString() : null,
        applicablePlans: [],
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
      }));

      res.status(200).json({ success: true, coupons: formatted, data: formatted });
    } catch (err) {
      try {
        const coupons = dataStore.listAllCoupons();
        res.status(200).json({ success: true, coupons, data: coupons });
      } catch {
        next(err);
      }
    }
  }

  async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        code,
        discountType,
        discountValue,
        maxDiscount,
        minOrderAmount,
        maxUses,
        validFrom,
        validUntil,
        applicablePlans = [],
      } = req.body;

      if (!code || !discountType || discountValue === undefined) {
        res.status(400).json({ error: 'Code, discountType, and discountValue are required' });
        return;
      }

      const { prisma } = await import('@library/database');
      const crypto = await import('crypto');

      const coupon = await prisma.coupon.create({
        data: {
          id: crypto.randomUUID(),
          code: code.toUpperCase().trim(),
          discountType,
          discountValue: Number(discountValue),
          maxDiscountAmount: maxDiscount ? Number(maxDiscount) : null,
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
          maxRedemptions: maxUses ? Number(maxUses) : null,
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      const formatted = {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        maxDiscount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
        minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
        maxUses: coupon.maxRedemptions,
        usedCount: 0,
        validFrom: coupon.validFrom.toISOString(),
        validUntil: coupon.validUntil ? coupon.validUntil.toISOString() : null,
        applicablePlans: Array.isArray(applicablePlans) ? applicablePlans : [],
        isActive: coupon.isActive,
        createdAt: coupon.createdAt.toISOString(),
      };

      res.status(201).json({ success: true, coupon: formatted, data: formatted });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({ error: 'A coupon with this code already exists' });
        return;
      }
      next(err);
    }
  }

  async toggleCouponStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { couponId } = req.params;
      const { prisma } = await import('@library/database');
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) {
        res.status(404).json({ error: 'Coupon not found' });
        return;
      }

      const updated = await prisma.coupon.update({
        where: { id: couponId },
        data: { isActive: !coupon.isActive },
      });

      res.status(200).json({ success: true, coupon: updated, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma } = await import('@library/database');
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { ownedLibraries: true },
          },
        },
      });

      const formatted = users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        librariesOwned: u._count?.ownedLibraries || 0,
      }));

      res.status(200).json({ success: true, users: formatted, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      if (!role || !['USER', 'SUPER_ADMIN'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be USER or SUPER_ADMIN' });
        return;
      }

      const { prisma } = await import('@library/database');
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      res.status(200).json({
        success: true,
        user: { id: updated.id, email: updated.email, fullName: updated.fullName, role: updated.role },
      });
    } catch (err) {
      next(err);
    }
  }

  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const { prisma } = await import('@library/database');
      const logs = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      });

      const formatted = logs.map((l) => ({
        id: l.id,
        action: l.action,
        actorType: l.actorType,
        entityType: l.entityType,
        entityId: l.entityId,
        actorId: l.actorId,
        diffPayload: l.diffPayload,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
        actor: l.actor ? { email: l.actor.email, fullName: l.actor.fullName } : null,
      }));

      res.status(200).json({ success: true, auditLogs: formatted, logs: formatted, data: formatted });
    } catch (err) {
      try {
        const logs = dataStore.listAllAuditLogs(parseInt(req.query.limit as string) || 30);
        res.status(200).json({ success: true, auditLogs: logs, logs, data: logs });
      } catch {
        next(err);
      }
    }
  }

  async listPayments(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { prisma } = await import('@library/database');
      const payments = await prisma.payment.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          library: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                },
              },
            },
          },
        },
      });

      const formatted = payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        providerPaymentId: p.providerPaymentId,
        createdAt: p.createdAt.toISOString(),
        library: p.library ? { id: p.library.id, name: p.library.name } : null,
        user: p.library?.owner ? { id: p.library.owner.id, email: p.library.owner.email, fullName: p.library.owner.fullName } : null,
      }));

      res.status(200).json({ success: true, payments: formatted, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  async adjustSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { libraryId, daysToAdd, planCode, reason, action, days, adminNotes } = req.body;
      if (!libraryId) {
        res.status(400).json({ error: 'libraryId is required' });
        return;
      }

      const { prisma } = await import('@library/database');
      const crypto = await import('crypto');

      const library = await prisma.library.findUnique({
        where: { id: libraryId },
        include: {
          subscriptions: {
            orderBy: { endDate: 'desc' },
            take: 1,
            include: { plan: true },
          },
        },
      });

      if (!library) {
        res.status(404).json({ error: 'Library not found' });
        return;
      }

      let targetPlanId: string | null = null;
      if (planCode) {
        const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
        if (plan) targetPlanId = plan.id;
      }

      const activeSub = library.subscriptions[0];
      const now = new Date();
      let deltaDays = 0;
      if (typeof daysToAdd === 'number') {
        deltaDays = daysToAdd;
      } else if (days !== undefined) {
        const numDays = Math.max(1, parseInt(String(days), 10) || 30);
        deltaDays = (action === 'DECREASE' || action === 'REDUCE') ? -numDays : numDays;
      } else {
        deltaDays = 30;
      }

      let newStartDate = activeSub ? activeSub.startDate : now;
      let currentEnd = activeSub && activeSub.endDate > now ? activeSub.endDate : now;
      let newEndDate = new Date(currentEnd.getTime() + deltaDays * 24 * 60 * 60 * 1000);
      if (activeSub && newEndDate.getTime() < activeSub.startDate.getTime()) {
        newEndDate = new Date(activeSub.startDate);
      }

      const planIdToUse = targetPlanId || activeSub?.planId;
      if (!planIdToUse) {
        const defaultPlan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
        targetPlanId = defaultPlan?.id || null;
      }

      let updatedSub;
      const note = adminNotes || reason || `Super Admin adjusted subscription (${deltaDays > 0 ? '+' : ''}${deltaDays} days)`;

      if (activeSub) {
        updatedSub = await prisma.subscription.update({
          where: { id: activeSub.id },
          data: {
            ...(targetPlanId && { planId: targetPlanId }),
            endDate: newEndDate,
            status: newEndDate.getTime() > now.getTime() ? 'ACTIVE' : 'EXPIRED',
            provider: 'MANUAL_ADMIN',
            adminNotes: note,
          },
          include: { plan: true },
        });
      } else if (targetPlanId) {
        updatedSub = await prisma.subscription.create({
          data: {
            id: crypto.randomUUID(),
            libraryId,
            userId: library.ownerId,
            planId: targetPlanId,
            status: newEndDate.getTime() > now.getTime() ? 'ACTIVE' : 'EXPIRED',
            startDate: newStartDate,
            endDate: newEndDate,
            provider: 'MANUAL_ADMIN',
            adminNotes: note,
          },
          include: { plan: true },
        });
      }

      res.status(200).json({
        success: true,
        message: `Subscription successfully adjusted by ${Math.abs(deltaDays)} days!`,
        subscription: updatedSub,
      });
    } catch (err) {
      next(err);
    }
  }

  async broadcastNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, body } = req.body;
      if (!title || !body) {
        res.status(400).json({ error: 'Title and body are required' });
        return;
      }

      res.status(200).json({ success: true, count: 1, message: 'Broadcast initiated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
