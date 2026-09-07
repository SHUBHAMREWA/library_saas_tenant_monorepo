import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { sendPushNotification, createAppNotification } from '@/lib/push-service';

export async function POST(req: NextRequest) {
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

    // Record notification in DB
    await createAppNotification({
      title,
      body: messageBody,
      type: 'SYSTEM',
      libraryId: libraryId || null,
      userId,
      data: { test: true, timestamp: new Date().toISOString() },
      sendPush: false, // We'll push directly to targetSubscriptions
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
        badge: '/icons/icon-192x192.png',
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
