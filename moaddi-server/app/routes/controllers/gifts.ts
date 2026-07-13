import express = require('express');
import type { Request, Response, NextFunction } from 'express';
import type { IPurchase } from '../../data/models/types';

const purchasesRepo = require('../../data/repos/purchases') as typeof import('../../data/repos/purchases');
interface GuestSession {
  _id: string;
  name: string;
  role: string;
  preferredCurrency: string;
  isGuest: boolean;
  token: string;
  expiresIn: number;
}
const usersRepo = require('../../data/repos/users') as {
  createGuest: (preferredCurrency?: string) => Promise<GuestSession>;
};
const authenticate = require('../middlewares/authenticate') as () => import('express').RequestHandler;
const optionalAuthenticate = require('../middlewares/optionalAuthenticate') as () => import('express').RequestHandler;
const { getCurrencyOfUser } = require('../../services/geo-currency') as {
  getCurrencyOfUser: (req: Request) => Promise<string>;
};
const { isStaffAdminRole } = require('../../lib/purchaseAccess') as typeof import('../../lib/purchaseAccess');
const config = require('../../../config') as { giftClaimBaseUrl?: string };

const pathParam = (v: string | string[] | undefined): string => {
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
};

const claimUrlFor = (claimToken: string): string | null => {
  const base = (config.giftClaimBaseUrl || '').replace(/\/+$/, '');
  return base ? `${base}/gift/${claimToken}` : null;
};

/** A gifted box can only be opened while paid and not yet fully collected. */
const isOpenable = (purchase: IPurchase): boolean =>
  purchase.status === 'PaymentDone' || purchase.status === 'Processing';

const isExpired = (purchase: IPurchase): boolean => {
  const exp = purchase.gift?.expiresAt;
  return exp != null && new Date(exp).getTime() < Date.now();
};

const controller = (): import('express').Router => {
  const router = express.Router();

  // Owner (or Admin) enables gift sharing on a paid purchase → returns claim link.
  router.post(
    '/purchases/:purchaseId/gift',
    authenticate(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const u = req.authenticatedUser;
        if (!u) return res.status(401).json({ message: 'Unauthorized.' });

        const purchaseId = pathParam(req.params.purchaseId);
        const existing = await purchasesRepo.getById(purchaseId);
        const isOwner =
          String(existing.customerId).toLowerCase() ===
          String(u._id).toLowerCase();
        if (!isOwner && !isStaffAdminRole(u.role)) {
          return res.status(403).json({ message: 'Forbidden.' });
        }

        const purchase = await purchasesRepo.enableGift(purchaseId);
        const claimToken = purchase.gift!.claimToken as string;
        return res.status(200).json({
          claimToken,
          claimUrl: claimUrlFor(claimToken),
          expiresAt: purchase.gift?.expiresAt ?? null,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // Gifts dashboard: gifts I shared (`sent`) and gifts I claimed (`received`).
  // MUST be registered before /gifts/:claimToken or "mine" is read as a token.
  router.get(
    '/gifts/mine',
    authenticate(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const u = req.authenticatedUser;
        if (!u) return res.status(401).json({ message: 'Unauthorized.' });

        const { sent, received } = await purchasesRepo.listGiftsForUser(u._id);
        // Senders get the shareable link back so they can re-share it.
        const withUrls = (sent as { claimToken?: string | null }[]).map(
          (item) => ({
            ...item,
            claimUrl: item.claimToken ? claimUrlFor(item.claimToken) : null,
          })
        );
        return res.status(200).json({ sent: withUrls, received });
      } catch (err) {
        next(err);
      }
    }
  );

  // Public preview for the recipient's claim screen.
  router.get(
    '/gifts/:claimToken',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const purchase = await purchasesRepo.getByClaimToken(
          pathParam(req.params.claimToken)
        );
        if (!purchase) {
          return res.status(404).json({ message: 'Gift link not found.' });
        }
        if (isExpired(purchase)) {
          return res.status(410).json({ message: 'This gift link has expired.' });
        }
        if (purchase.status === 'Completed') {
          return res
            .status(410)
            .json({ message: 'This gift has already been collected.' });
        }
        const preferredCurrency = await getCurrencyOfUser(req);
        const view = await purchasesRepo.giftView(purchase, preferredCurrency);
        return res.status(200).json({ openable: isOpenable(purchase), ...(view as object) });
      } catch (err) {
        next(err);
      }
    }
  );

  // Recipient claims the gift. Anonymous callers get a Guest session; a signed-in
  // caller is recorded as the opener instead. Both are added to the purchase's
  // authorized openers so the existing box-open flow works unchanged.
  router.post(
    '/gifts/:claimToken/claim',
    optionalAuthenticate(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const purchase = await purchasesRepo.getByClaimToken(
          pathParam(req.params.claimToken)
        );
        if (!purchase) {
          return res.status(404).json({ message: 'Gift link not found.' });
        }
        if (isExpired(purchase)) {
          return res.status(410).json({ message: 'This gift link has expired.' });
        }
        if (!isOpenable(purchase)) {
          return res.status(409).json({
            message:
              purchase.status === 'Completed'
                ? 'This gift has already been collected.'
                : 'This gift is not ready to be opened yet.',
          });
        }

        const preferredCurrency = await getCurrencyOfUser(req);

        // Signed-in recipient (or the buyer) reuses their own identity; otherwise
        // mint a fresh Guest session so no account is required. `session` is the
        // full guest record (same shape as POST /users/guest) so the client can
        // persist it as the current user unchanged.
        let openerId: string;
        let session: GuestSession | null = null;
        const authed = req.authenticatedUser;
        if (authed && authed._id) {
          openerId = authed._id;
        } else {
          session = await usersRepo.createGuest(preferredCurrency);
          openerId = session._id;
        }

        await purchasesRepo.recordGiftClaim(purchase._id, openerId);
        const view = await purchasesRepo.giftView(purchase, preferredCurrency);

        return res.status(200).json({
          session,
          openerId,
          purchase: view,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};

export = controller;
