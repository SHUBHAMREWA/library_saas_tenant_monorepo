import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { RequestOtpSchema, VerifyOtpSchema, GoogleAuthSchema } from '@library/validation';
import { dataStore } from '../../services/data-store';

export class AuthController {
  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = RequestOtpSchema.parse(req.body);
      const result = await authService.requestOtp(email, req.body.fullName);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = VerifyOtpSchema.parse(req.body);
      const result = authService.verifyOtp(email, otp);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = GoogleAuthSchema.parse(req.body);
      const result = authService.verifyGoogleToken(idToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
      if (!refreshToken || typeof refreshToken !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'REFRESH_TOKEN_REQUIRED', message: 'Refresh token must be provided' },
        });
        return;
      }
      const result = authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User is not authenticated' },
        });
        return;
      }
      const user = dataStore.findUserById(req.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
        return;
      }
      const accessibleLibraries = dataStore.listUserLibraries(req.userId);
      res.status(200).json({
        success: true,
        data: {
          user: authService.toProfile(user),
          libraries: accessibleLibraries,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async syncUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, fullName, phone, avatar } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }
      const cleanEmail = email.toLowerCase().trim();
      const cleanName = fullName?.trim() || cleanEmail.split('@')[0] || 'User';
      const KNOWN_SUPER_ADMINS = new Set([
        'shubhamrewamp17@gmail.com',
        'kushwahashubham5932@gmail.com',
        ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map((e: string) => e.trim().toLowerCase()) : [])
      ]);

      // 1. Check & persist in Neon PostgreSQL DB
      let dbUser: any = null;
      try {
        const { prisma } = await import('@library/database');
        const existing = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        const isSuperAdmin =
          existing?.role === 'SUPER_ADMIN' ||
          KNOWN_SUPER_ADMINS.has(cleanEmail);

        const finalRole = isSuperAdmin ? 'SUPER_ADMIN' : (existing?.role || 'USER');

        dbUser = await prisma.user.upsert({
          where: { email: cleanEmail },
          update: {
            fullName: cleanName,
            phone: phone || undefined,
            avatarUrl: avatar || undefined,
            role: finalRole,
          },
          create: {
            id: (await import('crypto')).randomUUID(),
            email: cleanEmail,
            fullName: cleanName,
            phone: phone || null,
            avatarUrl: avatar || null,
            role: finalRole,
          },
        });
      } catch (dbErr) {
        console.warn('[AuthController] DB sync fallback to memory store:', dbErr);
      }

      // 2. Also ensure in-memory store has it
      let memUser = dataStore.findUserByEmail(cleanEmail);
      const isSuperAdmin =
        dbUser?.role === 'SUPER_ADMIN' ||
        KNOWN_SUPER_ADMINS.has(cleanEmail) ||
        memUser?.role === 'SUPER_ADMIN';

      const finalRole = isSuperAdmin ? 'SUPER_ADMIN' : (dbUser?.role || memUser?.role || 'USER');

      if (!memUser) {
        memUser = dataStore.createUser({
          email: cleanEmail,
          fullName: cleanName,
          phone,
          avatarUrl: avatar,
          role: finalRole as any,
        });
      } else {
        memUser.role = finalRole as any;
      }

      res.status(200).json({
        success: true,
        user: {
          id: dbUser?.id || memUser.id,
          email: cleanEmail,
          fullName: dbUser?.fullName || memUser.fullName,
          phone: dbUser?.phone || memUser.phone || '',
          role: finalRole,
          avatar: dbUser?.avatarUrl || memUser.avatarUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
