import { NextRequest, NextResponse } from 'next/server';
import { deactivatePushSubscription } from '@/lib/push-service';

export async function POST(req: NextRequest) {
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
