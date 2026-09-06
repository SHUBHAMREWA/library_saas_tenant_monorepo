import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, folder = 'library_saas/students', tags = ['student_media'] } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing image data' },
        { status: 400 }
      );
    }

    // Ensure it's a valid data URI or image URL
    if (!image.startsWith('data:image/') && !image.startsWith('http://') && !image.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Image must be a valid base64 data URI or HTTP URL' },
        { status: 400 }
      );
    }

    const uploadResult = await uploadToCloudinary(image, folder, tags);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  } catch (error: any) {
    console.error('Cloudinary API upload route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image to Cloudinary' },
      { status: 500 }
    );
  }
}
