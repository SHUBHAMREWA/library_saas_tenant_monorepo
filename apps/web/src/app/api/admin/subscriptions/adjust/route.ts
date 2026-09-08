import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDefaultSubscriptionPlans } from '@library/database';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const adminEmail = (req.headers.get('x-admin-email') || '').toLowerCase().trim();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@libraryhub.com').toLowerCase().trim();

    if (adminEmail && adminEmail !== configuredAdminEmail) {
      const user = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!user || user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { libraryId, action, days = 30, planCode = 'PRO', adminNotes } = body;

    if (!libraryId) {
      return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    }

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
      include: { owner: true },
    });

    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    await ensureDefaultSubscriptionPlans(prisma);
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    }) || await prisma.subscriptionPlan.findFirst();

    if (!plan) {
      return NextResponse.json({ error: 'No subscription plan found' }, { status: 404 });
    }

    const now = new Date();

    // Find current active / latest subscription
    const existingSub = await prisma.subscription.findFirst({
      where: { libraryId },
      orderBy: { endDate: 'desc' },
    });

    let previousEndDate: Date | null = null;
    let newEndDate: Date;
    let targetSubId: string;
    let subStartDate: Date;

    const daysCount = Math.max(1, parseInt(String(days), 10) || 30);

    if (existingSub) {
      previousEndDate = new Date(existingSub.endDate);
      targetSubId = existingSub.id;
      subStartDate = existingSub.startDate;

      if (action === 'INCREASE' || action === 'EXTEND') {
        // Extend: add days to existing endDate (or today if expired)
        const baseDate = previousEndDate.getTime() > now.getTime() ? previousEndDate : now;
        newEndDate = new Date(baseDate.getTime() + daysCount * 24 * 60 * 60 * 1000);
      } else if (action === 'DECREASE' || action === 'REDUCE') {
        // Reduce: subtract days from existing endDate
        newEndDate = new Date(previousEndDate.getTime() - daysCount * 24 * 60 * 60 * 1000);
        // Ensure new end date is not earlier than subscription start date
        if (newEndDate.getTime() < subStartDate.getTime()) {
          newEndDate = subStartDate;
        }
      } else {
        return NextResponse.json({ error: "Invalid action. Use 'INCREASE' or 'DECREASE'." }, { status: 400 });
      }

      const isStillActive = newEndDate.getTime() > now.getTime();

      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          endDate: newEndDate,
          status: isStillActive ? 'MANUAL' : 'EXPIRED',
          provider: 'MANUAL_ADMIN',
          adminNotes: adminNotes || `Super Admin adjusted subscription validity (${action} by ${daysCount} days)`,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new subscription if none existed
      subStartDate = now;
      daysCount;
      newEndDate = new Date(now.getTime() + daysCount * 24 * 60 * 60 * 1000);
      targetSubId = crypto.randomUUID();

      await prisma.subscription.create({
        data: {
          id: targetSubId,
          libraryId,
          planId: plan.id,
          userId: library.ownerId,
          status: 'MANUAL',
          startDate: subStartDate,
          endDate: newEndDate,
          provider: 'MANUAL_ADMIN',
          autoRenew: false,
          adminNotes: adminNotes || `Super Admin granted ${daysCount} days validity`,
        },
      });
    }

    const adjustmentTypeLabel = action === 'INCREASE' ? 'Extended' : 'Decreased';
    const statusDetailMsg = `Super Admin ${adjustmentTypeLabel} validity by ${daysCount} days (${adminNotes || 'Manual Admin Override'})`;

    // Record adjustment entry in payments ledger so both User & Admin see it in subscription history!
    const savedPayment = await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        libraryId,
        subscriptionId: targetSubId,
        amount: 0,
        currency: 'INR',
        provider: 'MANUAL_ADMIN',
        status: 'SUCCESS',
        providerPaymentId: `ADMIN-ADJUST-${Date.now().toString().slice(-6)}`,
        providerOrderId: `order_admin_${Date.now()}`,
        idempotencyKey: `admin_adjust_${targetSubId}_${Date.now()}`,
        metadata: {
          planCode: plan.code,
          planName: `${plan.name} (Admin Override)`,
          durationMonths: Math.round(daysCount / 30) || 1,
          adjustmentAction: action,
          daysAdjusted: daysCount,
          previousEndDate: previousEndDate ? previousEndDate.toISOString().split('T')[0] : null,
          newEndDate: newEndDate.toISOString().split('T')[0],
          isAdminAdjustment: true,
          adminEmail: adminEmail || 'Super Admin',
          adminNotes: adminNotes || null,
          statusDetail: statusDetailMsg,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription successfully ${action === 'INCREASE' ? 'extended' : 'decreased'} by ${daysCount} days!`,
      subscription: {
        id: targetSubId,
        libraryName: library.name,
        previousEndDate: previousEndDate ? previousEndDate.toISOString().split('T')[0] : null,
        newEndDate: newEndDate.toISOString().split('T')[0],
        status: newEndDate.getTime() > now.getTime() ? 'ACTIVE' : 'EXPIRED',
      },
      payment: savedPayment,
    });
  } catch (error: any) {
    console.error('API POST /api/admin/subscriptions/adjust error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
