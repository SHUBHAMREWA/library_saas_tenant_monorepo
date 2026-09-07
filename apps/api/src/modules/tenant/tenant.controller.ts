import { Request, Response, NextFunction } from 'express';
import { tenantService } from './tenant.service';
import { CreateLibrarySchema, UpdateLibrarySchema } from '@library/validation';

export class TenantController {
  async createLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateLibrarySchema.parse(req.body);
      const library = tenantService.createLibrary(req.userId!, input);
      res.status(201).json({
        success: true,
        data: library,
      });
    } catch (err) {
      next(err);
    }
  }

  async listLibraries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const libraries = tenantService.listUserLibraries(req.userId!);
      res.status(200).json({
        success: true,
        data: libraries,
      });
    } catch (err) {
      next(err);
    }
  }

  async getLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const libraryId = req.params.libraryId;
      const library = tenantService.getLibraryDetails(libraryId, req.userId!);
      res.status(200).json({
        success: true,
        data: library,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const libraryId = req.params.libraryId;
      const input = UpdateLibrarySchema.parse(req.body);
      const library = tenantService.updateLibrary(libraryId, req.userId!, input);
      res.status(200).json({
        success: true,
        data: library,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = tenantService.getDashboardSummary(req.tenant!.libraryId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
}

export const tenantController = new TenantController();
