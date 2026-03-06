import { Request, Response } from 'express';
import { env } from '../config/env';
import { Transaction } from '../models/Transaction';
import { ServicePackage } from '../models/ServicePackage';
import { UserPackage } from '../models/UserPackage';

const PAYMENT_SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

type SepayWebhookPayload = {
  id: number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string | null;
  transferType?: 'in' | 'out' | string;
  transferAmount?: number;
  accumulated?: number;
  subAccount?: string | null;
  referenceCode?: string | null;
  description?: string | null;
};

const extractSessionId = (content: string) => {
  const match = content.match(/s:([a-z0-9]+)/i);
  return match?.[1] || null;
};

export const sepayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Auth (API Key) per SePay docs: Authorization: Apikey <key>
    const authHeader = String(req.header('Authorization') || '');
    if (env.SEPAY_API_KEY) {
      const expected = `Apikey ${env.SEPAY_API_KEY}`;
      if (authHeader !== expected) {
        res.status(401).json({ success: false, message: 'Unauthorized webhook' });
        return;
      }
    }

    const payload = req.body as SepayWebhookPayload;

    if (!payload || typeof payload.id !== 'number') {
      res.status(400).json({ success: false, message: 'Invalid payload' });
      return;
    }

    if (payload.transferType !== 'in') {
      // Ignore outgoing transfers but respond success to stop retries
      res.status(200).json({ success: true, ignored: true });
      return;
    }

    if (!payload.transferAmount || payload.transferAmount <= 0) {
      res.status(200).json({ success: true, ignored: true });
      return;
    }

    if (payload.accountNumber && env.SEPAY_ACC && payload.accountNumber !== env.SEPAY_ACC) {
      res.status(200).json({ success: true, ignored: true, reason: 'account_mismatch' });
      return;
    }

    const content = String(payload.content || payload.description || '');
    const sessionId = extractSessionId(content);
    if (!sessionId) {
      res.status(200).json({ success: true, ignored: true, reason: 'no_session' });
      return;
    }

    // Idempotency: if we already processed this SePay tx id, do nothing
    const alreadyBySepayId = await Transaction.findOne({ sepayTransactionId: payload.id });
    if (alreadyBySepayId) {
      res.status(200).json({ success: true });
      return;
    }

    const tx = await Transaction.findOne({ sessionId }).sort({ createdAt: -1 });
    if (!tx) {
      res.status(200).json({ success: true, ignored: true, reason: 'unknown_session' });
      return;
    }

    if (tx.status === 'completed') {
      res.status(200).json({ success: true });
      return;
    }

    const now = new Date();
    if (now.getTime() - tx.createdAt.getTime() > PAYMENT_SESSION_TTL_MS) {
      tx.status = 'failed';
      tx.sepayTransactionId = payload.id;
      tx.gateway = payload.gateway;
      tx.referenceCode = payload.referenceCode || undefined;
      tx.content = content || undefined;
      await tx.save();

      res.status(200).json({ success: true, ignored: true, reason: 'expired' });
      return;
    }

    if (payload.transferAmount < tx.amount) {
      // Not enough money, keep pending but acknowledge webhook
      res.status(200).json({ success: true, ignored: true, reason: 'amount_insufficient' });
      return;
    }

    const pkg = tx.packageId ? await ServicePackage.findById(tx.packageId) : null;
    if (!pkg || !pkg.isActive) {
      tx.status = 'failed';
      tx.sepayTransactionId = payload.id;
      tx.gateway = payload.gateway;
      tx.referenceCode = payload.referenceCode || undefined;
      tx.content = content || undefined;
      await tx.save();

      res.status(200).json({ success: true, ignored: true, reason: 'package_missing' });
      return;
    }

    // Mark transaction completed
    tx.status = 'completed';
    tx.sepayTransactionId = payload.id;
    tx.gateway = payload.gateway;
    tx.referenceCode = payload.referenceCode || undefined;
    tx.content = content || undefined;
    await tx.save();

    // Activate package
    await UserPackage.updateMany({ userId: tx.userId, isActive: true }, { isActive: false });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.durationDays);

    const userPackage = new UserPackage({
      userId: tx.userId,
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

    res.status(201).json({ success: true });
  } catch (err: any) {
    // Return 200 to prevent SePay retry storms, but log for debugging
    console.error('SePay webhook error:', err);
    res.status(200).json({ success: true, error: 'handled' });
  }
};
