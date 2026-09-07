import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export async function ensureDefaultSubscriptionPlans(client: PrismaClient) {
  try {
    const defaultPlans = [
      {
        code: 'BASIC',
        name: 'Basic Plan',
        durationMonths: 1,
        priceMonthly: 799,
        priceYearly: 999, // Original price for strikethrough
        badge: 'Starter (1 Month)',
        description: 'Complete library management with 1 month full access',
      },
      {
        code: 'ADVANCE',
        name: 'Advance Plan',
        durationMonths: 3,
        priceMonthly: 1999,
        priceYearly: 2499, // Original price for strikethrough
        badge: 'Popular (3 Months)',
        description: 'Quarterly access with automated fees & dues management',
      },
      {
        code: 'PRO',
        name: 'Pro Plan',
        durationMonths: 12,
        priceMonthly: 6999,
        priceYearly: 9999, // Original price for strikethrough
        badge: 'Best Value (1 Year)',
        description: 'Annual full access with priority support and unlimited features',
      },
    ];

    for (const p of defaultPlans) {
      const existingPlan = await client.subscriptionPlan.findUnique({
        where: { code: p.code },
      });

      const features = {
        durationMonths: p.durationMonths,
        originalPrice: p.priceYearly,
        badge: p.badge,
        description: p.description,
        allFeatures: true,
        studentManagement: true,
        feeCollection: true,
        receiptGeneration: true,
        whatsappAlerts: true,
        unlimitedSeats: true,
        unlimitedRooms: true,
      };

      if (!existingPlan) {
        await client.subscriptionPlan.create({
          data: {
            id: crypto.randomUUID(),
            code: p.code,
            name: p.name,
            priceMonthly: p.priceMonthly,
            priceYearly: p.priceYearly,
            maxSeats: 10000,
            maxLibraries: 10,
            features,
            isActive: true,
          },
        });
      } else {
        // Ensure features have durationMonths and badge
        const currentFeatures = (existingPlan.features || {}) as Record<string, any>;
        if (!currentFeatures.durationMonths || existingPlan.name !== p.name) {
          await client.subscriptionPlan.update({
            where: { id: existingPlan.id },
            data: {
              name: p.name,
              priceMonthly: p.priceMonthly,
              priceYearly: p.priceYearly,
              features: {
                ...currentFeatures,
                durationMonths: p.durationMonths,
                originalPrice: p.priceYearly,
                badge: p.badge,
                description: p.description,
                allFeatures: true,
              },
            },
          });
        }
      }
    }

    // Deactivate legacy ENTERPRISE plan if it exists
    const legacyEnterprise = await client.subscriptionPlan.findUnique({
      where: { code: 'ENTERPRISE' },
    });
    if (legacyEnterprise && legacyEnterprise.isActive) {
      await client.subscriptionPlan.update({
        where: { id: legacyEnterprise.id },
        data: { isActive: false },
      });
    }

    return await client.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  } catch (err) {
    console.error('Failed to ensure default subscription plans:', err);
    return [];
  }
}
