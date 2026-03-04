import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { error } from '../utils/apiResponse';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'USER' | 'HR' | 'ADMIN';
    email?: string;
  };
}

type JwtPayload = {
  userId: string;
  role: 'USER' | 'HR' | 'ADMIN';
  email?: string;
};

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    error(res, 'Thiếu token xác thực', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (_e) {
    error(res, 'Token không hợp lệ hoặc đã hết hạn', 401);
  }
};
