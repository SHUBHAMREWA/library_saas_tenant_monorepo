import { createHash, createHmac, randomUUID } from 'crypto';

const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test_api_key_12345';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test_api_secret_67890';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'demo';

export interface UploadSignatureResult {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  accessMode: 'authenticated' | 'public';
}

export class StorageService {
  generateUploadSignature(
    libraryId: string,
    resourceType: 'kyc' | 'avatar'
  ): UploadSignatureResult {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `library_saas/${libraryId}/${resourceType}`;
    const publicId = `${resourceType}_${randomUUID()}`;
    const accessMode = resourceType === 'kyc' ? 'authenticated' : 'public';

    // Signature payload string sorted alphabetically per Cloudinary requirements
    const paramsToSign = `access_mode=${accessMode}&folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = createHash('sha256')
      .update(paramsToSign + CLOUDINARY_API_SECRET)
      .digest('hex');

    return {
      timestamp,
      signature,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
      folder,
      publicId,
      accessMode,
    };
  }

  generateSignedKycViewUrl(libraryId: string, kycDocId: string): { url: string; expiresInSeconds: number } {
    const expiresAt = Math.round(Date.now() / 1000) + 60; // 60 seconds TTL

    // Generate HMAC signature for authenticated delivery
    const toSign = `${kycDocId}:${expiresAt}:${libraryId}`;
    const token = createHmac('sha256', CLOUDINARY_API_SECRET)
      .update(toSign)
      .digest('hex');

    const signedUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/authenticated/s--${token.slice(0, 8)}--/v1/library_saas/${libraryId}/kyc/${kycDocId}?exp=${expiresAt}`;

    return {
      url: signedUrl,
      expiresInSeconds: 60,
    };
  }
}

export const storageService = new StorageService();
