import { Request, Response } from 'express';
import { ServicePackage } from '../models/ServicePackage';
import { Transaction } from '../models/Transaction';
import { UserPackage } from '../models/UserPackage';
import { AuthRequest } from '../middlewares/auth';
import { env } from '../config/env';

const PAYMENT_SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_PACKAGES = [
  {
    name: 'Miễn phí',
    slug: 'free',
    description: 'Dành cho HR mới bắt đầu, đăng tối đa 1 tin tuyển dụng',
    features: ['Đăng 1 tin tuyển dụng', 'Xem hồ sơ ứng viên cơ bản', 'Chat nội bộ'],
    price: 0,
    jobPostLimit: 1,
    durationDays: 365,
    sortOrder: 0,
    hasAiMatching: false,
    priorityLevel: 0,
    maxHrAccounts: 1,
  },
  {
    name: 'HR Pro',
    slug: 'hr-pro',
    description: 'Mở rộng đăng tin, AI matching, ưu tiên hiển thị',
    features: [
      'Đăng tối đa 10 tin tuyển dụng',
      'AI Matching gợi ý ứng viên',
      'Ưu tiên hiển thị trên bản đồ',
      'Xem hồ sơ chi tiết ứng viên',
      'Hỗ trợ qua chat ưu tiên',
    ],
    price: 299000,
    jobPostLimit: 10,
    durationDays: 30,
    sortOrder: 1,
    hasAiMatching: true,
    priorityLevel: 1,
    maxHrAccounts: 1,
  },
  {
    name: 'HR Enterprise',
    slug: 'hr-enterprise',
    description: 'Không giới hạn tin đăng, nhiều tài khoản HR, ưu tiên cao nhất',
    features: [
      'Đăng không giới hạn tin tuyển dụng',
      'AI Matching nâng cao',
      'Ưu tiên hiển thị cao nhất',
      'Nhiều tài khoản HR (tối đa 5)',
      'Báo cáo phân tích tuyển dụng',
      'Hỗ trợ 24/7 qua hotline',
    ],
    price: 799000,
    jobPostLimit: -1,
    durationDays: 30,
    sortOrder: 2,
    hasAiMatching: true,
    priorityLevel: 2,
    maxHrAccounts: 5,
  },
];

export const getPackages = async (_req: Request, res: Response): Promise<void> => {
  try {
    let packages = await ServicePackage.find({ isActive: true }).sort({ sortOrder: 1 });

    if (!packages.length) {
      await ServicePackage.insertMany(DEFAULT_PACKAGES);
      packages = await ServicePackage.find({ isActive: true }).sort({ sortOrder: 1 });
    }

    res.json({ success: true, data: packages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải gói dịch vụ', error: err.message });
  }
};

export const getMyPackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const activePackage = await UserPackage.findOne({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).populate('packageId');

    res.json({ success: true, data: activePackage || null });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải gói hiện tại', error: err.message });
  }
};

// Tạo QR SePay - giống booca createTopup
export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { packageId } = req.body;

    if (!packageId) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn gói dịch vụ' });
      return;
    }

    const pkg = await ServicePackage.findById(packageId);
    if (!pkg || !pkg.isActive) {
      res.status(404).json({ success: false, message: 'Gói dịch vụ không tồn tại hoặc đã ngừng' });
      return;
    }

    if (pkg.price <= 0) {
      res.status(400).json({ success: false, message: 'Gói miễn phí không cần thanh toán' });
      return;
    }

    // sessionId for webhook mapping
    const sid = Date.now().toString(36);
    // Keep description short and parseable from webhook payload.content
    let desc = `BF|s:${sid}|p:${pkg.slug}`;
    if (desc.length > 60) desc = `BF|s:${sid}`;
    if (desc.length > 60) desc = `BF|${sid}`;

    // Create pending transaction for webhook confirmation
    const tx = new Transaction({
      userId,
      type: 'package_purchase',
      amount: pkg.price,
      packageId: pkg._id,
      packageName: pkg.name,
      sessionId: sid,
      description: desc,
      status: 'pending',
    });
    await tx.save();

    const qrCodeUrl = `https://qr.sepay.vn/img?bank=${env.SEPAY_BANK}&acc=${env.SEPAY_ACC}&template=compact&amount=${pkg.price}&des=${encodeURIComponent(desc)}`;
    const expiresAt = new Date(tx.createdAt.getTime() + PAYMENT_SESSION_TTL_MS);

    res.json({
      success: true,
      data: {
        qrCodeUrl,
        sessionId: sid,
        amount: pkg.price,
        description: desc,
        packageId: pkg._id,
        packageName: pkg.name,
        expiresAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán', error: err.message });
  }
};

// Xác nhận thanh toán bằng mã giao dịch ngân hàng - giống booca confirmTopup
export const confirmPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { transactionCode, amount, packageId } = req.body as {
      transactionCode: string;
      amount: number;
      packageId: string;
    };

    if (!transactionCode || !amount || amount <= 0 || !packageId) {
      res.status(400).json({ success: false, message: 'transactionCode, amount và packageId là bắt buộc' });
      return;
    }

    const pkg = await ServicePackage.findById(packageId);
    if (!pkg || !pkg.isActive) {
      res.status(404).json({ success: false, message: 'Gói dịch vụ không tồn tại' });
      return;
    }

    if (amount < pkg.price) {
      res.status(400).json({ success: false, message: 'Số tiền không khớp với giá gói' });
      return;
    }

    const tx = new Transaction({
      userId,
      type: 'package_purchase',
      amount,
      packageId: pkg._id,
      packageName: pkg.name,
      transactionCode,
      sessionId: `manual_${Date.now().toString(36)}`,
      description: `Mua gói ${pkg.name}`,
      status: 'completed',
    });
    await tx.save();

    // Deactivate gói cũ
    await UserPackage.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Kích hoạt gói mới
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.durationDays);

    const userPackage = new UserPackage({
      userId,
      packageId: pkg._id,
      packageName: pkg.name,
      jobPostLimit: pkg.jobPostLimit,
      jobPostUsed: 0,
      activatedAt: new Date(),
      expiresAt,
      isActive: true,
      transactionId: tx._id,
      priorityLevel: pkg.priorityLevel,
      hasAiMatching: pkg.hasAiMatching,
      maxHrAccounts: pkg.maxHrAccounts,
    });
    await userPackage.save();

    res.json({
      success: true,
      message: `Kích hoạt gói ${pkg.name} thành công!`,
      data: {
        package: userPackage,
        expiresAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi xác nhận thanh toán', error: err.message });
  }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử thanh toán', error: err.message });
  }
};

export const getPaymentSessionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const sessionId = String((req.params as any).sessionId || '');

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'Missing sessionId' });
      return;
    }

    const tx = await Transaction.findOne({ userId, sessionId }).sort({ createdAt: -1 });
    if (!tx) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const now = new Date();
    let effectiveStatus: 'pending' | 'completed' | 'failed' = tx.status;
    if (tx.status === 'pending' && now.getTime() - tx.createdAt.getTime() > PAYMENT_SESSION_TTL_MS) {
      effectiveStatus = 'failed';
      tx.status = 'failed';
      await tx.save();
    }

    res.json({
      success: true,
      data: {
        sessionId: tx.sessionId,
        status: effectiveStatus,
        packageName: tx.packageName,
        amount: tx.amount,
        expiresAt: new Date(tx.createdAt.getTime() + PAYMENT_SESSION_TTL_MS),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get session status', error: err.message });
  }
};

export const seedDefaultPackages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const existing = await ServicePackage.countDocuments();
    if (existing > 0) {
      res.json({ success: true, message: 'Gói dịch vụ đã tồn tại', data: await ServicePackage.find() });
      return;
    }

    const created = await ServicePackage.insertMany(DEFAULT_PACKAGES);
    res.json({ success: true, message: 'Đã tạo gói dịch vụ mặc định', data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi seed gói dịch vụ', error: err.message });
  }
};
