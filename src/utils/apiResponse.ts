import { Response } from 'express';

export const success = <T>(res: Response, data: T, message = 'OK', statusCode = 200): Response => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const error = (res: Response, message = 'Error', statusCode = 400, errors: unknown = null): Response => {
  return res.status(statusCode).json({ success: false, message, errors });
};
