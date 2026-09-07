import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push-service';

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: getVapidPublicKey(),
  });
}
