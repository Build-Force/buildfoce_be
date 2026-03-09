declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: 'USER' | 'HR' | 'ADMIN';
        email?: string;
        [key: string]: unknown;
      };
    }
  }
}

export {};
