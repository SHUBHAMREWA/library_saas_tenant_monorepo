import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(req: NextRequest) {
  try {
    const adminEmail = (req.headers.get('x-admin-email') || '').toLowerCase().trim();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@libraryhub.com').toLowerCase().trim();

    if (adminEmail && adminEmail !== configuredAdminEmail) {
      const user = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!user || user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
      }
    }

    const payments = await prisma.payment.findMany({
      include: {
        library: {
          select: {
            id: true,
            name: true,
            slug: true,
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const formatted = payments.map((p) => {
      const meta = (p.metadata || {}) as Record<string, any>;
      return {
        id: p.id,
        libraryId: p.libraryId,
        libraryName: p.library?.name || 'Unknown Library',
        ownerName: p.library?.owner?.fullName || 'Unknown Owner',
        ownerEmail: p.library?.owner?.email || meta.paidByEmail || '',
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        paymentId: p.providerPaymentId || p.providerOrderId || p.idempotencyKey,
        orderId: p.providerOrderId,
        createdAt: p.createdAt.toISOString(),
        planCode: meta.planCode || 'PRO',
        planName: meta.planName || (meta.planCode ? `${meta.planCode} Plan` : 'SaaS Plan'),
        durationMonths: meta.durationMonths || 1,
        isAutopay: Boolean(meta.isAutopay || meta.action === 'AUTOPAY_CANCELLED'),
        isCancelled: meta.action === 'AUTOPAY_CANCELLED' || Boolean(meta.cancellationReason),
        cancellationReason: meta.cancellationReason || null,
        cancelledAt: meta.cancelledAt || null,
        failureReason: meta.failureReason || null,
        statusDetail: meta.statusDetail || null,
      };
    });

    return NextResponse.json({ success: true, payments: formatted });
  } catch (error: any) {
    console.error('API GET /api/admin/payments error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
