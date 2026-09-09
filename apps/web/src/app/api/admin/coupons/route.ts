import { NextRequest } from 'next/server';
import { proxyAdminRequest } from '../../../../lib/admin-proxy';

export async function GET(req: NextRequest) {
  return proxyAdminRequest(req, 'coupons');
}

export async function POST(req: NextRequest) {
  return proxyAdminRequest(req, 'coupons');
}
