import { Request, Response } from 'express';
import { error, success } from '../../utils/apiResponse';

/**
 * Trả về dữ liệu thanh toán thật từ DB.
 * Hiện chưa có model Payment – trả về mảng rỗng; khi có collection payments sẽ query ở đây.
 */
export const getPayments = async (_req: Request, res: Response): Promise<void> => {
  try {
    success(res, {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  } catch (e) {
    error(res, 'Không thể tải danh sách thanh toán', 500, e);
  }
};
