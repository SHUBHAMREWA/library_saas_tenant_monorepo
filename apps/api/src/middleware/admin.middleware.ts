import { Request, Response, NextFunction } from 'express';

export function superAdminGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  if (!req.isSuperAdmin) {
    res.status(403).json({
      success: false,
      error: {
        code: 'SUPER_ADMIN_ACCESS_REQUIRED',
        message: 'Platform Super Admin privileges are required to access this resource.',
      },
    });
    return;
  }

  next();
}
