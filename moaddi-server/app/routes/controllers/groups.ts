import express = require('express');
import type { Request, Response, NextFunction } from 'express';

const groups = require('../../data/repos/groups') as typeof import('../../data/repos/groups');
const authenticate = require('../middlewares/authenticate') as () => import('express').RequestHandler;
const authorize = require('../middlewares/authorize') as (
  action: string,
  subjectType: string
) => import('express').RequestHandler;
import { getCurrencyOfUser } from '../../services/geo-currency';

const pathParam = (v: string | string[] | undefined): string => {
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
};

const controller = (): import('express').Router => {
  const router = express.Router();

  router.post('/groups', authenticate(), authorize('create', 'Group'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await groups.create(req.body as Record<string, unknown>);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.get('/groups', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await groups.get(
        (req.query.offset as string) ?? '0',
        (req.query.limit as string) ?? '1000'
      );
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.get('/groups/:groupId', authenticate(), authorize('read', 'Group'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preferredCurrency = await getCurrencyOfUser(req);
      const results = await groups.getById(pathParam(req.params.groupId), preferredCurrency);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.put('/groups/:groupId', authenticate(), authorize('update', 'Group'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await groups.update(pathParam(req.params.groupId), req.body as Record<string, unknown>);
      return res.status(200).json(results);
    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  router.delete('/groups/:groupId', authenticate(), authorize('delete', 'Group'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await groups.remove(pathParam(req.params.groupId));
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  return router;
};

export = controller;
