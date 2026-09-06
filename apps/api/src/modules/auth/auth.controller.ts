import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { RequestOtpSchema, VerifyOtpSchema, GoogleAuthSchema } from '@library/validation';
import { dataStore } from '../../services/data-store';

export class AuthController {
  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = RequestOtpSchema.parse(req.body);
      const result = authService.requestOtp(email);
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
}

export const authController = new AuthController();
