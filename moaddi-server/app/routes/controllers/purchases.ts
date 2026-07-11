import express = require('express');
import type { Request, Response, NextFunction } from 'express';
import type { IPurchase } from '../../data/models/types';

const purchasesRepo = require('../../data/repos/purchases') as typeof import('../../data/repos/purchases');
const machinesRepo = require('../../data/repos/machines') as typeof import('../../data/repos/machines');
const authenticate = require('../middlewares/authenticate') as () => import('express').RequestHandler;
const requireRole = require('../middlewares/requireRole') as (
  roles: string[]
) => import('express').RequestHandler;
const {
  canViewOrMutatePurchase,
  canViewPurchase,
  isStaffAdminRole,
} = require('../../lib/purchaseAccess') as typeof import('../../lib/purchaseAccess');
const {
  completePayment,
  myFatoraStrategy,
  stripeStrategy,
  moyasarStrategy,
} = require('../../payment') as typeof import('../../payment');

const pathParam = (v: string | string[] | undefined): string => {
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
};

/** `getPendingRequests` parses with `parseInt(String(...))`; query strings are fine. */
const asPendingQueryNum = (q: unknown): number => q as number;

const resetIncompletePurchasesHandler = async (req: Request, res: Response): Promise<void> => {
  const u = req.authenticatedUser;
  if (!u) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }
  const customerId = pathParam(req.params.customerId);
  if (!isStaffAdminRole(u.role) && u._id !== customerId) {
    res.status(403).json({ message: 'Forbidden.' });
    return;
  }
  const results = await purchasesRepo.resetByCustomer(customerId);
  res.status(200).json(results);
};

const controller = (): import('express').Router => {
  const router = express.Router();

  router.post('/purchases', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const u = req.authenticatedUser;
      if (!u) return res.status(401).json({ message: 'Unauthorized.' });
      const customerId =
        isStaffAdminRole(u.role) && req.body && req.body.customerId
          ? req.body.customerId
          : u._id;

      const { customerId: _drop, ...rest } = req.body || {};
      const results = await purchasesRepo.create({ ...rest, customerId });
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/purchases/allpendingrequests',
    authenticate(),
    requireRole(['Admin', 'SuperAdmin', 'Vendor']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const results = await purchasesRepo.getPendingRequests(
          asPendingQueryNum(req.query.offset),
          asPendingQueryNum(req.query.limit),
          req.authenticatedUser!
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    '/purchases',
    authenticate(),
    requireRole(['Admin', 'SuperAdmin']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const results = await purchasesRepo.listAll(
          {
            status: req.query.status ? String(req.query.status) : undefined,
            paymentProvider: req.query.paymentProvider
              ? String(req.query.paymentProvider)
              : undefined,
            customerId: req.query.customerId
              ? String(req.query.customerId)
              : undefined,
            hasInvoice:
              req.query.hasInvoice === '1' || req.query.hasInvoice === 'true',
          },
          asPendingQueryNum(req.query.offset),
          asPendingQueryNum(req.query.limit)
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get('/purchases/:purchaseId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expand = req.query.expand === '1' || req.query.expand === 'true';
      const purchase = expand
        ? ((await purchasesRepo.getByIdExpanded(pathParam(req.params.purchaseId))) as IPurchase)
        : await purchasesRepo.getById(pathParam(req.params.purchaseId));
      if (!(await canViewPurchase(purchase, req.authenticatedUser!, machinesRepo))) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      return res.status(200).json(purchase);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/purchases/complete',
    authenticate(),
    requireRole(['Admin', 'Vendor', 'Customer', 'Guest']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const results = await completePayment(req.body, req.authenticatedUser);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  router.put('/purchases/:purchaseId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body == null || !Array.isArray(req.body.items)) {
        return res.status(400).json({ message: 'Body must include an `items` array.' });
      }
      const purchase = await purchasesRepo.getById(pathParam(req.params.purchaseId));
      if (!(await canViewOrMutatePurchase(purchase, req.authenticatedUser!, machinesRepo))) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      const results = await purchasesRepo.update(pathParam(req.params.purchaseId), {
        items: req.body.items,
      });
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/purchases/:purchaseId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const purchase = await purchasesRepo.getById(pathParam(req.params.purchaseId));
      if (!(await canViewOrMutatePurchase(purchase, req.authenticatedUser!, machinesRepo))) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      const results = await purchasesRepo.remove(pathParam(req.params.purchaseId));
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/purchases/customerHistory/:customerId',
    authenticate(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const u = req.authenticatedUser;
        if (!u) return res.status(401).json({ message: 'Unauthorized.' });
        const cid = pathParam(req.params.customerId);
        if (!isStaffAdminRole(u.role) && u._id !== cid) {
          return res.status(403).json({ message: 'Forbidden.' });
        }
        const results = await purchasesRepo.customerHistory(
          cid,
          asPendingQueryNum(req.query.offset || req.query.skip),
          asPendingQueryNum(req.query.limit)
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get('/purchases/invoice/:invoiceId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = (await purchasesRepo.getByInvoiceId(pathParam(req.params.invoiceId))) as IPurchase;
      if (!(await canViewOrMutatePurchase(results, req.authenticatedUser!, machinesRepo))) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/purchases/reset/:customerId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      await resetIncompletePurchasesHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  router.get('/purchases/reset/:customerId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.set('Deprecation', 'true');
      res.set('X-API-Deprecated-Use-Instead', 'DELETE /api/v1/purchases/reset/:customerId');
      await resetIncompletePurchasesHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  router.get('/purchases/invoiceData/:invoiceId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = (await myFatoraStrategy.getInvoice!(pathParam(req.params.invoiceId))) as {
        purchase: IPurchase;
        invoice: unknown;
        qrCode: Buffer;
      };
      if (!(await canViewOrMutatePurchase(results.purchase, req.authenticatedUser!, machinesRepo))) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.post('/purchases/create-payment-intent', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currency, purchaseId } = req.body as { currency?: string; purchaseId?: string };
      const results = await stripeStrategy.createPayment!({
        purchaseId,
        customerId: req.authenticatedUser!._id,
        currency,
      });
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.post('/purchases/moyasar-checkout', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currency, purchaseId } = req.body as { currency?: string; purchaseId?: string };
      const results = await moyasarStrategy.createPayment!({
        purchaseId,
        customerId: req.authenticatedUser!._id,
        currency,
      });
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.post('/purchases/stripeIsPaymentDone', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await stripeStrategy.finalizeClientNotification!(
        (req.body as { _id?: string })._id!,
        req.authenticatedUser!._id
      );
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.post('/purchases/moyasarIsPaymentDone', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await moyasarStrategy.finalizeClientNotification!(
        (req.body as { _id?: string })._id!,
        req.authenticatedUser!._id,
        (req.body as { invoiceId?: string | number }).invoiceId
      );
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  return router;
};

export = controller;
