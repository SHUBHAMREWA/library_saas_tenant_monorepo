import { TenantContext } from '@library/types';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    isSuperAdmin?: boolean;
    tenant?: TenantContext;
  }
}

declare module 'express' {
  interface Request {
    userId?: string;
    isSuperAdmin?: boolean;
    tenant?: TenantContext;
  }
}

export {};
