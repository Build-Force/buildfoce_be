import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';
import { error } from '../utils/apiResponse';

export const requireRole = (requiredRole: 'USER' | 'HR' | 'ADMIN') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      error(res, 'Chưa xác thực người dùng', 401);
      return;
    }

    if (req.user.role !== requiredRole) {
      error(res, 'Bạn không có quyền truy cập tài nguyên này', 403);
      return;
    }

    next();
  };
};
