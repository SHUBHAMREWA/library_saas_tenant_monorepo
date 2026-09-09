import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dataStore } from '../services/data-store';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-library-management-system-2026';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  isSuperAdmin?: boolean;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const adminEmailHeader = (req.headers['x-admin-email'] as string || '').toLowerCase().trim();
  const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@libraryhub.com').toLowerCase().trim();

  // 1. Check x-admin-email header for super admin verification
  if (adminEmailHeader) {
    if (configuredAdminEmail && adminEmailHeader === configuredAdminEmail) {
      req.userId = 'super-admin-root';
      req.isSuperAdmin = true;
      return next();
    }

    try {
      const { prisma } = await import('@library/database');
      const user = await prisma.user.findUnique({ where: { email: adminEmailHeader } });
      if (user && user.role === 'SUPER_ADMIN') {
        req.userId = user.id;
        req.isSuperAdmin = true;
        return next();
      }
    } catch {
      try {
        const memUser = dataStore.findUserByEmail(adminEmailHeader);
        if (memUser && memUser.role === 'SUPER_ADMIN') {
          req.userId = memUser.id;
          req.isSuperAdmin = true;
          return next();
        }
      } catch {}
    }
  }

  // 2. Check Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.userId = decoded.userId;
      req.isSuperAdmin = !!decoded.isSuperAdmin;
      return next();
    } catch {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Session token is invalid or expired. Please login again.',
        },
      });
      return;
    }
  }

  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authorization header with Bearer token or valid x-admin-email is required',
    },
  });
}
