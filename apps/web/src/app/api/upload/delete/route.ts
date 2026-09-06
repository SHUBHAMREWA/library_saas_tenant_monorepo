import { NextRequest, NextResponse } from 'next/server';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, publicId, url } = body;

    const identifier = target || publicId || url;
    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { error: 'Missing target image URL or public_id' },
        { status: 400 }
      );
    }

    const deleteResult = await deleteFromCloudinary(identifier);

    return NextResponse.json({
      success: deleteResult.success,
      result: deleteResult.result,
    });
  } catch (error: any) {
    console.error('Cloudinary API delete route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete asset from Cloudinary' },
      { status: 500 }
    );
  }
}
