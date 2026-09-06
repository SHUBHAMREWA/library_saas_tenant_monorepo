import { Request, Response, NextFunction } from 'express';
import { storageService } from './storage.service';

export class StorageController {
  async signUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resourceType = req.body.resourceType === 'avatar' ? 'avatar' : 'kyc';
      const signatureData = storageService.generateUploadSignature(
        req.tenant!.libraryId,
        resourceType
      );
      res.status(200).json({
        success: true,
        data: signatureData,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSignedKycUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check permissions: only OWNER or ADMIN can view sensitive KYC documents
      if (req.tenant!.role !== 'OWNER' && req.tenant!.role !== 'ADMIN' && !req.isSuperAdmin) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only Library Owners and Admins are permitted to view confidential KYC identity records.',
          },
        });
        return;
      }

      const kycDocId = req.params.kycDocId;
      const result = storageService.generateSignedKycViewUrl(req.tenant!.libraryId, kycDocId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const storageController = new StorageController();
