import { NextRequest, NextResponse } from 'next/server';
import { proxyAdminRequest } from '@/lib/admin-proxy';

export const dynamic = 'force-dynamic';

function getSubpath(slug?: string[]): string {
  if (!slug || slug.length === 0) return '';
  return slug.join('/');
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  return proxyAdminRequest(req, getSubpath(slug));
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  return proxyAdminRequest(req, getSubpath(slug));
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  return proxyAdminRequest(req, getSubpath(slug));
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  return proxyAdminRequest(req, getSubpath(slug));
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params;
  return proxyAdminRequest(req, getSubpath(slug));
}