import webpush from 'web-push';
import { prisma } from '@library/database';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BGQJyy-lDjebPrLpBVsTyHKMrQ4yYA6KPOJiVS30Vy9I_rEve_PDJGoVKSbt2IV148x_f3Ko9tkPSxxH3JeGDnE';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  '0ciPt4echT8-_8NbZCojK6O6Y4ZyKS763WmAZ5gCZvg';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  'mailto:shubhamrewamp17@gmail.com';

// Configure Web Push with VAPID details
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[PushService] WebPush VAPID setup warning:', err);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
  vibrate?: number[];
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

/**
 * Save or update browser PushSubscription in DB
 */
export async function savePushSubscription({
  endpoint,
  p256dh,
  auth,
  userId,
  libraryId,
  userAgent,
}: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string | null;
  libraryId?: string | null;
  userAgent?: string | null;
}) {
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription: endpoint, p256dh and auth are required');
  }

  return await prisma.pushSubscriptionRecord.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh,
      auth,
      userId: userId || null,
      libraryId: libraryId || null,
      userAgent: userAgent || null,
      isActive: true,
    },
    update: {
      p256dh,
      auth,
      userId: userId || undefined,
      libraryId: libraryId || undefined,
      userAgent: userAgent || undefined,
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

/**
 * Deactivate a push subscription (when user toggles disallow)
 */
export async function deactivatePushSubscription(endpoint: string) {
  if (!endpoint) return null;
  try {
    return await prisma.pushSubscriptionRecord.updateMany({
      where: { endpoint },
      data: { isActive: false },
    });
  } catch (err) {
    console.warn('[PushService] Failed to deactivate push subscription:', err);
    return null;
  }
}

/**
 * Send push notification to a single PushSubscriptionRecord
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string; id?: string },
  payload: PushPayload
) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    url: payload.url || '/',
    tag: payload.tag || 'library-notification',
    data: {
      ...(payload.data || {}),
      url: payload.url || '/',
      dateOfArrival: Date.now(),
    },
    vibrate: payload.vibrate || [100, 50, 100],
  });

  try {
    const result = await webpush.sendNotification(pushSubscription, notificationPayload);
    return { success: true, statusCode: result.statusCode };
  } catch (error: any) {
    console.error('[PushService] Web push dispatch failed:', error?.message || error);
    // If endpoint is expired or invalid (404 or 410 Gone), deactivate it in DB
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      prisma.pushSubscriptionRecord.updateMany({
        where: { endpoint: subscription.endpoint },
        data: { isActive: false },
      }).catch(() => {});
    }
    return { success: false, error: error?.message || 'Dispatch failed' };
  }
}

/**
 * Record an in-app notification in PostgreSQL and optionally dispatch Web Push
 */
export async function createAppNotification({
  title,
  body,
  type = 'INFO',
  libraryId,
  userId,
  data = {},
  sendPush = true,
}: {
  title: string;
  body: string;
  type?: 'STUDENT_EXPIRING' | 'ADMIN_BROADCAST' | 'SYSTEM' | 'PAYMENT' | 'INFO';
  libraryId?: string | null;
  userId?: string | null;
  data?: Record<string, any>;
  sendPush?: boolean;
}) {
  // 1. Create in-app record
  const notification = await prisma.appNotification.create({
    data: {
      title,
      body,
      type,
      libraryId: libraryId || null,
      userId: userId || null,
      data: data as any,
    },
  });

  // 2. Dispatch push to active service worker subscriptions
  if (sendPush) {
    const subscriptions = await prisma.pushSubscriptionRecord.findMany({
      where: {
        isActive: true,
        OR: [
          ...(libraryId ? [{ libraryId }] : []),
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    for (const sub of subscriptions) {
      await sendPushNotification(sub, {
        title,
        body,
        data: { ...data, notificationId: notification.id },
        url: data.url || '/',
      });
    }
  }

  return notification;
}

/**
 * Send push notification to all subscriptions linked to a library
 */
export async function sendPushToLibrary(libraryId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscriptionRecord.findMany({
    where: {
      libraryId,
      isActive: true,
    },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  return results;
}

/**
 * Broadcast push notification to ALL active subscriptions across the platform (Super Admin)
 */
export async function broadcastPushToAll(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscriptionRecord.findMany({
    where: {
      isActive: true,
    },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  return results;
}
