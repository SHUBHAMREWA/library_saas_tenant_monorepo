import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { sendPushNotification } from '@/lib/push-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: messageBody, target = 'ALL', targetLibraryId, url = '/' } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    const cleanTitle = String(title).trim();
    const cleanBody = String(messageBody).trim();
    const cleanUrl = String(url || '/').trim();

    // 1. Create AppNotification in PostgreSQL (libraryId: null, userId: null for ALL) so all users see it
    const notification = await prisma.appNotification.create({
      data: {
        title: cleanTitle,
        body: cleanBody,
        type: 'ADMIN_BROADCAST',
        libraryId: target === 'LIBRARY' && targetLibraryId ? targetLibraryId : null,
        userId: null,
        data: {
          url: cleanUrl,
          broadcast: true,
          target,
          targetLibraryId: target === 'LIBRARY' ? targetLibraryId : undefined,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 2. Fetch target push subscriptions
    let targetSubscriptions = [];
    if (target === 'LIBRARY' && targetLibraryId) {
      // Find the library's owner to ensure all devices linked to this branch or owner receive the push
      const library = await prisma.library.findUnique({
        where: { id: targetLibraryId },
        select: { id: true, ownerId: true },
      });

      const userIdsToTarget: string[] = [];
      if (library?.ownerId) userIdsToTarget.push(library.ownerId);

      targetSubscriptions = await prisma.pushSubscriptionRecord.findMany({
        where: {
          isActive: true,
          OR: [
            { libraryId: targetLibraryId },
            ...(userIdsToTarget.length > 0 ? [{ userId: { in: userIdsToTarget } }] : []),
          ],
        },
      });
    } else {
      // Global broadcast to all active push subscriptions
      targetSubscriptions = await prisma.pushSubscriptionRecord.findMany({
        where: { isActive: true },
      });
    }


    // 3. Dispatch Web Push through Service Worker to all devices
    const pushPayload = {
      title: cleanTitle,
      body: cleanBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      url: cleanUrl,
      vibrate: [200, 100, 200],
      tag: 'broadcast-' + notification.id,
      data: {
        notificationId: notification.id,
        url: cleanUrl,
        broadcast: true,
      },
    };

    const pushPromises = targetSubscriptions.map((sub) =>
      sendPushNotification(sub, pushPayload)
    );

    const results = await Promise.allSettled(pushPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    return NextResponse.json({
      success: true,
      count: targetSubscriptions.length,
      successCount,
      notificationId: notification.id,
      message: targetSubscriptions.length > 0
        ? 'Push notification broadcast delivered to ' + successCount + ' device(s)!'
        : 'Broadcast published to notification inbox & will pop up for all active users!',
    });
  } catch (error: any) {
    console.error('API POST /api/admin/notifications/broadcast error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch broadcast' },
      { status: 500 }
    );
  }
}
