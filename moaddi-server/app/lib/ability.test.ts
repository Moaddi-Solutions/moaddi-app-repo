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
/** Assigned to shop_a, and created shop_b — both are in scope. */
const admin = { _id: 'ad1', role: 'Admin', shopId: 'shop_a', ownedShopIds: ['shop_b'] };
/** Runs shop_z only — used to prove admins can't reach across shops. */
const otherAdmin = { _id: 'ad2', role: 'Admin', shopId: 'shop_z' };
/** Legacy account with no shop at all. */
const unassignedAdmin = { _id: 'ad3', role: 'Admin' };
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
  // Factories, not shared literals: `subject()` tags the object it is given,
  // and re-tagging one object as a second subject type throws.
  const inA = () => ({ shopId: 'shop_a' });
  const inB = () => ({ shopId: 'shop_b' });
  const elsewhere = () => ({ shopId: 'shop_z' });

  it('manages business objects inside its own shops', () => {
    assert.ok(ability.can('delete', subject('Product', inA())));
    assert.ok(ability.can('update', subject('Machine', inA())));
    assert.ok(ability.can('read', subject('Purchase', inA())));
    assert.ok(ability.can('create', subject('User', inA())));
    assert.ok(ability.can('manage', subject('Box', inA())));
  });

  it('covers the shop it created as well as the one it was assigned', () => {
    assert.ok(ability.can('update', subject('Shop', { _id: 'shop_a' })));
    assert.ok(ability.can('update', subject('Shop', { _id: 'shop_b' })));
    assert.ok(ability.can('manage', subject('Machine', inB())));
  });

  it('cannot reach into another shop', () => {
    assert.ok(ability.cannot('update', subject('Shop', { _id: 'shop_z' })));
    assert.ok(ability.cannot('update', subject('Product', elsewhere())));
    assert.ok(ability.cannot('update', subject('Machine', elsewhere())));
    assert.ok(ability.cannot('delete', subject('Box', elsewhere())));
    assert.ok(ability.cannot('read', subject('Purchase', elsewhere())));
    assert.ok(ability.cannot('update', subject('User', elsewhere())));
    assert.ok(ability.cannot('read', subject('Wallet', elsewhere())));
  });

  it('cannot touch records that carry no shop at all', () => {
    // An unstamped row must not fall through into every admin's scope.
    assert.ok(ability.cannot('update', subject('Product', { shopId: null })));
    assert.ok(ability.cannot('update', subject('Machine', {})));
  });

  it('provisions machines in its own shops (gates /broker/generatecerts)', () => {
    assert.ok(ability.can('manage', subject('Machine', inA())));
    assert.ok(ability.cannot('manage', subject('Machine', elsewhere())));
  });

  it('reads platform config but cannot edit it (Super Admin only)', () => {
    assert.ok(ability.can('read', 'Role'));
    assert.ok(ability.cannot('update', 'Role'));
    assert.ok(ability.can('read', 'Option'));
    assert.ok(ability.cannot('update', 'Option'));
    assert.ok(ability.can('read', 'Content'));
    assert.ok(ability.cannot('update', 'Content'));
    assert.ok(ability.cannot('update', 'PaymentProvider'));
  });

  it('handles the withdrawal workflow for its own shops only', () => {
    assert.ok(ability.can('approve', subject('Withdrawal', inA())));
    assert.ok(ability.can('reject', subject('Withdrawal', inA())));
    assert.ok(ability.can('pay', subject('Withdrawal', inA())));
    assert.ok(ability.cannot('approve', subject('Withdrawal', elsewhere())));
    assert.ok(ability.cannot('pay', subject('Withdrawal', elsewhere())));
  });

  it('reads money but never writes it directly', () => {
    assert.ok(ability.can('read', subject('Wallet', inA())));
    assert.ok(ability.cannot('update', subject('Wallet', inA())));
    assert.ok(ability.cannot('delete', subject('Wallet', inA())));
  });

  it('may still browse the catalog across shops', () => {
    assert.ok(ability.can('read', 'Product'));
    assert.ok(ability.can('read', 'Shop'));
    assert.ok(ability.can('read', 'Machine'));
  });
});

describe('Admin from another shop', () => {
  const ability = defineAbilityFor(otherAdmin);

  it('cannot manage the first admin\'s shops', () => {
    assert.ok(ability.cannot('update', subject('Shop', { _id: 'shop_a' })));
    assert.ok(ability.cannot('update', subject('Shop', { _id: 'shop_b' })));
    assert.ok(ability.can('update', subject('Shop', { _id: 'shop_z' })));
  });
});

describe('Admin with no shop assigned', () => {
  const ability = defineAbilityFor(unassignedAdmin);

  it('administers nothing, but may create a shop to own', () => {
    assert.ok(ability.can('create', 'Shop'));
    assert.ok(ability.cannot('update', subject('Shop', { _id: 'shop_a' })));
    assert.ok(ability.cannot('update', subject('Machine', { shopId: 'shop_a' })));
    assert.ok(ability.cannot('create', subject('User', { shopId: 'shop_a' })));
    assert.ok(ability.cannot('read', subject('Wallet', { shopId: 'shop_a' })));
    assert.ok(ability.cannot('approve', subject('Withdrawal', { shopId: 'shop_a' })));
  });

  it('still manages its own profile and can browse', () => {
    assert.ok(ability.can('update', subject('User', { _id: 'ad3' })));
    assert.ok(ability.can('read', 'Product'));
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

  it('cannot mint machine certificates (needs unscoped Machine manage)', () => {
    assert.ok(ability.cannot('manage', 'Machine'));
  });

  it('services boxes on own machines only', () => {
    assert.ok(ability.can('update', subject('Box', { vendorId: 'v1' })));
    assert.ok(ability.can('delete', subject('Box', { vendorId: 'v1' })));
    // The bug this replaces: `can('manage','Box')` was unconditional, so a
    // supplier could empty or delete boxes on a rival's machine.
    assert.ok(ability.cannot('update', subject('Box', { vendorId: 'v2' })));
    assert.ok(ability.cannot('delete', subject('Box', { vendorId: 'v2' })));
    assert.ok(ability.cannot('update', subject('Box', { vendorId: null })));
  });

  it('reads the group taxonomy but cannot reshape it', () => {
    assert.ok(ability.can('read', 'Group'));
    assert.ok(ability.cannot('create', 'Group'));
    assert.ok(ability.cannot('update', 'Group'));
    assert.ok(ability.cannot('delete', 'Group'));
  });

  it('is unaffected by shop scoping (owns records by vendorId)', () => {
    assert.ok(ability.can('update', subject('Product', { vendorId: 'v1', shopId: 'shop_z' })));
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

/**
 * Opening a locker over the socket asks exactly this question of the machine
 * it is aimed at. It used to be `user.role == "Admin"`, which let a Shop Admin
 * open any machine on the platform and left a Super Admin unable to open any,
 * so the whole matrix is pinned here.
 */
describe('servicing a machine (update Box on its owners)', () => {
  const machine = (vendorId: string | null, shopId: string | null) => () => ({
    vendorId,
    shopId,
  });
  const mine = machine('v1', 'shop_a');
  const otherVendorSameShop = machine('v2', 'shop_a');
  const otherShop = machine('v2', 'shop_z');
  const unassigned = machine(null, 'shop_a');

  it('lets a Super Admin service any machine', () => {
    const ability = defineAbilityFor(superAdmin);
    assert.ok(ability.can('update', subject('Box', mine())));
    assert.ok(ability.can('update', subject('Box', otherShop())));
    assert.ok(ability.can('update', subject('Box', machine(null, null)())));
  });

  it('lets a Shop Admin service their own floor, whoever supplies it', () => {
    const ability = defineAbilityFor(admin);
    assert.ok(ability.can('update', subject('Box', mine())));
    assert.ok(ability.can('update', subject('Box', otherVendorSameShop())));
    // Unassigned machines still stand in their shop — the admin services them.
    assert.ok(ability.can('update', subject('Box', unassigned())));
    assert.ok(ability.cannot('update', subject('Box', otherShop())));
  });

  it('lets a supplier service only their own machines', () => {
    const ability = defineAbilityFor(vendor);
    assert.ok(ability.can('update', subject('Box', mine())));
    assert.ok(ability.cannot('update', subject('Box', otherVendorSameShop())));
    assert.ok(ability.cannot('update', subject('Box', unassigned())));
  });

  it('lets a shopper service nothing', () => {
    for (const user of [customer, guest]) {
      const ability = defineAbilityFor(user);
      assert.ok(ability.cannot('update', subject('Box', mine())));
      assert.ok(ability.cannot('update', subject('Box', unassigned())));
    }
  });
});

describe('Customer', () => {
  const ability = defineAbilityFor(customer);

  it('reads the catalog', () => {
    assert.ok(ability.can('read', 'Product'));
    assert.ok(ability.can('read', 'Machine'));
    assert.ok(ability.can('read', 'Shop'));
  });

  it('reads payment providers so checkout can render them', () => {
    assert.ok(ability.can('read', 'PaymentProvider'));
    assert.ok(ability.cannot('update', 'PaymentProvider'));
  });

  it('may chat but never delete a message', () => {
    assert.ok(ability.can('create', 'Conversation'));
    assert.ok(ability.can('read', 'Conversation'));
    assert.ok(ability.can('update', 'Conversation'));
    assert.ok(ability.can('create', 'Message'));
    assert.ok(ability.can('update', 'Message'));
    assert.ok(ability.cannot('delete', 'Message'));
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

  it('supports the own-shop scope', () => {
    setCustomRoles([
      {
        name: 'ShopStaff',
        rules: [{ action: 'read', subject: 'Purchase', scope: 'own-shop' }],
      },
    ]);
    const ability = defineAbilityFor({
      _id: 'ss1',
      role: 'ShopStaff',
      shopId: 'shop_a',
      ownedShopIds: ['shop_b'],
    });
    assert.ok(ability.can('read', subject('Purchase', { shopId: 'shop_a' })));
    assert.ok(ability.can('read', subject('Purchase', { shopId: 'shop_b' })));
    assert.ok(ability.cannot('read', subject('Purchase', { shopId: 'shop_z' })));
    setCustomRoles([]);
  });

  it('validateRuleRows rejects bad rows', () => {
    assert.equal(validateRuleRows([]), null);
    assert.equal(
      validateRuleRows([{ action: 'read', subject: 'Product', scope: 'all' }]),
      null
    );
    assert.match(String(validateRuleRows([{ action: 'manage', subject: 'Product', scope: 'all' }])), /action/);
    assert.match(String(validateRuleRows([{ action: 'read', subject: 'all', scope: 'all' }])), /subject/);
    assert.equal(
      validateRuleRows([{ action: 'read', subject: 'Purchase', scope: 'own-shop' }]),
      null
    );
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
