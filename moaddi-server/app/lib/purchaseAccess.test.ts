import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { staffScopeCoversPurchase } from './purchaseAccess';
import type { IPurchase } from '../data/models/types';

/**
 * Orders are the one subject where "is this user an admin" used to be the whole
 * answer, which handed every Shop Admin the platform's entire ledger. These
 * assertions pin the replacement: an order is reachable only through the shop
 * it happened in.
 */

const superAdmin = { _id: 'sa1', role: 'SuperAdmin' };
const admin = { _id: 'ad1', role: 'Admin', shopId: 'shop_a', ownedShopIds: ['shop_b'] };
const shoplessAdmin = { _id: 'ad2', role: 'Admin' };

const order = (fields: Partial<IPurchase>): IPurchase =>
  ({ _id: 'p1', customerId: 'cust1', ...fields }) as IPurchase;

describe('staffScopeCoversPurchase', () => {
  it('lets a Super Admin reach any order', () => {
    assert.equal(staffScopeCoversPurchase(order({ shopId: 'shop_z' }), superAdmin), true);
    assert.equal(staffScopeCoversPurchase(order({ shopId: null }), superAdmin), true);
  });

  it('limits a Shop Admin to orders placed in their own shops', () => {
    assert.equal(staffScopeCoversPurchase(order({ shopId: 'shop_a' }), admin), true);
    assert.equal(staffScopeCoversPurchase(order({ shopId: 'shop_b' }), admin), true);
    assert.equal(staffScopeCoversPurchase(order({ shopId: 'shop_z' }), admin), false);
  });

  it('withholds orders that were never stamped with a shop', () => {
    // Pre-backfill rows: an unset field matches no `$in`, so they stay Super
    // Admin only rather than falling open to every admin.
    assert.equal(staffScopeCoversPurchase(order({ shopId: null }), admin), false);
    assert.equal(staffScopeCoversPurchase(order({}), admin), false);
  });

  it('gives a shopless admin nothing', () => {
    assert.equal(staffScopeCoversPurchase(order({ shopId: 'shop_a' }), shoplessAdmin), false);
  });

  it('checks the requested action, not just readability', () => {
    assert.equal(staffScopeCoversPurchase(order({ shopId: 'shop_a' }), admin, 'update'), true);
    assert.equal(staffScopeCoversPurchase(order({ shopId: 'shop_z' }), admin, 'delete'), false);
  });
});
