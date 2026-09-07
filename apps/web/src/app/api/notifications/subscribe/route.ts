import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { savePushSubscription } from '@/lib/push-service';

export async function POST(req: NextRequest) {
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
