import { Request, Response } from 'express';
import { ADMIN_PAYMENTS_MOCK } from '../../constants';
import { error, success } from '../../utils/apiResponse';

export const getPayments = async (_req: Request, res: Response): Promise<void> => {
  try {
    success(res, {
      data: ADMIN_PAYMENTS_MOCK,
      total: ADMIN_PAYMENTS_MOCK.length,
      page: 1,
      limit: ADMIN_PAYMENTS_MOCK.length,
    });
  } catch (e) {
    error(res, 'Không thể tải danh sách thanh toán', 500, e);
  }
};
