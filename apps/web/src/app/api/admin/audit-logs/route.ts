import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 100);

    const logs = await prisma.auditLog.findMany({
      include: {
        actor: {
          select: { id: true, fullName: true, email: true },
        },
        library: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      actorName: log.actor?.fullName || 'System',
      actorEmail: log.actor?.email || '',
      actorType: log.actorType,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      libraryName: log.library?.name || null,
      diffPayload: log.diffPayload,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error: any) {
    console.error('API GET /api/admin/audit-logs error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
