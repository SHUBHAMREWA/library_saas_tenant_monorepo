import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

async function handleUpload(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, folder = 'library_saas/students', tags = ['student_media'] } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing image data' },
        { status: 400 }
      );
    }

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

async function handleDelete(req: NextRequest) {
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action?: string[] }> }
) {
  const { action = [] } = await context.params;
  const path = action.join('/');

  if (!path || path === '') {
    return handleUpload(req);
  }
  if (path === 'delete') {
    return handleDelete(req);
  }

  return NextResponse.json({ error: `Unknown upload action: ${path}` }, { status: 404 });
}