import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';
import crypto from 'crypto';

export async function handleGetLibraries(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Case-insensitive user lookup to prevent duplicate records
    let user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0],
        },
      });
    }

    const libraryIncludeOptions = {
      subscriptions: {
        include: { plan: true },
        orderBy: { endDate: 'desc' as const },
        take: 1,
      },
      rooms: {
        where: { isActive: true },
        include: {
          rows: {
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { createdAt: 'asc' as const },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    };

    const NO_CACHE_HEADERS = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    // 2. Fetch local libraries directly from Neon DB (fast indexed lookup)
    let libraries = await prisma.library.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { owner: { email: { equals: cleanEmail, mode: 'insensitive' } } },
          { contactEmail: { equals: cleanEmail, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: libraryIncludeOptions,
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fallback: only if user has 0 libraries, sync from Render cloud backend (first login / migration)
    if (libraries.length === 0) {
      try {
        const rawBackend =
          (process.env.API_URL && process.env.API_URL.startsWith('http') ? process.env.API_URL : null) ||
          (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http') ? process.env.NEXT_PUBLIC_API_URL : null) ||
          'https://seelibrarybackend.onrender.com';
        const renderOrigin = rawBackend.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

        const renderRes = await fetch(`${renderOrigin}/api/v1/admin/libraries`, {
          headers: { 'x-admin-email': 'shubhamrewamp17@gmail.com' },
          signal: AbortSignal.timeout(3000),
        });

        if (renderRes.ok) {
          const renderData = await renderRes.json();
          const candidateLibs = (renderData.libraries || []).filter(
            (l: any) =>
              l.owner?.email?.toLowerCase().trim() === cleanEmail ||
              l.contactEmail?.toLowerCase().trim() === cleanEmail
          );

          if (candidateLibs.length > 0) {
            for (const rLib of candidateLibs) {
              try {
                await prisma.library.upsert({
                  where: { id: rLib.id },
                  update: {
                    name: rLib.name,
                    contactPhone: rLib.contactPhone || '7898522932',
                    address: rLib.address || null,
                    isActive: true,
                  },
                  create: {
                    id: rLib.id,
                    ownerId: user.id,
                    name: rLib.name,
                    slug: rLib.slug || `${rLib.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
                    contactPhone: rLib.contactPhone || '7898522932',
                    address: rLib.address || null,
                    isActive: true,
                  },
                });

                if (rLib.activeSubscription) {
                  try {
                    const planCode = rLib.activeSubscription.plan?.code || 'BASIC';
                    const plan = await prisma.subscriptionPlan.findFirst({
                      where: { code: planCode },
                    });
                    if (plan) {
                      await prisma.subscription.upsert({
                        where: { id: rLib.activeSubscription.id },
                        update: {
                          status: rLib.activeSubscription.status || 'ACTIVE',
                          endDate: new Date(rLib.activeSubscription.endDate),
                        },
                        create: {
                          id: rLib.activeSubscription.id,
                          userId: user.id,
                          libraryId: rLib.id,
                          planId: plan.id,
                          status: rLib.activeSubscription.status || 'ACTIVE',
                          startDate: new Date(rLib.createdAt || Date.now()),
                          endDate: new Date(rLib.activeSubscription.endDate),
                        },
                      });
                    }
                  } catch (subErr) {
                    console.warn('[handleGetLibraries] Subscription mirror warning:', subErr);
                  }
                }
              } catch (mirrorErr) {
                console.warn('[handleGetLibraries] Mirror error:', mirrorErr);
              }
            }

            // Refetch after mirror
            libraries = await prisma.library.findMany({
              where: {
                OR: [
                  { ownerId: user.id },
                  { owner: { email: { equals: cleanEmail, mode: 'insensitive' } } },
                  { contactEmail: { equals: cleanEmail, mode: 'insensitive' } },
                ],
                isActive: true,
              },
              include: libraryIncludeOptions,
              orderBy: { createdAt: 'desc' },
            });
          }
        }
      } catch (renderSyncErr) {
        console.warn('[handleGetLibraries] Render sync warning:', renderSyncErr);
      }
    }

    const userSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'MANUAL'] },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
      take: 1,
    });
    const latestUserSub = userSubscriptions[0] || null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fiveDaysAhead = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const libraryIds = libraries.map((l) => l.id);

    // 4. Batched Database Aggregations (Single round-trip instead of N * 8 linear queries)
    const [
      seatCounts,
      studentCounts,
      unassignedCounts,
      expiringCounts,
      monthlyRevenues,
      pendingDuesAggs,
    ] = libraryIds.length > 0
      ? await Promise.all([
          // Total and occupied seats
          prisma.seat.groupBy({
            by: ['libraryId', 'status'],
            where: { libraryId: { in: libraryIds }, isActive: true },
            _count: { id: true },
          }),
          // Active students
          prisma.student.groupBy({
            by: ['libraryId'],
            where: { libraryId: { in: libraryIds }, isActive: true },
            _count: { id: true },
          }),
          // Unassigned active students
          prisma.student.groupBy({
            by: ['libraryId'],
            where: {
              libraryId: { in: libraryIds },
              isActive: true,
              seatAssignments: { none: { status: 'ACTIVE' } },
            },
            _count: { id: true },
          }),
          // Memberships expiring in 5 days
          prisma.membership.groupBy({
            by: ['libraryId'],
            where: {
              libraryId: { in: libraryIds },
              status: 'ACTIVE',
              expectedEndDate: { lte: fiveDaysAhead, gte: now },
            },
            _count: { id: true },
          }),
          // Monthly fee revenue
          prisma.studentFeeTransaction.groupBy({
            by: ['libraryId'],
            where: {
              libraryId: { in: libraryIds },
              status: 'SUCCESS',
              paymentDate: { gte: startOfMonth },
            },
            _sum: { amount: true },
          }),
          // Pending dues amount and student count
          prisma.studentFeeTransaction.groupBy({
            by: ['libraryId'],
            where: {
              libraryId: { in: libraryIds },
              remainingFee: { gt: 0 },
            },
            _sum: { remainingFee: true },
            _count: { id: true },
          }),
        ])
      : [[], [], [], [], [], []];

    // Build O(1) in-memory lookup maps
    const totalSeatsMap = new Map<string, number>();
    const occupiedSeatsMap = new Map<string, number>();
    for (const sc of seatCounts) {
      totalSeatsMap.set(sc.libraryId, (totalSeatsMap.get(sc.libraryId) || 0) + sc._count.id);
      if (sc.status === 'OCCUPIED' || sc.status === 'RESERVED') {
        occupiedSeatsMap.set(sc.libraryId, (occupiedSeatsMap.get(sc.libraryId) || 0) + sc._count.id);
      }
    }

    const activeStudentsMap = new Map<string, number>();
    for (const sc of studentCounts) {
      activeStudentsMap.set(sc.libraryId, sc._count.id);
    }

    const unassignedStudentsMap = new Map<string, number>();
    for (const uc of unassignedCounts) {
      unassignedStudentsMap.set(uc.libraryId, uc._count.id);
    }

    const expiringSoonMap = new Map<string, number>();
    for (const ec of expiringCounts) {
      expiringSoonMap.set(ec.libraryId, ec._count.id);
    }

    const monthlyRevenueMap = new Map<string, number>();
    for (const mr of monthlyRevenues) {
      monthlyRevenueMap.set(mr.libraryId, Number(mr._sum.amount || 0));
    }

    const pendingDuesMap = new Map<string, { sum: number; count: number }>();
    for (const pd of pendingDuesAggs) {
      pendingDuesMap.set(pd.libraryId, {
        sum: Number(pd._sum.remainingFee || 0),
        count: pd._count.id,
      });
    }

    const formattedLibraries = libraries.map((lib) => {
      const totalSeats = totalSeatsMap.get(lib.id) || 0;
      const occupiedSeats = occupiedSeatsMap.get(lib.id) || 0;
      const activeStudents = activeStudentsMap.get(lib.id) || 0;
      const unassignedStudents = unassignedStudentsMap.get(lib.id) || 0;
      const expiringSoonCount = expiringSoonMap.get(lib.id) || 0;
      const thisMonthFeeCollected = monthlyRevenueMap.get(lib.id) || 0;
      const duesInfo = pendingDuesMap.get(lib.id) || { sum: 0, count: 0 };
      const totalPendingDuesAmount = duesInfo.sum;
      const studentsWithDuesCount = duesInfo.count;

      const availableSeats = Math.max(0, totalSeats - occupiedSeats);
      const occupancyPercentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

      const formattedRooms = (lib.rooms || []).map((rm) => ({
          id: rm.id,
          name: rm.name,
          rows: Array.from(new Set((rm.rows || []).map((rw) => rw.name.trim()))),
        }));

        const latestSub = (lib as any).subscriptions?.[0] || latestUserSub;
        let hasActiveSub = false;
        let subDaysRemaining = 0;

        if (latestSub) {
          const subEndDate = new Date(latestSub.endDate);
          subEndDate.setHours(23, 59, 59, 999);
          hasActiveSub = Boolean(
            (latestSub.status === 'ACTIVE' || latestSub.status === 'MANUAL') &&
            subEndDate.getTime() >= now.getTime()
          );
          subDaysRemaining = Math.max(0, Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        const formattedSubscription = latestSub
          ? {
              id: latestSub.id,
              planCode: latestSub.plan?.code || 'PRO',
              planName: latestSub.plan?.name || 'Pro Plan',
              status: hasActiveSub ? 'ACTIVE' : 'EXPIRED',
              startDate: latestSub.startDate.toISOString().split('T')[0],
              endDate: latestSub.endDate.toISOString().split('T')[0],
              daysRemaining: subDaysRemaining,
            }
          : null;

        return {
          id: lib.id,
          name: lib.name,
          contactPhone: lib.contactPhone,
          address: lib.address || undefined,
          rooms: formattedRooms,
          seats: [], // On-demand: loaded when user opens Seats tab
          students: [], // On-demand: loaded when user opens Students tab
          feeTransactions: [], // On-demand: loaded when user opens Transactions tab
          stats: {
            totalSeats,
            occupiedSeats,
            availableSeats,
            occupancyPercentage,
            totalStudents: activeStudents,
            activeStudents,
            unassignedStudents,
            thisMonthFeeCollected,
            totalPendingDuesAmount,
            studentsWithDuesCount,
            expiringSoonCount,
          },
          createdAt: lib.createdAt.toISOString(),
          hasActiveSubscription: hasActiveSub,
          subscription: formattedSubscription,
        };
      });

    return NextResponse.json(
      { libraries: formattedLibraries },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('API GET /api/libraries error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function handleCreateLibrary(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail, name, contactPhone, address } = body;

    if (!userEmail || !name) {
      return NextResponse.json({ error: 'User email and library name are required' }, { status: 400 });
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {},
      create: {
        id: crypto.randomUUID(),
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
      },
    });

    const libId = crypto.randomUUID();
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    const newLib = await prisma.library.create({
      data: {
        id: libId,
        ownerId: user.id,
        name: name.trim(),
        slug,
        contactPhone: contactPhone?.trim() || '9999999999',
        address: address?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        library: {
          id: newLib.id,
          name: newLib.name,
          contactPhone: newLib.contactPhone,
          address: newLib.address || undefined,
          rooms: [],
          seats: [],
          students: [],
          createdAt: newLib.createdAt.toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('API POST /api/libraries error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}