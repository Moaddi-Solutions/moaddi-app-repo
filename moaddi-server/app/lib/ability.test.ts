import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMongoAbility } from '@casl/ability';
import {
  defineAbilityFor,
  rulesFor,
  setCustomRoles,
  subject,
  validateRuleRows,
} from './ability';

const superAdmin = { _id: 'sa1', role: 'SuperAdmin' };
const admin = { _id: 'ad1', role: 'Admin' };
const vendor = { _id: 'v1', role: 'Vendor' };
const otherVendor = { _id: 'v2', role: 'Vendor' };
const customer = { _id: 'c1', role: 'Customer' };
const guest = { _id: 'g1', role: 'Guest' };

describe('SuperAdmin', () => {
  const ability = defineAbilityFor(superAdmin);

  it('manages everything', () => {
    assert.ok(ability.can('manage', 'all'));
    assert.ok(ability.can('delete', 'User'));
    assert.ok(ability.can('pay', 'Withdrawal'));
    assert.ok(ability.can('update', 'Option'));
  });
});

describe('Admin (Shop Admin)', () => {
  const ability = defineAbilityFor(admin);

  it('manages business objects', () => {
    assert.ok(ability.can('manage', 'Shop'));
    assert.ok(ability.can('create', 'User'));
    assert.ok(ability.can('delete', 'Product'));
    assert.ok(ability.can('update', 'Machine'));
    assert.ok(ability.can('update', 'Option'));
    assert.ok(ability.can('read', 'Purchase'));
  });

  it('sees roles but cannot edit them (Super Admin only)', () => {
    assert.ok(ability.can('read', 'Role'));
    assert.ok(ability.cannot('update', 'Role'));
  });

  it('handles the withdrawal workflow but cannot alter wallets', () => {
    assert.ok(ability.can('approve', 'Withdrawal'));
    assert.ok(ability.can('reject', 'Withdrawal'));
    assert.ok(ability.can('pay', 'Withdrawal'));
    assert.ok(ability.can('read', 'Wallet'));
    assert.ok(ability.cannot('update', 'Wallet'));
    assert.ok(ability.cannot('delete', 'Wallet'));
  });

  it('can update any vendor product (no ownership condition)', () => {
    const doc = subject('Product', { _id: 'p1', vendorId: 'v1' });
    assert.ok(ability.can('update', doc));
  });
});

describe('Vendor (Supplier)', () => {
  const ability = defineAbilityFor(vendor);

  it('reads the catalog and creates products, but not machines', () => {
    assert.ok(ability.can('read', 'Product'));
    assert.ok(ability.can('read', 'Machine'));
    assert.ok(ability.can('create', 'Product'));
    assert.ok(ability.cannot('create', 'Machine'));
    assert.ok(ability.can('read', 'Doc'));
    assert.ok(ability.can('read', 'PaymentProvider'));
    assert.ok(ability.cannot('update', 'Content'));
  });

  it('updates/deletes only own products; services only own machines', () => {
    assert.ok(ability.can('update', subject('Product', { vendorId: 'v1' })));
    assert.ok(ability.cannot('update', subject('Product', { vendorId: 'v2' })));
    assert.ok(ability.cannot('update', subject('Product', { vendorId: null })));
    assert.ok(ability.can('update', subject('Machine', { vendorId: 'v1' })));
    assert.ok(ability.cannot('update', subject('Machine', { vendorId: 'v2' })));
    assert.ok(ability.cannot('delete', subject('Machine', { vendorId: 'v1' })));
  });

  it('sees only own money objects', () => {
    assert.ok(ability.can('read', subject('Wallet', { vendorId: 'v1' })));
    assert.ok(ability.cannot('read', subject('Wallet', { vendorId: 'v2' })));
    assert.ok(ability.can('read', subject('Transaction', { vendorId: 'v1' })));
    assert.ok(ability.cannot('read', subject('Transaction', { vendorId: 'v2' })));
    assert.ok(ability.can('read', subject('Purchase', { vendorId: 'v1' })));
    assert.ok(ability.cannot('read', subject('Purchase', { vendorId: 'v2' })));
  });

  it('creates withdrawals for self but cannot approve/pay', () => {
    assert.ok(ability.can('create', 'Withdrawal'));
    assert.ok(ability.can('read', subject('Withdrawal', { vendorId: 'v1' })));
    assert.ok(ability.cannot('read', subject('Withdrawal', { vendorId: 'v2' })));
    assert.ok(ability.cannot('approve', 'Withdrawal'));
    assert.ok(ability.cannot('reject', 'Withdrawal'));
    assert.ok(ability.cannot('pay', 'Withdrawal'));
  });

  it('cannot touch admin-only surfaces', () => {
    assert.ok(ability.cannot('update', 'Option'));
    assert.ok(ability.cannot('create', 'User'));
    assert.ok(ability.cannot('read', 'Role'));
    assert.ok(ability.can('delete', subject('User', { _id: 'v1' })), 'may delete own account');
    assert.ok(ability.cannot('delete', subject('User', { _id: 'c1' })));
    assert.ok(ability.cannot('update', 'Shop'));
  });

  it('updates own user record only', () => {
    assert.ok(ability.can('update', subject('User', { _id: 'v1' })));
    assert.ok(ability.cannot('update', subject('User', { _id: 'c1' })));
  });
});

describe('Customer', () => {
  const ability = defineAbilityFor(customer);

  it('reads the catalog', () => {
    assert.ok(ability.can('read', 'Product'));
    assert.ok(ability.can('read', 'Machine'));
    assert.ok(ability.can('read', 'Shop'));
  });

  it('creates and reads own purchases only', () => {
    assert.ok(ability.can('create', 'Purchase'));
    assert.ok(ability.can('read', subject('Purchase', { customerId: 'c1' })));
    assert.ok(ability.cannot('read', subject('Purchase', { customerId: 'c2' })));
  });

  it('has no staff powers', () => {
    assert.ok(ability.cannot('create', 'Product'));
    assert.ok(ability.cannot('update', 'Machine'));
    assert.ok(ability.cannot('read', 'Wallet'));
    assert.ok(ability.cannot('create', 'Withdrawal'));
    assert.ok(ability.cannot('update', 'Option'));
    assert.ok(ability.cannot('create', 'User'));
  });

  it('updates own profile only', () => {
    assert.ok(ability.can('update', subject('User', { _id: 'c1' })));
    assert.ok(ability.cannot('update', subject('User', { _id: 'v1' })));
  });
});

describe('Guest', () => {
  const ability = defineAbilityFor(guest);

  it('behaves like a customer for catalog and own purchases', () => {
    assert.ok(ability.can('read', 'Product'));
    assert.ok(ability.can('create', 'Purchase'));
    assert.ok(ability.can('read', subject('Purchase', { customerId: 'g1' })));
    assert.ok(ability.cannot('read', subject('Purchase', { customerId: 'c1' })));
    assert.ok(ability.cannot('create', 'Product'));
  });
});

describe('Unknown role', () => {
  const ability = defineAbilityFor({ _id: 'x1', role: 'Bogus' });

  it('can do nothing', () => {
    assert.ok(ability.cannot('read', 'Product'));
    assert.ok(ability.cannot('create', 'Purchase'));
    assert.ok(ability.cannot('manage', 'all'));
  });
});

describe('Custom roles', () => {
  it('build abilities from registered rule rows with scoping', () => {
    setCustomRoles([
      {
        name: 'Support',
        rules: [
          { action: 'read', subject: 'Purchase', scope: 'all' },
          { action: 'update', subject: 'Product', scope: 'own-vendor' },
          { action: 'read', subject: 'Conversation', scope: 'all' },
        ],
      },
    ]);
    const ability = defineAbilityFor({ _id: 's1', role: 'Support' });
    assert.ok(ability.can('read', 'Purchase'));
    assert.ok(ability.can('read', subject('Purchase', { customerId: 'anyone' })));
    assert.ok(ability.can('update', subject('Product', { vendorId: 's1' })));
    assert.ok(ability.cannot('update', subject('Product', { vendorId: 'v1' })));
    assert.ok(ability.cannot('delete', 'Purchase'));
    assert.ok(ability.cannot('manage', 'all'));
    setCustomRoles([]);
    const gone = defineAbilityFor({ _id: 's1', role: 'Support' });
    assert.ok(gone.cannot('read', 'Purchase'), 'registry cleared');
  });

  it('validateRuleRows rejects bad rows', () => {
    assert.equal(validateRuleRows([]), null);
    assert.equal(
      validateRuleRows([{ action: 'read', subject: 'Product', scope: 'all' }]),
      null
    );
    assert.match(String(validateRuleRows([{ action: 'manage', subject: 'Product', scope: 'all' }])), /action/);
    assert.match(String(validateRuleRows([{ action: 'read', subject: 'all', scope: 'all' }])), /subject/);
    assert.match(String(validateRuleRows([{ action: 'read', subject: 'Product', scope: 'mine' }])), /scope/);
    assert.match(String(validateRuleRows('nope')), /array/);
  });
});

describe('rulesFor round-trip', () => {
  it('clients rebuild an ability that makes identical decisions', () => {
    const wired = JSON.parse(JSON.stringify(rulesFor(vendor)));
    const rebuilt = createMongoAbility(wired);
    assert.ok(rebuilt.can('update', subject('Product', { vendorId: 'v1' })));
    assert.ok(rebuilt.cannot('update', subject('Product', { vendorId: 'v2' })));
    assert.ok(rebuilt.can('create', 'Withdrawal'));
    assert.ok(rebuilt.cannot('approve', 'Withdrawal'));
  });
});
