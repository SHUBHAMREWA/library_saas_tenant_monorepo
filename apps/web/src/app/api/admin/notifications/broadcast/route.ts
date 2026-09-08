import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { broadcastPushToAll, sendPushToLibrary, createAppNotification } from '@/lib/push-service';

export async function POST(req: NextRequest) {
  try {
    const callerEmail = (req.headers.get('x-user-email') || req.headers.get('x-admin-email') || '').toLowerCase().trim();
    const body = await req.json();
    const requestEmail = (body.adminEmail || callerEmail).toLowerCase().trim();
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    let isSuperAdmin = Boolean(configuredAdminEmail && requestEmail === configuredAdminEmail);
    if (!isSuperAdmin && requestEmail) {
      const user = await prisma.user.findUnique({ where: { email: requestEmail } });
      isSuperAdmin = user?.role === 'SUPER_ADMIN';
    }

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Only Super Admin can broadcast notifications.' },
        { status: 403 }
      );
    }

    const { title, body: messageBody, target = 'ALL', targetLibraryId, url = '/' } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and message body are required' },
        { status: 400 }
      );
    }

    let successCount = 0;

    if (target === 'LIBRARY' && targetLibraryId) {
      const lib = await prisma.library.findUnique({
        where: { id: targetLibraryId },
        select: { id: true, name: true, ownerId: true },
      });

      if (!lib) {
        return NextResponse.json({ error: 'Target library not found' }, { status: 404 });
      }

      await createAppNotification({
        title,
        body: messageBody,
        type: 'ADMIN_BROADCAST',
        libraryId: lib.id,
        userId: lib.ownerId,
        data: { target: 'LIBRARY', libraryName: lib.name, url },
        sendPush: false,
      });

      const results = await sendPushToLibrary(lib.id, {
        title: `📢 ${title}`,
        body: messageBody,
        url,
        tag: 'admin-broadcast',
      });

      successCount = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length;

      return NextResponse.json({
        success: true,
        message: `Broadcast delivered to library "${lib.name}" (${successCount} devices notified)`,
        successCount,
      });
    }

    // Otherwise, broadcast to ALL libraries & users across the platform
    await createAppNotification({
      title,
      body: messageBody,
      type: 'ADMIN_BROADCAST',
      libraryId: null,
      userId: null,
      data: { target: 'ALL', url },
      sendPush: false,
    });

    const results = await broadcastPushToAll({
      title: `📢 ${title}`,
      body: messageBody,
      url,
      tag: 'admin-broadcast-global',
    });

    successCount = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length;

    return NextResponse.json({
      success: true,
      message: `Global broadcast dispatched to all platform devices (${successCount} devices received push)`,
      successCount,
    });
  } catch (error: any) {
    console.error('API POST /api/admin/notifications/broadcast error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to broadcast notification' },
      { status: 500 }
    );
  }
}
