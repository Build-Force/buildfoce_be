import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { error } from '../utils/apiResponse';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    error(res, 'Dữ liệu đầu vào không hợp lệ', 422, result.array());
    return;
  }

  next();
};
