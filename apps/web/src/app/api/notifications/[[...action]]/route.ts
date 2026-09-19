import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import {
  savePushSubscription,
  deactivatePushSubscription,
  sendPushNotification,
  createAppNotification,
  getVapidPublicKey,
} from '@/lib/push-service';

export const dynamic = 'force-dynamic';

// --- Automated student expiration sweeper function ---
async function runStudentExpiryCheck() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      library: {
        isActive: true,
      },
      OR: [
        {
          memberships: {
            some: {
              status: 'ACTIVE',
              expectedEndDate: {
                lte: threeDaysFromNow,
              },
            },
          },
        },
        {
          seatAssignments: {
            some: {
              status: 'ACTIVE',
            },
          },
        },
      ],
    },
    include: {
      library: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      memberships: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      feeTransactions: {
        orderBy: { paymentDate: 'desc' },
        take: 3,
      },
      seatAssignments: {
        where: { status: 'ACTIVE' },
        include: { seat: true },
      },
    },
  });

  const alertsCreated: any[] = [];

  for (const std of students) {
    const mem = std.memberships[0];

    // Determine latest valid end date between membership and fee transactions
    let latestValidEndDate: Date | null = null;
    if (mem?.expectedEndDate) {
      latestValidEndDate = new Date(mem.expectedEndDate);
    }
    for (const tx of std.feeTransactions || []) {
      if (tx.validTo) {
        const d = new Date(tx.validTo);
        if (!isNaN(d.getTime()) && (!latestValidEndDate || d > latestValidEndDate)) {
          latestValidEndDate = d;
        }
      }
    }

    if (!latestValidEndDate) continue;

    const endDate = latestValidEndDate;
    const diffMs = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const activeSeatAssignments = std.seatAssignments || [];
    const seatNumber = activeSeatAssignments[0]?.seat?.seatNumber || 'Unassigned';
    const isExpired = daysRemaining <= 0;

    // If not expired and not expiring in <= 3 days, skip
    if (!isExpired && daysRemaining > 3) {
      continue;
    }

    // --- AUTO-UNASSIGN SEAT WHEN ENROLLMENT HAS ENDED ---
    if (isExpired && activeSeatAssignments.length > 0) {
      for (const sa of activeSeatAssignments) {
        await prisma.seatAssignment.update({
          where: { id: sa.id },
          data: { status: 'RELEASED', endDate: now },
        });

        if (sa.seatId) {
          const remainingActiveCount = await prisma.seatAssignment.count({
            where: { seatId: sa.seatId, status: 'ACTIVE' },
          });
          if (remainingActiveCount === 0) {
            await prisma.seat.update({
              where: { id: sa.seatId },
              data: { status: 'AVAILABLE' },
            });
          }
        }
      }

      if (mem && mem.status === 'ACTIVE') {
        await prisma.membership.update({
          where: { id: mem.id },
          data: { status: 'EXPIRED' },
        });
      }
    }

    // Check if notification already sent in last 24h for this student
    const recentAlert = await prisma.appNotification.findFirst({
      where: {
        libraryId: std.libraryId,
        type: 'STUDENT_EXPIRING',
        createdAt: { gte: oneDayAgo },
        data: {
          path: ['studentId'],
          equals: std.id,
        },
      },
    });

    if (recentAlert) {
      continue;
    }

    const title = isExpired
      ? `🚨 Membership Expired: ${std.fullName}`
      : `⚠️ Fee Expiring Soon: ${std.fullName} (${daysRemaining}d left)`;

    const body = isExpired
      ? (seatNumber && seatNumber !== 'Unassigned'
          ? `${std.fullName}'s membership expired on ${endDate.toLocaleDateString('en-IN')}. Seat #${seatNumber} has been automatically unassigned and made available.`
          : `${std.fullName}'s membership expired on ${endDate.toLocaleDateString('en-IN')}.`)
      : (seatNumber && seatNumber !== 'Unassigned'
          ? `${std.fullName}'s membership (Seat #${seatNumber}) expires in ${daysRemaining} day(s). Collect fee to retain seat.`
          : `${std.fullName}'s membership expires in ${daysRemaining} day(s). Collect fee to renew validity.`);

    const notification = await createAppNotification({
      title,
      body,
      type: 'STUDENT_EXPIRING',
      libraryId: std.libraryId,
      userId: std.library.ownerId,
      data: {
        studentId: std.id,
        studentName: std.fullName,
        seatNumber,
        daysRemaining,
        endDate: endDate.toISOString(),
        url: `/?tab=students&studentId=${std.id}`,
      },
      sendPush: true,
    });

    alertsCreated.push({
      studentId: std.id,
      studentName: std.fullName,
      libraryName: std.library.name,
      daysRemaining,
      notificationId: notification.id,
    });
  }

  return {
    checkedAt: now.toISOString(),
    expiringStudentsCount: students.length,
    alertsDispatched: alertsCreated.length,
    alerts: alertsCreated,
  };
}

// 1. GET /api/notifications or /api/notifications/vapid-public-key or /api/notifications/cron
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ action?: string[] }> }
) {
  const { action = [] } = await context.params;
  const path = action.join('/');

  if (path === 'vapid-public-key') {
    return NextResponse.json({
      success: true,
      publicKey: getVapidPublicKey(),
    });
  }

  if (path === 'cron') {
    try {
      const summary = await runStudentExpiryCheck();
      return NextResponse.json({
        success: true,
        message: 'Student expiry check executed successfully (3-hour cron schedule active)',
        ...summary,
      });
    } catch (error: any) {
      console.error('API GET /api/notifications/cron error:', error);
      return NextResponse.json({ error: error.message || 'Sweep failed' }, { status: 500 });
    }
  }

  if (!path || path === '') {
    // List notifications
    try {
      if (!process.env.DATABASE_URL) {
        return NextResponse.json({
          success: true,
          unreadCount: 0,
          notifications: [],
        });
      }

      const { searchParams } = new URL(req.url);
      const libraryId = searchParams.get('libraryId');
      const userEmail = searchParams.get('userEmail');

      let userId: string | null = null;
      if (userEmail) {
        const user = await prisma.user.findUnique({
          where: { email: userEmail.toLowerCase().trim() },
          select: { id: true },
        });
        if (user) userId = user.id;
      }

      const whereOr: any[] = [];
      if (libraryId) {
        whereOr.push({ libraryId });
      }
      if (userId) {
        whereOr.push({ userId });
      }
      whereOr.push({ libraryId: null, userId: null });

      const notifications = await prisma.appNotification.findMany({
        where: whereOr.length > 0 ? { OR: whereOr } : {},
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      return NextResponse.json({
        success: true,
        unreadCount,
        notifications: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.type,
          isRead: n.isRead,
          data: n.data,
          createdAt: n.createdAt.toISOString(),
        })),
      });
    } catch (error: any) {
      console.warn('API GET /api/notifications database fallback:', error?.message);
      return NextResponse.json({
        success: true,
        unreadCount: 0,
        notifications: [],
      });
    }
  }

  return NextResponse.json({ error: `Unknown notification GET route: ${path}` }, { status: 404 });
}

// 2. PATCH /api/notifications (mark notifications as read)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ action?: string[] }> }
) {
  const { action = [] } = await context.params;
  const path = action.join('/');

  if (path && path !== '') {
    return NextResponse.json({ error: `Unknown notification PATCH route: ${path}` }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { notificationId, markAllAsRead, libraryId, userEmail } = body;

    if (markAllAsRead) {
      let userId: string | null = null;
      if (userEmail) {
        const user = await prisma.user.findUnique({
          where: { email: userEmail.toLowerCase().trim() },
          select: { id: true },
        });
        if (user) userId = user.id;
      }

      const whereOr: any[] = [];
      if (libraryId) whereOr.push({ libraryId });
      if (userId) whereOr.push({ userId });
      whereOr.push({ libraryId: null, userId: null });

      await prisma.appNotification.updateMany({
        where: {
          OR: whereOr,
          isRead: false,
        },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId) {
      await prisma.appNotification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'notificationId or markAllAsRead is required' }, { status: 400 });
  } catch (error: any) {
    console.error('API PATCH /api/notifications error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// 3. POST /api/notifications/subscribe, /api/notifications/unsubscribe, /api/notifications/test, /api/notifications/cron
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action?: string[] }> }
) {
  const { action = [] } = await context.params;
  const path = action.join('/');

  if (path === 'subscribe') {
    try {
      const body = await req.json();
      const { subscription, userEmail, libraryId } = body;

      if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return NextResponse.json(
          { error: 'Valid browser push subscription with endpoint, p256dh, and auth is required' },
          { status: 400 }
        );
      }

      let userId: string | null = null;
      if (userEmail) {
        const user = await prisma.user.findUnique({
          where: { email: userEmail.toLowerCase().trim() },
          select: { id: true },
        });
        if (user) userId = user.id;
      }

      const userAgent = req.headers.get('user-agent');

      const record = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        libraryId: libraryId || null,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: 'Push subscription registered successfully',
        id: record.id,
      });
    } catch (error: any) {
      console.error('API POST /api/notifications/subscribe error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to register push subscription' },
        { status: 500 }
      );
    }
  }

  if (path === 'unsubscribe') {
    try {
      const body = await req.json();
      const { endpoint } = body;

      if (!endpoint) {
        return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
      }

      await deactivatePushSubscription(endpoint);

      return NextResponse.json({
        success: true,
        message: 'Push subscription deactivated',
      });
    } catch (error: any) {
      console.error('API POST /api/notifications/unsubscribe error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to deactivate push subscription' },
        { status: 500 }
      );
    }
  }

  if (path === 'test') {
    try {
      const body = await req.json();
      const { endpoint, libraryId, userEmail } = body;

      let targetSubscriptions: any[] = [];

      if (endpoint) {
        const sub = await prisma.pushSubscriptionRecord.findFirst({
          where: { endpoint, isActive: true },
        });
        if (sub) targetSubscriptions.push(sub);
      }

      if (targetSubscriptions.length === 0 && libraryId) {
        targetSubscriptions = await prisma.pushSubscriptionRecord.findMany({
          where: { libraryId, isActive: true },
        });
      }

      if (targetSubscriptions.length === 0 && userEmail) {
        const user = await prisma.user.findUnique({
          where: { email: userEmail.toLowerCase().trim() },
          include: { pushSubscriptions: { where: { isActive: true } } },
        });
        if (user?.pushSubscriptions) {
          targetSubscriptions = user.pushSubscriptions;
        }
      }

      let userId: string | null = null;
      if (userEmail) {
        const user = await prisma.user.findUnique({
          where: { email: userEmail.toLowerCase().trim() },
          select: { id: true },
        });
        if (user) userId = user.id;
      }

      const title = '🔔 Test Notification';
      const messageBody = 'Service Worker push notifications are working smoothly on your device!';

      await createAppNotification({
        title,
        body: messageBody,
        type: 'SYSTEM',
        libraryId: libraryId || null,
        userId,
        data: { test: true, timestamp: new Date().toISOString() },
        sendPush: false,
      });

      if (targetSubscriptions.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No active push subscriptions found on this device or account. Please allow push notifications first.',
        });
      }

      const pushPromises = targetSubscriptions.map((sub) =>
        sendPushNotification(sub, {
          title,
          body: messageBody,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-96x96.png',
          url: '/',
          vibrate: [200, 100, 200],
        })
      );

      const results = await Promise.allSettled(pushPromises);
      const successCount = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length;

      return NextResponse.json({
        success: true,
        message: `Test notification sent to ${successCount} device(s)`,
        dispatchedCount: targetSubscriptions.length,
        successCount,
      });
    } catch (error: any) {
      console.error('API POST /api/notifications/test error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send test notification' },
        { status: 500 }
      );
    }
  }

  if (path === 'cron') {
    try {
      const summary = await runStudentExpiryCheck();
      return NextResponse.json({
        success: true,
        message: 'Student expiry check triggered manually',
        ...summary,
      });
    } catch (error: any) {
      console.error('API POST /api/notifications/cron error:', error);
      return NextResponse.json({ error: error.message || 'Sweep failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown notification POST route: ${path}` }, { status: 404 });
}