import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { RoleType, hasPermission, Permission } from '../constants/roles';
import { error } from '../utils/apiResponse';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'USER' | 'HR' | 'ADMIN';
    email?: string;
    [key: string]: unknown;
  };
}

type JwtPayload = {
  userId?: string;
  _id?: string;
  role?: string;
  email?: string;
  [key: string]: unknown;
};

const normalizeRole = (role?: string): 'USER' | 'HR' | 'ADMIN' | null => {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === 'USER' || upper === 'HR' || upper === 'ADMIN') return upper;
  return null;
};

const toRoleType = (role: 'USER' | 'HR' | 'ADMIN'): RoleType => role.toLowerCase() as RoleType;

const parseToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization || req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
};

const attachUserFromToken = (req: AuthRequest, decoded: JwtPayload): boolean => {
  const userId = typeof decoded.userId === 'string' ? decoded.userId : typeof decoded._id === 'string' ? decoded._id : null;
  const role = normalizeRole(typeof decoded.role === 'string' ? decoded.role : undefined);

  if (!userId || !role) return false;

  req.user = {
    ...decoded,
    userId,
    role,
    email: typeof decoded.email === 'string' ? decoded.email : undefined,
  };

  return true;
};

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = parseToken(req);

  if (!token) {
    error(res, 'Thiếu token xác thực', 401);
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    if (!attachUserFromToken(req, decoded)) {
      error(res, 'Token không hợp lệ', 401);
      return;
    }

    next();
  } catch {
    error(res, 'Token không hợp lệ hoặc đã hết hạn', 401);
  }
};

export const authMiddleware = verifyToken;
export const authenticateToken = verifyToken;

export const optionalAuthMiddleware = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const token = parseToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    attachUserFromToken(req, decoded);
  } catch {
    // ignore invalid token for optional auth
  }

  next();
};

export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      error(res, 'Chưa xác thực người dùng', 401);
      return;
    }

    const roleType = toRoleType(req.user.role);
    if (!hasPermission(roleType, permission)) {
      error(res, `Bạn không có quyền '${permission}'`, 403);
      return;
    }

    next();
  };
};
