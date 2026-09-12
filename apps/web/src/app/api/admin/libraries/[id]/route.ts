import { NextRequest } from 'next/server';
import { proxyAdminRequest } from '@/lib/admin-proxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyAdminRequest(req, `libraries/${id}`);
}
