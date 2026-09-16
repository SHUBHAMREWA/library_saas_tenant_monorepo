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

    // 2. Cloud Synchronization: Sync libraries and room state from Render backend
    try {
      const rawBackend =
        (process.env.API_URL && process.env.API_URL.startsWith('http') ? process.env.API_URL : null) ||
        (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http') ? process.env.NEXT_PUBLIC_API_URL : null) ||
        'https://seelibrarybackend.onrender.com';
      const renderOrigin = rawBackend.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

      const renderRes = await fetch(`${renderOrigin}/api/v1/admin/libraries`, {
        headers: { 'x-admin-email': 'shubhamrewamp17@gmail.com' },
        signal: AbortSignal.timeout(3500),
      });

      if (renderRes.ok) {
        const renderData = await renderRes.json();
        const candidateLibs = (renderData.libraries || []).filter(
          (l: any) =>
            l.owner?.email?.toLowerCase().trim() === cleanEmail ||
            l.contactEmail?.toLowerCase().trim() === cleanEmail
        );

        if (candidateLibs.length > 0) {
          const cloudLibIds = candidateLibs.map((l: any) => l.id);

          // Mark local libraries as inactive if deleted from Render
          await prisma.library.updateMany({
            where: {
              OR: [
                { ownerId: user.id },
                { owner: { email: { equals: cleanEmail, mode: 'insensitive' } } },
                { contactEmail: { equals: cleanEmail, mode: 'insensitive' } },
              ],
              id: { notIn: cloudLibIds },
              isActive: true,
            },
            data: { isActive: false },
          });

          for (const rLib of candidateLibs) {
            try {
              // Upsert library
              await prisma.library.upsert({
                where: { id: rLib.id },
                update: {
                  name: rLib.name,
                  contactPhone: rLib.contactPhone || '7898522932',
                  address: rLib.address || null,
                  isActive: rLib.isActive ?? true,
                },
                create: {
                  id: rLib.id,
                  ownerId: user.id,
                  name: rLib.name,
                  slug: rLib.slug || `${rLib.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
                  contactPhone: rLib.contactPhone || '7898522932',
                  address: rLib.address || null,
                  isActive: rLib.isActive ?? true,
                },
              });

              // Mirror active subscription if present on cloud
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

              // Mirror real rooms from Render (source of truth)
              try {
                const roomsRes = await fetch(`${renderOrigin}/api/v1/libraries/${rLib.id}/spaces/rooms`, {
                  headers: { 'x-admin-email': 'shubhamrewamp17@gmail.com' },
                  signal: AbortSignal.timeout(2500),
                });

                if (roomsRes.ok) {
                  const roomsData = await roomsRes.json();
                  const cloudRooms = roomsData.data || roomsData.rooms || [];
                  const cloudRoomIds = cloudRooms.map((cr: any) => cr.id);

                  // Delete local rooms not present in Render (e.g. rooms deleted by user)
                  const localRoomsToDelete = await prisma.room.findMany({
                    where: {
                      libraryId: rLib.id,
                      ...(cloudRoomIds.length > 0 ? { id: { notIn: cloudRoomIds } } : {}),
                    },
                    select: { id: true },
                  });

                  if (localRoomsToDelete.length > 0) {
                    const toDeleteIds = localRoomsToDelete.map((r) => r.id);
                    await prisma.seatAssignment.deleteMany({
                      where: { libraryId: rLib.id, seat: { row: { roomId: { in: toDeleteIds } } } },
                    });
                    await prisma.seat.deleteMany({
                      where: { libraryId: rLib.id, row: { roomId: { in: toDeleteIds } } },
                    });
                    await prisma.row.deleteMany({
                      where: { libraryId: rLib.id, roomId: { in: toDeleteIds } },
                    });
                    await prisma.room.deleteMany({
                      where: { id: { in: toDeleteIds } },
                    });
                  }

                  // Upsert real rooms and rows from Render cloud
                  for (const cr of cloudRooms) {
                    const roomObj = await prisma.room.upsert({
                      where: { id: cr.id },
                      update: { name: cr.name, isActive: true },
                      create: { id: cr.id, libraryId: rLib.id, name: cr.name, isActive: true },
                    });
                    if (Array.isArray(cr.rows)) {
                      for (const rw of cr.rows) {
                        await prisma.row.upsert({
                          where: { id: rw.id },
                          update: { name: rw.name, hasLocker: Boolean(rw.hasLocker), isActive: true },
                          create: {
                            id: rw.id,
                            libraryId: rLib.id,
                            roomId: roomObj.id,
                            name: rw.name,
                            hasLocker: Boolean(rw.hasLocker),
                            isActive: true,
                          },
                        });
                      }
                    }
                  }
                }
              } catch (roomSyncErr) {
                console.warn(`[handleGetLibraries] Room sync error for ${rLib.id}:`, roomSyncErr);
              }
            } catch (mirrorErr) {
              console.warn('[handleGetLibraries] Mirror error:', mirrorErr);
            }
          }
        }
      }
    } catch (renderSyncErr) {
      console.warn('[handleGetLibraries] Render sync warning:', renderSyncErr);
    }

    const libraries = await prisma.library.findMany({
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

    const formattedLibraries = await Promise.all(
      libraries.map(async (lib) => {
        const [
          totalSeats,
          occupiedSeats,
          activeStudents,
          unassignedStudents,
          expiringSoonCount,
          monthlyTxAgg,
          pendingDuesAgg,
          studentsWithDuesCount,
        ] = await Promise.all([
          prisma.seat.count({ where: { libraryId: lib.id, isActive: true } }),
          prisma.seat.count({ where: { libraryId: lib.id, isActive: true, status: 'OCCUPIED' } }),
          prisma.student.count({ where: { libraryId: lib.id, isActive: true } }),
          prisma.student.count({
            where: {
              libraryId: lib.id,
              isActive: true,
              seatAssignments: { none: { status: 'ACTIVE' } },
            },
          }),
          prisma.membership.count({
            where: {
              libraryId: lib.id,
              status: 'ACTIVE',
              expectedEndDate: { lte: fiveDaysAhead, gte: now },
            },
          }),
          prisma.studentFeeTransaction.aggregate({
            where: {
              libraryId: lib.id,
              status: 'SUCCESS',
              paymentDate: { gte: startOfMonth },
            },
            _sum: { amount: true },
          }),
          prisma.studentFeeTransaction.aggregate({
            where: {
              libraryId: lib.id,
              remainingFee: { gt: 0 },
            },
            _sum: { remainingFee: true },
          }),
          prisma.studentFeeTransaction.count({
            where: {
              libraryId: lib.id,
              remainingFee: { gt: 0 },
            },
          }),
        ]);

        const availableSeats = Math.max(0, totalSeats - occupiedSeats);
        const occupancyPercentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
        const thisMonthFeeCollected = Number(monthlyTxAgg._sum?.amount || 0);
        const totalPendingDuesAmount = Number(pendingDuesAgg._sum?.remainingFee || 0);

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
      })
    );

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