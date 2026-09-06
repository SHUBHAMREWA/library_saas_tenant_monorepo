import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '@library/types';
import { dataStore } from '../services/data-store';

export function tenantGuard(req: Request, res: Response, next: NextFunction): void {
  const libraryId = (req.headers['x-library-id'] as string) || req.params.libraryId;

  if (!libraryId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_LIBRARY_CONTEXT',
        message: 'The X-Library-Id header or libraryId route parameter is required.',
      },
    });
    return;
  }

  if (!req.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access library resources.',
      },
    });
    return;
  }

  // Super admin can access any tenant
  if (req.isSuperAdmin) {
    req.tenant = {
      userId: req.userId,
      libraryId,
      role: 'ADMIN',
      isSuperAdmin: true,
    };
    return next();
  }

  // Verify tenant membership in dataStore
  const member = dataStore.getLibraryMember(libraryId, req.userId);
  if (!member) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_ACCESS_DENIED',
        message: 'You do not have authorization to access this library.',
      },
    });
    return;
  }

  req.tenant = {
    userId: req.userId,
    libraryId,
    role: member.role,
    isSuperAdmin: false,
  };

  next();
}
