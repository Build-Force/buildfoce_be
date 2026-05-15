import { Request, Response } from 'express';
import { User } from '../models/User';

export const activateHrPackage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params as any;
        const { tier, activeUntil } = req.body as any;

        const dt = new Date(activeUntil);
        if (Number.isNaN(dt.getTime())) {
            res.status(400).json({ success: false, message: 'activeUntil must be a valid date string.' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
        }

        if (user.role !== 'hr') {
            res.status(422).json({ success: false, message: 'Target user must be HR.' });
            return;
        }

        (user as any).packageTier = String(tier);
        (user as any).packageActiveUntil = dt;
        await user.save();

        res.json({
            success: true,
            data: {
                _id: user._id,
                role: user.role,
                packageTier: (user as any).packageTier,
                packageActiveUntil: (user as any).packageActiveUntil,
            },
        });
    } catch (error) {
        console.error('Activate HR package error:', error);
        res.status(500).json({ success: false, message: 'Failed to activate HR package.' });
    }
};

