import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import { createAppNotification } from '@/lib/push-service';

// 3-Hour automated student expiration sweeper function
async function runStudentExpiryCheck() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Fetch active students with their active membership and seat assignment
  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      library: {
        isActive: true,
      },
      memberships: {
        some: {
          status: 'ACTIVE',
          expectedEndDate: {
            lte: threeDaysFromNow,
          },
        },
      },
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
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      seatAssignments: {
        where: { status: 'ACTIVE' },
        include: { seat: true },
        take: 1,
      },
    },
  });

  const alertsCreated: any[] = [];

  for (const std of students) {
    const mem = std.memberships[0];
    if (!mem || !mem.expectedEndDate) continue;

    const endDate = new Date(mem.expectedEndDate);
    const diffMs = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const seatNumber = std.seatAssignments[0]?.seat?.seatNumber || 'Unassigned';

    // Prevent duplicate alert for the same student within the last 24 hours
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

    const isExpired = daysRemaining <= 0;
    const title = isExpired
      ? `🚨 Membership Expired: ${std.fullName}`
      : `⚠️ Fee Expiring Soon: ${std.fullName} (${daysRemaining}d left)`;

    const body = isExpired
      ? `${std.fullName}'s membership expired on ${endDate.toLocaleDateString('en-IN')}. Seat #${seatNumber} may be released.`
      : `${std.fullName}'s membership (Seat #${seatNumber}) expires in ${daysRemaining} day(s). Collect fee to retain seat.`;

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

// In-process 3-Hour background interval runner (singleton safeguard)
const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 10,800,000 ms

declare global {
  var __library_3hr_cron_started: boolean | undefined;
}

if (!global.__library_3hr_cron_started && process.env.NODE_ENV !== 'test') {
  global.__library_3hr_cron_started = true;
  console.log('🕒 [Background Cron] Registered 3-hour student expiry notification runner.');
  setInterval(async () => {
    try {
      console.log('🕒 [Background Cron] Running 3-hour student expiry sweep...');
      const summary = await runStudentExpiryCheck();
      console.log(`🕒 [Background Cron] Sweep completed. Dispatched ${summary.alertsDispatched} alert(s).`);
    } catch (err) {
      console.error('🕒 [Background Cron Error] Expiry sweep failed:', err);
    }
  }, THREE_HOURS_MS);
}

export async function GET() {
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

export async function POST() {
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
