import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(req: NextRequest) {
  try {
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
    // Also include platform-wide broadcasts (where libraryId is null and userId is null)
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
    console.error('API GET /api/notifications error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
