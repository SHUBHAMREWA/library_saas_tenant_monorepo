import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary server client
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dkc2fkpkp',
  api_key: process.env.CLOUDINARY_API_KEY || '738449759794842',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'L1ZCosHVz3dLyRPHIsRAnph0A0w',
  secure: true,
});

/**
 * Extracts the Cloudinary public_id from a full Cloudinary URL or returns the input if already a public_id.
 * Example URL:
 * https://res.cloudinary.com/dkc2fkpkp/image/upload/v1725634567/library_saas/students/photos/abc123.webp
 * -> "library_saas/students/photos/abc123"
 */
export function extractCloudinaryPublicId(urlOrPublicId?: string | null): string | null {
  if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return null;

  // If it's already a public_id (no http/https)
  if (!urlOrPublicId.startsWith('http://') && !urlOrPublicId.startsWith('https://')) {
    // Strip file extension if present (e.g. .webp, .jpg)
    return urlOrPublicId.replace(/\.[a-zA-Z0-9]+$/, '');
  }

  // If it's a Cloudinary URL
  if (urlOrPublicId.includes('res.cloudinary.com')) {
    const match = urlOrPublicId.match(/\/upload\/(?:v\d+\/)?([^?#]+)/);
    if (match && match[1]) {
      // Remove file extension
      return match[1].replace(/\.[a-zA-Z0-9]+$/, '');
    }
  }

  return null;
}

/**
 * Upload an image (base64 data URI or remote URL) to Cloudinary.
 * Enforces WebP format and optimizes quality.
 */
export async function uploadToCloudinary(
  fileData: string,
  folder: string = 'library_saas/students',
  tags: string[] = ['student_media']
): Promise<{ url: string; publicId: string; format: string; bytes: number }> {
  const result = await cloudinary.uploader.upload(fileData, {
    folder,
    format: 'webp',
    resource_type: 'image',
    transformation: [
      { quality: 'auto:good' },
    ],
    tags,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
  };
}

/**
 * Permanently delete an image asset from Cloudinary using either its public_id or full URL.
 */
export async function deleteFromCloudinary(urlOrPublicId?: string | null): Promise<{ success: boolean; result?: string }> {
  const publicId = extractCloudinaryPublicId(urlOrPublicId);
  if (!publicId) {
    return { success: false, result: 'invalid_or_non_cloudinary_identifier' };
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return {
      success: res.result === 'ok' || res.result === 'not found',
      result: res.result,
    };
  } catch (error: any) {
    console.error('Error deleting asset from Cloudinary:', publicId, error);
    return { success: false, result: error.message };
  }
}

export { cloudinary };
