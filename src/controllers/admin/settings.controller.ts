import { Request, Response } from 'express';
import { SystemSettings } from '../../models';
import { error, success } from '../../utils/apiResponse';

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await SystemSettings.findOne().lean();
    success(
      res,
      settings || {
        maintenanceMode: false,
        emailAlertEnabled: true,
        adminSessionHours: 8,
      },
    );
  } catch (e) {
    error(res, 'Không thể tải cài đặt hệ thống', 500, e);
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as {
      maintenanceMode?: boolean;
      emailAlertEnabled?: boolean;
      adminSessionHours?: number;
    };

    if (payload.adminSessionHours !== undefined && payload.adminSessionHours <= 0) {
      error(res, 'adminSessionHours phải lớn hơn 0', 400);
      return;
    }

    const settings = await SystemSettings.findOneAndUpdate({}, payload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();

    console.log('[ADMIN ACTION] updateSettings');
    success(res, settings, 'Cập nhật cài đặt hệ thống thành công');
  } catch (e) {
    error(res, 'Không thể cập nhật cài đặt hệ thống', 500, e);
  }
};
