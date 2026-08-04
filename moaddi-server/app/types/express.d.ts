import 'express';
import type { AppAbility } from '../lib/ability';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: {
        _id: string;
        role: string;
      };
      /** CASL ability for the authenticated user; set by `authorize()`. */
      ability?: AppAbility;
    }
  }
}
