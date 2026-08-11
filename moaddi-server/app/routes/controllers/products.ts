import express = require('express');
import type { Request, Response, NextFunction } from 'express';

const products = require('../../data/repos/products') as typeof import('../../data/repos/products');
const authenticate = require('../middlewares/authenticate') as () => import('express').RequestHandler;
const upload = require('../middlewares/fileHandler') as { files: () => import('multer').Multer };
const optionalAuthenticate = require('../middlewares/optionalAuthenticate') as () => import('express').RequestHandler;
const authorize = require('../middlewares/authorize') as (
  action: string,
  subjectType: string
) => import('express').RequestHandler;
import { defineAbilityFor, subject } from '../../lib/ability';
import { accessibleFilter } from '../../lib/accessibleFilter';
import { getCurrencyOfUser } from '../../services/geo-currency';
import { listSupportedCurrencies } from '../../services/currency';

const parseJSON = (s: unknown): Record<string, unknown> => {
  if (typeof s !== 'string') return {};
  try { return JSON.parse(s); } catch { return {}; }
};

const pathParam = (v: string | string[] | undefined): string => {
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
};

const parseBool = (v: unknown): boolean => v === true || v === 'true' || v === '1';

const isAuthenticated = (req: Request): boolean => {
  const r = req as Request & { authenticatedUser?: unknown; user?: unknown };
  return Boolean(r.user ?? r.authenticatedUser);
};

/** 403 unless the caller may `action` this product (vendors: own products only). */
const assertCanTouchProduct = async (
  req: Request,
  res: Response,
  action: string,
  productId: string
): Promise<boolean> => {
  const vendorId = await products.getVendorIdOf(productId);
  if (req.ability!.cannot(action, subject('Product', { vendorId }))) {
    res.status(403).json({ message: 'Forbidden.' });
    return false;
  }
  return true;
};

const controller = (): import('express').Router => {
  const router = express.Router();

  router.get('/currencies', authenticate(), (_req: Request, res: Response) => {
    return res.status(200).json({ data: listSupportedCurrencies() });
  });

  // create new product
  router.post('/products', authenticate(), authorize('create', 'Product'), upload.files().single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = parseJSON((req.body as { data?: string }).data);
      // Suppliers may only create products they own; admins may set any vendor.
      const claimedVendorId = (data.vendorId as string | undefined) ?? null;
      if (req.ability!.cannot('update', subject('Product', { vendorId: claimedVendorId }))) {
        data.vendorId = req.authenticatedUser!._id;
      }
      const saved = await products.create(data, req.file as { path: string });
      const results = products.formatSavedProductForClient(saved, true);
      return res.status(201).json(results);
    } catch (err) { next(err); }
  });

  router.get('/products', optionalAuthenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const native = parseBool(req.query.native);
      if (native && !isAuthenticated(req)) {
        return res.status(401).json({ message: 'Authentication required for native=true product listing.' });
      }
      const filter = parseJSON((req.query.filter as string) ?? '{}');
      // `native=true` is the authenticated staff listing (the public storefront
      // uses the shared-currency shape), so scope it to what the caller may
      // manage: own products for a supplier, in-shop products for a shop admin.
      // This route runs under optionalAuthenticate, which does not build an
      // ability, so derive one here.
      const scope = native
        ? accessibleFilter(
            defineAbilityFor(req.authenticatedUser!),
            'update',
            'Product'
          )
        : {};
      const preferredCurrency = await getCurrencyOfUser(req);
      const results = await products.get(
        (req.query.offset as string) ?? '0',
        (req.query.limit as string) ?? '1000',
        { ...filter, ...scope },
        preferredCurrency,
        native ? { native: true, includeUsd: true } : undefined
      );
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  router.get('/products-active', optionalAuthenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = parseJSON((req.query.filter as string) ?? '{}');
      const preferredCurrency = await getCurrencyOfUser(req);
      const results = await products.getActive(
        (req.query.offset as string) ?? '0',
        (req.query.limit as string) ?? '1000',
        filter,
        preferredCurrency
      );
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  router.get('/products/:productId', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const native = parseBool(req.query.native);
      const preferredCurrency = await getCurrencyOfUser(req);
      const results = await products.getById(pathParam(req.params.productId), preferredCurrency, native ? { native: true, includeUsd: true } : undefined);
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  router.get('/product/machine/:machineId', optionalAuthenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preferredCurrency = await getCurrencyOfUser(req);
      const results = await products.getByMachineId(pathParam(req.params.machineId), preferredCurrency);
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  router.get('/product/vendor/:vendorId', optionalAuthenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preferredCurrency = await getCurrencyOfUser(req);
      const results = await products.getByVendorId(pathParam(req.params.vendorId), preferredCurrency);
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  router.put('/products/:productId/toggle', authenticate(), authorize('update', 'Product'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await assertCanTouchProduct(req, res, 'update', pathParam(req.params.productId)))) return;
      const saved = await products.toggle(pathParam(req.params.productId));
      const results = products.formatSavedProductForClient(saved, true);
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  router.put('/products/:productId', authenticate(), authorize('update', 'Product'), upload.files().single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await assertCanTouchProduct(req, res, 'update', pathParam(req.params.productId)))) return;
      const data = parseJSON((req.body as { data?: string }).data);
      const saved = await products.update(pathParam(req.params.productId), data, req.file as { path: string } | undefined);
      const results = products.formatSavedProductForClient(saved, true);
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  router.delete('/products/:productId', authenticate(), authorize('delete', 'Product'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await assertCanTouchProduct(req, res, 'delete', pathParam(req.params.productId)))) return;
      const saved = await products.remove(pathParam(req.params.productId));
      const results = products.formatSavedProductForClient(saved, true);
      return res.status(200).json(results);
    } catch (err) { next(err); }
  });

  return router;
};

export = controller;
