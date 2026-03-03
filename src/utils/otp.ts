import crypto from 'crypto';

export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 số
};

export const hashOTP = (otp: string): string => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

export const verifyOTP = (otp: string, hash: string): boolean => {
    return hashOTP(otp) === hash;
};
