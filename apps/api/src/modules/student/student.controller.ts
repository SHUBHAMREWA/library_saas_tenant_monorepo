import { Request, Response, NextFunction } from 'express';
import { studentService } from './student.service';
import { CreateStudentSchema, UpdateStudentSchema } from '@library/validation';

export class StudentController {
  async createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateStudentSchema.parse(req.body);
      const student = studentService.createStudent(
        req.tenant!.libraryId,
        req.tenant!.userId,
        input
      );
      res.status(201).json({
        success: true,
        data: student,
      });
    } catch (err) {
      next(err);
    }
  }

  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, isActive } = req.query;
      const students = studentService.listStudents(req.tenant!.libraryId, {
        search: search as string | undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });
      res.status(200).json({
        success: true,
        data: students,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = studentService.getStudentById(
        req.tenant!.libraryId,
        req.params.studentId
      );
      res.status(200).json({
        success: true,
        data: student,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = UpdateStudentSchema.parse(req.body);
      const student = studentService.updateStudent(
        req.tenant!.libraryId,
        req.tenant!.userId,
        req.params.studentId,
        input
      );
      res.status(200).json({
        success: true,
        data: student,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      studentService.deleteStudent(
        req.tenant!.libraryId,
        req.tenant!.userId,
        req.params.studentId
      );
      res.status(200).json({
        success: true,
        data: { message: 'Student archived and active seats released successfully' },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const studentController = new StudentController();
