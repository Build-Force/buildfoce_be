import { UserPackage } from '../models/UserPackage';
import { ServicePackage } from '../models/ServicePackage';
import mongoose from 'mongoose';

export const getActiveUserPackage = async (userId: mongoose.Types.ObjectId | string) => {
  const now = new Date();
  const existing = await UserPackage.findOne({
    userId,
    isActive: true,
    expiresAt: { $gt: now },
  });

  if (existing) return existing;

  // Khi không còn gói active (đã hết hạn): đánh dấu các gói hết hạn là inactive rồi quay về gói Free
  await UserPackage.updateMany(
    { userId, isActive: true, expiresAt: { $lte: now } },
    { isActive: false }
  );

  // Fallback: đảm bảo user luôn có gói Free (1 tin)
  const freePkg = await ServicePackage.findOne({ slug: 'free', isActive: true });
  if (!freePkg) return null;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + freePkg.durationDays);

  const created = new UserPackage({
    userId,
    packageId: freePkg._id,
    packageName: freePkg.name,
    jobPostLimit: freePkg.jobPostLimit,
    jobPostUsed: 0,
    activatedAt: new Date(),
    expiresAt,
    isActive: true,
    priorityLevel: freePkg.priorityLevel,
    hasAiMatching: freePkg.hasAiMatching,
    maxHrAccounts: freePkg.maxHrAccounts,
  });

  await created.save();
  return created;
};

export const canPostNewJob = (userPackage: { jobPostLimit: number; jobPostUsed: number }) => {
  if (userPackage.jobPostLimit === -1) return true;
  return userPackage.jobPostUsed < userPackage.jobPostLimit;
};

export const incrementJobUsage = async (userPackageId: mongoose.Types.ObjectId | string) => {
  await UserPackage.findByIdAndUpdate(userPackageId, {
    $inc: { jobPostUsed: 1 },
  });
};

