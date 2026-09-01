import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineAbilityFor } from './ability';
import { accessibleFilter, accessibleFilterAny, DENY_ALL } from './accessibleFilter';

/**
 * These filters are what stop a list endpoint returning other shops' rows, so
 * the shapes are asserted directly — a silently-empty filter would leak the
 * whole collection.
 */

describe('accessibleFilter', () => {
  it('is unrestricted for a Super Admin', () => {
    const ability = defineAbilityFor({ _id: 'sa1', role: 'SuperAdmin' });
    assert.deepEqual(accessibleFilter(ability, 'update', 'Shop'), {});
    assert.deepEqual(accessibleFilter(ability, 'update', 'Machine'), {});
  });

  it('narrows a Shop Admin to their own shops', () => {
    const ability = defineAbilityFor({
      _id: 'ad1',
      role: 'Admin',
      shopId: 'shop_a',
      ownedShopIds: ['shop_b'],
    });
    // Floor is read-only — update Machine is denied; list/revenue use read.
    assert.deepEqual(accessibleFilter(ability, 'update', 'Machine'), DENY_ALL);
    assert.deepEqual(accessibleFilter(ability, 'read', 'Machine'), {
      shopId: { $in: ['shop_a', 'shop_b'] },
    });
    assert.deepEqual(accessibleFilter(ability, 'update', 'Shop'), {
      _id: { $in: ['shop_a', 'shop_b'] },
    });
  });

  /**
   * The money listings. `GET /wallets` and `GET /transactions` scoped by a role
   * name and let anything that was not literally a `Vendor` fall through to an
   * unfiltered query, handing a Shop Admin every supplier balance and ledger
   * entry on the platform. Both now go through these filters.
   */
  it('narrows a Shop Admin to their own shops money', () => {
    const ability = defineAbilityFor({
      _id: 'ad1',
      role: 'Admin',
      shopId: 'shop_a',
      ownedShopIds: ['shop_b'],
    });
    assert.deepEqual(accessibleFilter(ability, 'read', 'Wallet'), {
      shopId: { $in: ['shop_a', 'shop_b'] },
    });
    assert.deepEqual(accessibleFilter(ability, 'read', 'Transaction'), {
      shopId: { $in: ['shop_a', 'shop_b'] },
    });
  });

  it('narrows a supplier to their own wallet and ledger', () => {
    const ability = defineAbilityFor({ _id: 'v1', role: 'Vendor' });
    assert.deepEqual(accessibleFilter(ability, 'read', 'Wallet'), {
      vendorId: 'v1',
    });
    assert.deepEqual(accessibleFilter(ability, 'read', 'Transaction'), {
      vendorId: 'v1',
    });
  });

  it('gives a shopless admin no money at all', () => {
    const ability = defineAbilityFor({ _id: 'ad2', role: 'Admin' });
    assert.deepEqual(accessibleFilter(ability, 'read', 'Wallet'), DENY_ALL);
    assert.deepEqual(accessibleFilter(ability, 'read', 'Transaction'), DENY_ALL);
  });

  it('narrows a Vendor to their own records', () => {
    const ability = defineAbilityFor({ _id: 'v1', role: 'Vendor' });
    assert.deepEqual(accessibleFilter(ability, 'update', 'Machine'), {
      vendorId: 'v1',
    });
    // Filling boxes is for supplier staff, not the Vendor account.
    assert.deepEqual(accessibleFilter(ability, 'update', 'Box'), DENY_ALL);
    assert.deepEqual(accessibleFilter(ability, 'read', 'Machine'), {
      vendorId: 'v1',
    });
  });

  it('narrows a supplier custom role to assigned machines/boxes', () => {
    const { setCustomRoles } = require('./ability');
    setCustomRoles([
      {
        name: 'Filler',
        rules: [{ action: 'update', subject: 'Box', scope: 'assigned-machine' }],
      },
    ]);
    const ability = defineAbilityFor({ _id: 's1', role: 'Filler' });
    assert.deepEqual(accessibleFilter(ability, 'update', 'Machine'), DENY_ALL);
    assert.deepEqual(accessibleFilter(ability, 'update', 'Box'), {
      supplierIds: 's1',
    });
    assert.deepEqual(
      accessibleFilterAny(
        accessibleFilter(ability, 'update', 'Machine'),
        accessibleFilter(ability, 'update', 'Box')
      ),
      { supplierIds: 's1' }
    );
    setCustomRoles([]);
  });

  it('unions several conditional rules', () => {
    // A supplier reads purchases they sold *and* purchases they made.
    // CASL returns rules last-declared-first, since later rules win.
    const ability = defineAbilityFor({ _id: 'v1', role: 'Vendor' });
    assert.deepEqual(accessibleFilter(ability, 'read', 'Purchase'), {
      $or: [{ customerId: 'v1' }, { vendorId: 'v1' }],
    });
  });

  it('denies everything when the role has no matching rule', () => {
    const ability = defineAbilityFor({ _id: 'c1', role: 'Customer' });
    assert.deepEqual(accessibleFilter(ability, 'update', 'Machine'), DENY_ALL);
    // An admin with no shop has no Machine rule at all.
    const orphan = defineAbilityFor({ _id: 'ad3', role: 'Admin' });
    assert.deepEqual(accessibleFilter(orphan, 'update', 'Machine'), DENY_ALL);
  });

  it('DENY_ALL really matches nothing', () => {
    assert.deepEqual(DENY_ALL, { _id: { $in: [] } });
  });
});
