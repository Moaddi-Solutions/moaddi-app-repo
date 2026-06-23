import 'express';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: {
        _id: string;
        role: string;
      };
    }
  }
}
