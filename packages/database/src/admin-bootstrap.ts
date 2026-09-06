import { prisma } from './index';
import crypto from 'crypto';

export interface BootstrapAdminOptions {
  email?: string;
  fullName?: string;
  phone?: string;
}

export async function bootstrapSuperAdmin(options?: BootstrapAdminOptions): Promise<any> {
  const email = (options?.email || process.env.ADMIN_EMAIL || 'admin@libraryhub.com').trim().toLowerCase();
  const fullName = options?.fullName || process.env.ADMIN_NAME || 'Platform Super Admin';
  const phone = options?.phone || process.env.ADMIN_PHONE || '+919876543210';

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.role !== 'SUPER_ADMIN') {
        const updated = await prisma.user.update({
          where: { email },
          data: {
            role: 'SUPER_ADMIN',
            isActive: true,
          },
        });
        console.log(`[Admin Bootstrap] Elevated existing user to SUPER_ADMIN: ${updated.email}`);
        return updated;
      }
      console.log(`[Admin Bootstrap] Verified existing SUPER_ADMIN: ${existing.email}`);
      return existing;
    }

    const created = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        fullName,
        phone,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    console.log(`[Admin Bootstrap] Successfully created new SUPER_ADMIN: ${created.email} (${created.id})`);
    return created;
  } catch (error: any) {
    console.warn(`[Admin Bootstrap] Note: Could not bootstrap admin in DB (${error?.message || error}). Will retry on DB access.`);
    return null;
  }
}

