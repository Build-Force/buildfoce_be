import { Schema, model, models } from 'mongoose';

export interface ISystemSettings {
  maintenanceMode: boolean;
  emailAlertEnabled: boolean;
  adminSessionHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    maintenanceMode: { type: Boolean, default: false },
    emailAlertEnabled: { type: Boolean, default: true },
    adminSessionHours: { type: Number, default: 8 },
  },
  { timestamps: true },
);

export const SystemSettings = models.SystemSettings || model<ISystemSettings>('SystemSettings', systemSettingsSchema);
