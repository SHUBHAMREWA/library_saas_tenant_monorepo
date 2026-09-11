import { prisma } from './index';
import crypto from 'crypto';

export interface BootstrapAdminOptions {
  email?: string;
  fullName?: string;
  phone?: string;
}

export async function bootstrapSuperAdmin(options?: BootstrapAdminOptions): Promise<any> {
  const adminEmails = Array.from(new Set([
    'shubhamrewamp17@gmail.com',
    'kushwahashubham5932@gmail.com',
    ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map((e: string) => e.trim().toLowerCase()) : []),
    ...(options?.email ? [options.email.trim().toLowerCase()] : []),
  ].filter(Boolean)));

  let lastResult: any = null;

  for (const email of adminEmails) {
    const fullName = email === 'shubhamrewamp17@gmail.com' ? 'Shubham Rewa' : (options?.fullName || process.env.ADMIN_NAME || 'Platform Super Admin');
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
          lastResult = updated;
        } else {
          console.log(`[Admin Bootstrap] Verified existing SUPER_ADMIN: ${existing.email}`);
          lastResult = existing;
        }
      } else {
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
        lastResult = created;
      }
    } catch (error: any) {
      console.warn(`[Admin Bootstrap] Note: Could not bootstrap admin ${email} in DB (${error?.message || error}).`);
    }
  }

  return lastResult;
}

