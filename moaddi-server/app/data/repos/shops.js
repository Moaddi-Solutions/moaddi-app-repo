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
const { ROLES } = require("../../lib/roles");

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

/*
 * Create new shop.
 */
let create = async (shop, image, createdBy = null) => {
  shop = new Shops(shop);
  if (image) shop.image = image.path;
  shop._id = "shop_" + shortId.generate();
  shop.createdBy = createdBy ? String(createdBy) : null;
  shop.created = moment().utc().add(config.timeDifference, "hours");
  shop.updated = moment().utc().add(config.timeDifference, "hours");
  shop = await shop.save();

  // A shop is administered by whoever created it. Materializing that on the
  // user keeps the CASL condition a static `$in` list — see `shopScopeOf`.
  if (createdBy) {
    await Users.updateOne(
      { _id: String(createdBy) },
      { $addToSet: { ownedShopIds: shop._id } }
    );
  }

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

  // A shop admin has no machines, so the vendor pipeline below would return
  // nothing for them. They get the shops they administer — which used to be
  // every shop on the platform, handed out to anyone who passed an admin's id
  // in the path.
  if (user.role === ROLES.ADMIN) {
    const scope = shopScopeOf({
      _id: String(user._id),
      role: user.role,
      shopId: user.shopId ?? null,
      ownedShopIds: user.ownedShopIds ?? null,
    });
    const data = await Shops.find({ _id: { $in: scope }, isDeleted: false });
    return { data, total: data.length };
  }

  // Shop Admin / Super Admin handled above. Vendors reach shops via machines
  // they own; Suppliers via machines they are assigned to refill.
  try {
    const machineMatch =
      user.role === ROLES.SUPPLIER
        ? { supplierIds: String(user._id), isDeleted: false }
        : { vendorId: String(user._id), isDeleted: false };

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

  // Update all properties.
  for (let property in properties) {
    shop[property] = properties[property];
  }
  if (image) shop.image = image.path;

  shop.updated = moment().utc().add(config.timeDifference, "hours");

  shop = await shop.save();
  shop = shop.toJSON();
  return shop;
};

/*
 * Delete shop by id.
 */
let remove = async (machineId) => {
  let shop = update(machineId, { isDeleted: true });
  return shop;
};

module.exports = {
  create,
  get,
  getById,
  update,
  remove,
  getActive,
  getByVendor,
};
