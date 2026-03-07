import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (validations: any[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Run all validations
        for (let validation of validations) {
            const result = await validation.run(req);
            if (result.errors.length) break;
        }

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    };
};
