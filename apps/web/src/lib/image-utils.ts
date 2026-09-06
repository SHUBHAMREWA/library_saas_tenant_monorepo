/**
 * Client-side Image Utilities:
 * 1. Resizing & Compressing image
 * 2. Converting to modern WebP format
 * 3. Uploading to /api/upload (Cloudinary)
 * 4. Deleting from /api/upload/delete (Cloudinary)
 */

export interface ProcessedImage {
  dataUrl: string;
  blob: Blob;
  sizeBytes: number;
  format: 'image/webp' | 'image/jpeg';
}

/**
 * Compresses an image file, resizes it within maxWidth/maxHeight,
 * and converts it to WebP format.
 */
export function compressAndConvertToWebP(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image in browser'));

      img.onload = () => {
        let { width, height } = img;

        // Maintain aspect ratio while constraining to bounds
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to create canvas 2D context'));
        }

        // Smooth rendering for high-quality downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas output to WebP
        let format: 'image/webp' | 'image/jpeg' = 'image/webp';
        let webpDataUrl = canvas.toDataURL('image/webp', quality);

        // Browser support check: if webp is not supported, canvas falls back to image/png
        if (!webpDataUrl.startsWith('data:image/webp')) {
          format = 'image/jpeg';
          webpDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Convert data URL to Blob for byte size and transfer
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                dataUrl: webpDataUrl,
                blob,
                sizeBytes: blob.size,
                format,
              });
            } else {
              // Estimate byte size from base64 string
              const sizeBytes = Math.round((webpDataUrl.length * 3) / 4);
              const fallbackBlob = new Blob([webpDataUrl], { type: format });
              resolve({
                dataUrl: webpDataUrl,
                blob: fallbackBlob,
                sizeBytes,
                format,
              });
            }
          },
          format,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a WebP compressed image to the server API which saves it to Cloudinary.
 */
export async function uploadImageToCloudinaryViaApi(
  fileDataUrl: string,
  folder: string = 'library_saas/students/photos',
  tags: string[] = ['student_media']
): Promise<{ url: string; publicId: string }> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: fileDataUrl,
      folder,
      tags,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image to Cloudinary');
  }

  const data = await res.json();
  return {
    url: data.url,
    publicId: data.publicId,
  };
}

/**
 * Deletes an image from Cloudinary via the server API.
 */
export async function deleteImageFromCloudinaryViaApi(
  urlOrPublicId?: string | null
): Promise<{ success: boolean; result?: string }> {
  if (!urlOrPublicId) return { success: true };

  try {
    const res = await fetch('/api/upload/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: urlOrPublicId }),
    });

    if (!res.ok) {
      return { success: false, result: await res.text() };
    }

    return await res.json();
  } catch (err: any) {
    console.error('Failed to request asset deletion from Cloudinary:', err);
    return { success: false, result: err.message };
  }
}
