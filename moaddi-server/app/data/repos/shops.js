const moment = require("moment");
const shortId = require("shortid");
const config = require("../../../config");
const Shops = require("../models/shops");
const Users = require("../models/users");
const Machines = require("../models/machines");
const {
  flattenProductForPreferredCurrency,
} = require("./product-pricing");
const { accessibleFilter } = require("../../lib/accessibleFilter");
const { shopScopeOf } = require("../../lib/ability");
const { ROLES, ADMIN_ROLES, normalizeBuiltInRole } = require("../../lib/roles");

/**
 * `ownerId` hands out authorization scope, so it is validated on the way in —
 * unlike `machines.vendorId`, which is pure denormalization.
 * Empty / missing means "no owner".
 */
const normalizeOwnerId = async (raw) => {
  const id = String(raw ?? "").trim();
  if (!id) return null;
  const user = await Users.findOne({ _id: id, isDeleted: { $ne: true } })
    .select("_id role")
    .lean();
  if (!user || !ADMIN_ROLES.includes(normalizeBuiltInRole(user.role))) {
    return Promise.reject({
      message: `ownerId must be an existing shop owner. Unknown or wrong role: ${id}`,
      statusCode: 400,
    });
  }
  return id;
};

/**
 * Ops for moving one shop between owners' `ownedShopIds`. Pure, and returns
 * null when ownership did not actually change — so an unrelated edit (or the
 * soft delete, which routes through `update`) touches no user document.
 * Exported for shops-owner.test.mjs.
 */
const ownerTransfer = (shopId, previous, next) => {
  const from = previous ? String(previous) : null;
  const to = next ? String(next) : null;
  return from === to ? null : { shopId: String(shopId), from, to };
};

const applyOwnerTransfer = async (t) => {
  if (!t) return;
  // `$pull` removes only this shop — an owner of several keeps the rest.
  if (t.from) {
    await Users.updateOne({ _id: t.from }, { $pull: { ownedShopIds: t.shopId } });
  }
  if (t.to) {
    await Users.updateOne({ _id: t.to }, { $addToSet: { ownedShopIds: t.shopId } });
  }
};

const activeShopOwnersLookup = () => ({
  $lookup: {
    from: "users",
    let: { vendorIds: "$machines.vendorId" },
    pipeline: [
      {
        $match: {
          $expr: { $in: ["$_id", "$$vendorIds"] },
          isActive: { $ne: false },
          isDeleted: { $ne: true },
        },
      },
      {
        $project: {
          password: 0,
          otp: 0,
        },
      },
    ],
    as: "shopOwners",
  },
});

const attachPrimaryShopOwner = () => ({
  $addFields: {
    shopOwner: { $arrayElemAt: ["$shopOwners", 0] },
  },
});

/**
 * Fill in `ownerId` for shops that never had one assigned but whose owner is
 * recorded on the user side.
 *
 * `create` above grants `ownedShopIds` to the creator while leaving
 * `ownerId` null — the bootstrap path, where a shop owner makes their first
 * shop and gains scope from it. So the user side can name an owner the shop
 * side does not, and anything reading only `ownerId` (the admin directory)
 * shows no owner at all for every shop made that way.
 *
 * Distinct from `activeShopOwnersLookup` above, which answers the storefront's
 * question ("a vendor selling here") off machine `vendorId` — arbitrary for a
 * multi-vendor shop, and not who administers it.
 *
 * One query for the whole page rather than per row. A shop held by several
 * users is left blank: there is no single "the owner" to name.
 */
const attachEffectiveOwner = async (shops) => {
  const unowned = new Set(shops.filter((s) => !s.ownerId).map((s) => String(s._id)));
  if (!unowned.size) return;

  const holders = await Users.find({
    ownedShopIds: { $in: [...unowned] },
    isActive: { $ne: false },
    isDeleted: { $ne: true },
  })
    .select("_id ownedShopIds")
    .lean();

  const ownerByShop = new Map();
  for (const holder of holders) {
    for (const shopId of holder.ownedShopIds ?? []) {
      const id = String(shopId);
      if (!unowned.has(id)) continue;
      // Second holder for the same shop → ambiguous, blank it.
      ownerByShop.set(id, ownerByShop.has(id) ? null : String(holder._id));
    }
  }

  for (const shop of shops) {
    if (shop.ownerId) continue;
    const resolved = ownerByShop.get(String(shop._id));
    if (resolved) shop.ownerId = resolved;
  }
};

/*
 * Create new shop.
 */
let create = async (shop, image, createdBy = null) => {
  const ownerId = await normalizeOwnerId(shop.ownerId);
  shop = new Shops(shop);
  if (image) shop.image = image.path;
  shop._id = "shop_" + shortId.generate();
  shop.createdBy = createdBy ? String(createdBy) : null;
  shop.ownerId = ownerId;
  shop.created = moment().utc().add(config.timeDifference, "hours");
  shop.updated = moment().utc().add(config.timeDifference, "hours");
  shop = await shop.save();

  // Scope goes to the assigned owner. Materializing it on the user keeps the
  // CASL condition a static `$in` list — see `shopScopeOf`. Falling back to the
  // creator preserves the bootstrap path: `can('create','Shop')` is
  // unconditional so a shopless shop owner can make their first shop and gain
  // scope from it.
  const holder = ownerId || (createdBy ? String(createdBy) : null);
  await applyOwnerTransfer(ownerTransfer(shop._id, null, holder));

  return shop;
};

/*
 * Get all shops.
 */
let get = async (skip = 0, limit = 1000, ability = null) => {
  // Scoped by the *management* rule, not the browse rule: every staff role may
  // read the shop catalog, but this directory is "shops I administer".
  const scope = ability ? accessibleFilter(ability, "update", "Shop") : {};
  const query = { ...scope, isDeleted: false };
  const total = await Shops.countDocuments(query);
  let shops = await Shops.find(query)
    .sort({ created: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  for (let i = 0; i < shops.length; i++) {
    shops[i] = shops[i].toJSON();
  }

  await attachEffectiveOwner(shops);

  return { data: shops, total };
  // return shops
};

/*
 * Get all getActive.
 */
let getActive = async (skip = 0, limit = 1000, filter, preferredCurrency) => {
  try {
    const pipeline = [
      {
        $match: { isActive: true, isDeleted: false },
      },
      {
        $lookup: {
          from: "machines",
          foreignField: "shopId",

          localField: "_id",
          as: "machines",
        },
      },
      activeShopOwnersLookup(),
      attachPrimaryShopOwner(),
      {
        $lookup: {
          from: "boxes",
          foreignField: "machineId",

          localField: "machines._id",
          as: "boxes",
        },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",

          localField: "boxes.productId",
          as: "products",
        },
      },
      { $sort: { created: -1 } },
      { $match: { ...filter } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
    ];

    let shops = await Shops.aggregate(pipeline).exec();
    if (!shops.length) {
      return { data: [], total: 0 };
    }

    shops = shops.map((shop) => ({
      ...shop,
      products: Array.isArray(shop.products)
        ? shop.products.map((p) => flattenProductForPreferredCurrency(p, preferredCurrency))
        : shop.products,
    }));

    return { data: shops, total: shops.length, preferredCurrency };
  } catch (error) {
    console.error("Error fetching Shops:", error);
    throw error;
  }
};

/*
 * Get shop by shopId.
 */
let getById = async (shopId, preferredCurrency) => {
  try {
    const pipeline = [
      {
        $match: { _id: shopId, isDeleted: false },
      },
      // {
      //     $addFields: { "_id": shopId }
      // },
      // {
      //     $lookup: {
      //         from: "users",
      //         foreignField: "shopId",

      //         localField: "_id",
      //         as: "vendors"
      //     }
      // },
      // {
      //     $project: {
      //         "vendors.password": 0,
      //     }
      // },
      {
        $lookup: {
          from: "machines",
          foreignField: "shopId",

          localField: "_id",
          as: "machines",
        },
      },
      activeShopOwnersLookup(),
      attachPrimaryShopOwner(),
      {
        $lookup: {
          from: "boxes",
          foreignField: "machineId",

          localField: "machines._id",
          as: "boxes",
        },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",

          localField: "boxes.productId",
          as: "products",
        },
      },

      {
        $sort: { created: -1 },
      },
    ];

    let shop = await Shops.aggregate(pipeline).exec();
    shop = shop[0];
    if (!shop || shop.isDeleted) {
      return Promise.reject({
        message: "Shop not found.",
        statusCode: 404,
      });
    }

    shop = {
      ...shop,
      products: Array.isArray(shop.products)
        ? shop.products.map((p) => flattenProductForPreferredCurrency(p, preferredCurrency))
        : shop.products,
    };
    // Same owner resolution as the list, so the detail page and the directory
    // never disagree about who owns a shop.
    await attachEffectiveOwner([shop]);
    return shop;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

/*
 * Get shop by shopId.
 */
let getByVendor = async (vendorId) => {
  const user = await Users.findOne({ _id: vendorId });
  if (!user) return { error: 404, data: [] };

  // The Super Admin runs the whole platform, so every shop is theirs.
  if (user.role === ROLES.SUPER_ADMIN) {
    const data = await Shops.find({ isDeleted: false });
    return { data, total: data.length };
  }

  // A shop owner has no machines, so the vendor pipeline below would return
  // nothing for them. They get the shops they administer — which used to be
  // every shop on the platform, handed out to anyone who passed an admin's id
  // in the path. (Not `ADMIN_ROLES.includes` — that list carries SuperAdmin,
  // already handled by its own return above.)
  if (user.role === ROLES.SHOP_OWNER) {
    const scope = shopScopeOf({
      _id: String(user._id),
      role: user.role,
      shopId: user.shopId ?? null,
      ownedShopIds: user.ownedShopIds ?? null,
    });
    const data = await Shops.find({ _id: { $in: scope }, isDeleted: false });
    return { data, total: data.length };
  }

  // Shop Owner / Super Admin handled above. Vendors reach shops via machines
  // they own.
  try {
    const machineMatch = { vendorId: String(user._id), isDeleted: false };

    const machines = await Machines.find(machineMatch).select("shopId").lean();
    const shopIds = [
      ...new Set(
        machines
          .map((m) => (m.shopId ? String(m.shopId) : null))
          .filter(Boolean)
      ),
    ];
    const data = await Shops.find({ _id: { $in: shopIds }, isDeleted: false });
    return { data, total: data.length };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};
/*
 * Update shop by id.
 */
let update = async (machineId, properties, image) => {
  let shop = await Shops.findOne({ _id: machineId });

  // Return error if shop not found.
  if (!shop || shop.isDeleted) {
    return Promise.reject({
      message: "Shop not found.",
      statusCode: 404,
    });
  }

  // Snapshot before the blind property loop below overwrites it.
  const previousOwnerId = shop.ownerId ?? null;
  if ("ownerId" in properties) {
    properties.ownerId = await normalizeOwnerId(properties.ownerId);
  }

  // Update all properties.
  for (let property in properties) {
    shop[property] = properties[property];
  }
  if (image) shop.image = image.path;

  shop.updated = moment().utc().add(config.timeDifference, "hours");

  shop = await shop.save();

  // Compared by value rather than `"ownerId" in properties`: the admin panel
  // PUTs the whole record on every save, and `remove` soft-deletes through this
  // same function — both are no-ops for free this way.
  await applyOwnerTransfer(
    ownerTransfer(shop._id, previousOwnerId, shop.ownerId ?? null)
  );

  shop = shop.toJSON();
  return shop;
};

/*
 * Delete shop by id.
 */
let remove = async (machineId) => {
  // Soft delete, and deliberately no `ownedShopIds` cleanup: a stale id is
  // inert (every read filters `isDeleted`), while pruning could empty an
  // owner's scope entirely — `shopIds.length === 0` means *zero* authority.
  let shop = update(machineId, { isDeleted: true });
  return shop;
};

module.exports = {
  create,
  get,
  getById,
  update,
  remove,
  ownerTransfer,
  getActive,
  getByVendor,
};
