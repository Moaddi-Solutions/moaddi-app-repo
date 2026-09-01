const moment = require("moment");
const config = require("../../../config");
const Machines = require("../models/machines");
const Users = require("../models/users");
const boxesRepo = require("../../data/repos/boxes");
const productssRepo = require("../../data/repos/products");
const optionsRepo = require("../../data/repos/options");
const Products = require("../models/products");
const Boxes = require("../models/boxes");
const Events = require("../models/events");
const Purchases = require("../models/purchases");
const MachineTypes = require("../../utilities/machineTypes");
const { accessibleFilter, accessibleFilterAny, accessibleScopedFilter } = require("../../lib/accessibleFilter");
const {
  normalizeSupportUserId,
  normalizeSupplierIds,
  sanitizeSupplierIdsForRead,
  normalizeSupportAssignments,
} = require("../../lib/tenantAssignment");

/**
 * Sync supportAssignments ↔ legacy supportUserId (`all` lane).
 */
const applySupportFields = async (properties, tenantId) => {
  if ("supportAssignments" in properties) {
    properties.supportAssignments = await normalizeSupportAssignments(
      properties.supportAssignments,
      tenantId,
    );
    const all = properties.supportAssignments.find((r) => r.audience === "all");
    properties.supportUserId = all?.userId ?? null;
    return;
  }
  if ("supportUserId" in properties) {
    const id = await normalizeSupportUserId(properties.supportUserId, tenantId);
    properties.supportUserId = id;
    properties.supportAssignments = id
      ? [{ audience: "all", userId: id }]
      : [];
  }
};

/**
 * Reject paymentProvider values that aren't in the currently-active set.
 * Empty / null values are allowed (machine simply has no provider configured).
 */
const assertPaymentProviderAllowed = async (paymentProvider) => {
  if (paymentProvider == null || paymentProvider === "") return;
  const active = await optionsRepo.getActivePaymentProviders();
  if (!active.includes(paymentProvider)) {
    return Promise.reject({
      message: `Payment provider "${paymentProvider}" is not active. Activate it under Site Options first.`,
      statusCode: 400,
    });
  }
};

/**
 * The shop/group aggregation pipelines `$lookup` boxes onto the machine, then
 * `$lookup` products via `boxes.productId` — which dedupes into a flat
 * `machine.products` list without preserving which boxes belong to which
 * product. Re-attach each product's own boxes here (mirrors what the
 * `getByQrCode` pipeline does with its `$group` stages), then drop the raw
 * machine-level `boxes` field like the old `$project: { boxes: false }` did.
 */
const attachBoxesToProducts = (machine) => {
  const boxesByProduct = new Map();
  for (const box of machine.boxes ?? []) {
    if (!box.productId) continue;
    const key = String(box.productId);
    if (!boxesByProduct.has(key)) boxesByProduct.set(key, []);
    boxesByProduct.get(key).push(box);
  }
  const { boxes, ...rest } = machine;
  return {
    ...rest,
    products: Array.isArray(machine.products)
      ? machine.products.map((product) => ({
          ...product,
          boxes: boxesByProduct.get(String(product._id)) ?? [],
        }))
      : machine.products,
  };
};

const activeVendorLookup = (localVendorField = "$vendorId") => ({
  $lookup: {
    from: "users",
    let: { vendorId: localVendorField },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ["$_id", "$$vendorId"] },
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
    as: "shopOwner",
  },
});

const attachShopOwnerToShop = () => ({
  $addFields: {
    shopOwner: { $arrayElemAt: ["$shopOwner", 0] },
    shop: {
      $map: {
        input: "$shop",
        as: "shop",
        in: {
          $mergeObjects: [
            "$$shop",
            {
              shopOwner: { $arrayElemAt: ["$shopOwner", 0] },
            },
          ],
        },
      },
    },
  },
});

const getProductStockById = (machines) => {
  const stockByProduct = new Map();
  for (const machine of machines ?? []) {
    if (machine?.isActive === false || machine?.isDeleted === true) continue;

    for (const box of machine.boxes ?? []) {
      if (!box?.productId || box.isActive !== true || box.isDeleted === true) {
        continue;
      }

      const productId = String(box.productId);
      stockByProduct.set(productId, (stockByProduct.get(productId) ?? 0) + 1);
    }
  }
  return stockByProduct;
};

const { convertToUSD } = require("../../services/currency");
const {
  flattenProductForPreferredCurrency,
} = require("./product-pricing");

const localPrice = (product) => {
  const local = {
    originalPrice: product.originalPrice,
    tax: product.tax,
    salePrice: product.salePrice,
  };
  if (product.campaignPrice) {
    local.campaignPrice = product.campaignPrice;
  }
  return local;
};
const usdPrice = (product) => {
  const isUSD = product.currency === "USD";

  const usd = {
    originalPrice: isUSD
      ? product.originalPrice
      : convertToUSD(product.originalPrice, product.currency),
    tax: isUSD ? product.tax : convertToUSD(product.tax, product.currency),
    salePrice: isUSD
      ? product.salePrice
      : convertToUSD(product.salePrice, product.currency),
  };
  if (product.campaignPrice) {
    usd.campaignPrice = isUSD
      ? product.campaignPrice
      : convertToUSD(product.campaignPrice, product.currency);
  }
  return usd;
};
/*
 * Create new machine.
 */
let create = async (machine) => {
  await assertPaymentProviderAllowed(machine.paymentProvider);

  machine.qrCode = machine.mac;
  machine = new Machines(machine);

  let Machine = await Machines.findOne({ _id: "machine_" + machine.mac });

  // Return error if machine already exists.
  if (Machine) {
    return Promise.reject({
      message: "Machine already exists.",
      statusCode: 409,
    });
  }

  const supportProps = {};
  if ("supportAssignments" in machine) {
    supportProps.supportAssignments = machine.supportAssignments;
  } else if ("supportUserId" in machine || machine.supportUserId != null) {
    supportProps.supportUserId = machine.supportUserId;
  }
  if (Object.keys(supportProps).length) {
    await applySupportFields(supportProps, machine.vendorId ?? null);
    if ("supportAssignments" in supportProps) {
      machine.supportAssignments = supportProps.supportAssignments;
    }
    if ("supportUserId" in supportProps) {
      machine.supportUserId = supportProps.supportUserId;
    }
  }
  if ("supplierIds" in machine || machine.supplierIds != null) {
    machine.supplierIds = await normalizeSupplierIds(
      machine.supplierIds,
      machine.vendorId ?? null,
    );
  }

  machine._id = "machine_" + machine.mac;
  machine.created = moment().utc().add(config.timeDifference, "hours");
  machine.updated = moment().utc().add(config.timeDifference, "hours");

  switch (MachineTypes[machine.type]) {
    case "Direct":
      machine.isConnected = true;
      break;
    case "kaisijin_12":
      machine.boxes = machine.boxes > 12 ? 12 : machine.boxes;
      machine.isConnected = true;
      break;
    case "kaisijin_24":
      machine.boxes = machine.boxes > 24 ? 24 : machine.boxes;
      machine.isConnected = true;
      break;
    case "Bluetooth_4":
      machine.boxes = machine.boxes > 256 ? 256 : machine.boxes;
      machine.isConnected = true;
      break;
    case "genai":
      machine.boxes = machine.boxes > 4 ? 4 : machine.boxes;
      machine.isConnected = true;
      break;
  }
  machine = await machine.save();
  machine = machine.toJSON();

  switch (MachineTypes[machine.type]) {
    case "Direct":
    case "Bluetooth":
      await boxesRepo.createBulkDirect({
        machineId: machine._id,
        count: machine.boxes,
      });
      break;
    case "kaisijin_12":
    case "kaisijin_24":
    case "Bluetooth_4":
    case "genai":
      await boxesRepo.createBulkBluetooth2({
        machineId: machine._id,
        count: machine.boxes,
      });
      break;
    default:
      await boxesRepo.createBulk({
        machineId: machine._id,
        count: machine.boxes,
      });
  }

  return machine;
};

/*
 * Get all machines.
 */
/**
 * Staff machine directory — Vendor (`update Machine`), supplier fill
 * (`update Box`), or ShopOwner shop-scoped `read Machine`. Catalog
 * `read Machine` is too wide (every signed-in user may browse).
 */
let get = async (skip = 0, limit = 1000, ability = null) => {
  const scope = ability
    ? accessibleFilterAny(
        accessibleFilter(ability, "update", "Machine"),
        accessibleScopedFilter(ability, "read", "Machine"),
        accessibleFilter(ability, "update", "Box")
      )
    : {};
  const filter = { ...scope, isDeleted: false };
  const total = await Machines.countDocuments(filter);
  let machines = await Machines.find(filter)
    .sort({ created: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  for (let i = 0; i < machines.length; i++) {
    machines[i] = machines[i].toJSON();
  }

  // return machines;
  return { data: machines, total };
};

/*
 * Get active machines for public storefront sections.
 */
let getActive = async (skip = 0, limit = 1000) => {
  const filter = { isDeleted: false, isActive: true };
  const total = await Machines.countDocuments(filter);
  const machines = await Machines.find(filter)
    .sort({ created: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  const machineIds = machines.map((machine) => machine._id);
  const shelfCounts = await Boxes.aggregate([
    {
      $match: {
        machineId: { $in: machineIds },
        isActive: true,
        productId: { $ne: null },
      },
    },
    {
      $group: {
        _id: { machineId: "$machineId", productId: "$productId" },
        units: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.machineId",
        productsOnShelf: { $sum: 1 },
        totalStock: { $sum: "$units" },
      },
    },
  ]);
  const shelfStatsByMachine = new Map(
    shelfCounts.map(({ _id, productsOnShelf, totalStock }) => [
      _id,
      { productsOnShelf, totalStock },
    ]),
  );

  return {
    data: machines.map((machine) => {
      const json = machine.toJSON();
      const shelfStats = shelfStatsByMachine.get(json._id);
      return {
        ...json,
        productsOnShelf: shelfStats?.productsOnShelf ?? 0,
        totalStock: shelfStats?.totalStock ?? 0,
      };
    }),
    total,
  };
};

/*
 * Get machine by machineId.
 */
let getById = async (machineId, getBoxes = true, responseReturn = true) => {
  console.log("machineId:", machineId);
  console.log("getBoxes:", getBoxes);
  console.log("responseReturn:", responseReturn);
  let machine = await Machines.findOne({ isDeleted: false, _id: machineId });

  if (!machine || machine.isDeleted) {
    if (responseReturn)
      return Promise.reject({
        message: "Machine not found.",
        statusCode: 404,
      });
    return machine;
  }

  // Schema `boxes` is capacity (Number). Slot rows live on Box documents —
  // expose them as `boxSlots` so edit forms never round-trip an array into
  // the capacity field (Cast to Number failed). Fill uses GET /boxes/machine/:id.
  machine = machine.toJSON();
  if (getBoxes) {
    machine.boxSlots = await boxesRepo.getByMachineId(machine._id);
  }
  // Drop deleted / foreign supplier ids so Machine edit does not keep ghost
  // chips that fail validation on save.
  if (machine.vendorId && Array.isArray(machine.supplierIds)) {
    machine.supplierIds = await sanitizeSupplierIdsForRead(
      machine.supplierIds,
      machine.vendorId,
    );
  }

  return machine;
};

/*
 * Get machine by qrCode.
 */
let getByQrCode = async (qrCode, preferredCurrency) => {
  console.log("qrCode:", qrCode);

  let machineFound = false,
    boxesFound = false,
    productsFound = false;
  let machine = await Machines.findOne({ isDeleted: false, qrCode: qrCode });
  if (machine) machineFound = true;
  else
    return Promise.reject({
      message: "Machine not found.",
      statusCode: 404,
    });

  let boxes = await boxesRepo.getByMachineId(machine._id);
  if (boxes) {
    boxesFound = true;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].productId != null) {
        productsFound = true;
        break;
      }
    }
  }

  if (machineFound && boxesFound && productsFound) {
    console.log("All Found");

    let pipeline = [
      {
        $match: {
          qrCode: qrCode,
        },
      },
      {
        $lookup: {
          from: "boxes",
          localField: "_id",
          foreignField: "machineId",
          as: "boxes",
        },
      },
      {
        $unwind: {
          path: "$boxes",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "boxes.productId",
          foreignField: "_id",
          as: "products",
        },
      },
      {
        $unwind: {
          path: "$products",
        },
      },
      {
        $group: {
          _id: "$products._id",
          machineId: {
            $first: "$_id",
          },
          mac: {
            $first: "$mac",
          },
          machineName: {
            $first: "$name",
          },
          qrCode: {
            $first: "$qrCode",
          },
          vendorId: {
            $first: "$vendorId",
          },
          isAssigned: {
            $first: "$isAssigned",
          },
          isActive: {
            $first: "$isActive",
          },
          isDeleted: {
            $first: "$isDeleted",
          },
          isConnected: {
            $first: "$isConnected",
          },
          paymentProvider: {
            $first: "$paymentProvider",
          },
          productName: {
            $first: "$products.name",
          },
          // 'price': {
          //     '$first': '$products.price'
          // },
          salePrice: {
            $first: "$products.salePrice",
          },
          originalPrice: {
            $first: "$products.originalPrice",
          },
          campaignPrice: {
            $first: "$products.campaignPrice",
          },
          // ----------------------------------
          barCode: {
            $first: "$products.barCode",
          },
          image: {
            $first: "$products.image",
          },
          boxes: {
            $push: "$boxes",
          },
          type: {
            $first: "$type",
          },
        },
      },
      {
        $group: {
          _id: "$machineId",
          mac: {
            $first: "$mac",
          },
          name: {
            $first: "$machineName",
          },
          qrCode: {
            $first: "$qrCode",
          },
          vendorId: {
            $first: "$vendorId",
          },
          isAssigned: {
            $first: "$isAssigned",
          },
          isActive: {
            $first: "$isActive",
          },
          isDeleted: {
            $first: "$isDeleted",
          },
          isConnected: {
            $first: "$isConnected",
          },
          paymentProvider: {
            $first: "$paymentProvider",
          },
          products: {
            $push: "$$ROOT",
          },
          type: {
            $first: "$type",
          },
        },
      },
    ];
    let machine = await Machines.aggregate(pipeline);

    console.log("machine:", machine);

    if (machine.length > 0) {
      machine = machine[0];
      const productIds = machine.products.map((p) => p._id).filter(Boolean);
      const dbProducts = await Products.find({
        _id: { $in: productIds },
        isDeleted: false,
      });
      // Shape products exactly like `productsRepo.get()` does (prices + preferredCurrency),
      // then join back with boxes from the aggregation result.
      const shapedById = new Map(
        dbProducts.map((doc) => {
          const product = doc.toJSON();
          return [doc._id, flattenProductForPreferredCurrency(product, preferredCurrency)];
        }),
      );
      machine.products = machine.products
        .map((agg) => {
          const shaped = shapedById.get(agg._id);
          if (!shaped) return null;
          return { ...shaped, boxes: agg.boxes };
        })
        .filter(Boolean);
      return machine;
    }
  } else if (machineFound && boxesFound) {
    console.log("Machine and Boxes Found");

    // Convert the Mongoose document to a plain JavaScript object.
    const Machine = machine.toObject();

    // Add the 'products' field.
    Machine.products = [];

    return Machine;
  } else if (machineFound) {
    console.log("Machine Found");
  }
};

/*
 * Get all machines which are not assigned to any vendor.
 */
let getAllNotAssigned = async (skip = 0, limit = 1000) => {
  let machines = await Machines.find({ isDeleted: false, isAssigned: false })
    .sort({ created: 1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  for (let i = 0; i < machines.length; i++) {
    machines[i] = machines[i].toJSON();
  }
  return machines;
};

let getByVendorId = async (vendorId, preferredCurrency) => {
  let machines = await Machines.find({ vendorId: vendorId, isDeleted: false });

  // Create an array of async functions to fetch boxes and products for each machine
  const promises = machines.map(async (machine) => {
    const machineJSON = machine.toJSON();
    machineJSON.boxes = await boxesRepo.getByMachineId(machine._id);

    // Create an array of async functions to fetch products for each box
    const boxPromises = machineJSON.boxes.map(async (box) => {
      if (box.productId != null) {
        const product = await productssRepo.getById(
          box.productId,
          preferredCurrency,
        );
        box.product = product;
      }
      return box;
    });

    // Await all the async functions that fetch products for each box
    machineJSON.boxes = await Promise.all(boxPromises);
    return machineJSON;
  });

  // Await all the async functions that fetch boxes and products for each machine
  machines = await Promise.all(promises);
  return { data: machines, total: machines.length };

  // return machines;
};

let getByProductId = async (productId) => {
  try {
    const pipeline = [
      {
        $match: { _id: productId, isDeleted: false },
      },
      {
        $lookup: {
          from: "boxes",
          foreignField: "productId",

          localField: "_id",
          as: "boxes",
        },
      },
      {
        $lookup: {
          from: "machines",
          foreignField: "_id",

          localField: "boxes.machineId",
          as: "machines",
        },
      },
      {
        $sort: { created: -1 },
      },
    ];

    let product = await Products.aggregate(pipeline).exec();
    product = product[0];
    if (!product) {
      return Promise.reject({
        message: "Product not found.",
        statusCode: 404,
      });
    }

    // return product.machines;
    return { data: product.machines, total: product.machines.length };
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
};

let getByShopId = async (shopId, skip = 0, limit = 1000, preferredCurrency) => {
  const filter = { shopId, isDeleted: false };
  const total = await Machines.countDocuments(filter);
  try {
    const pipeline = [
      { $match: filter },
      { $sort: { created: -1 } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "shops",
          foreignField: "_id",

          localField: "shopId",
          as: "shop",
        },
      },
      activeVendorLookup(),
      attachShopOwnerToShop(),
      {
        $lookup: {
          from: "boxes",
          foreignField: "machineId",

          localField: "_id",
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
    ];
    const data = await Machines.aggregate(pipeline).exec();
    console.log(data, "data");
    const stockByProduct = getProductStockById(data);
    const shaped = data.map((machine) => {
      const withBoxes = attachBoxesToProducts(machine);
      return {
        ...withBoxes,
        products: Array.isArray(withBoxes.products)
          ? withBoxes.products.map((product) => ({
              ...flattenProductForPreferredCurrency(product, preferredCurrency),
              boxes: product.boxes,
              stock: stockByProduct.get(String(product._id)) ?? 0,
            }))
          : withBoxes.products,
      };
    });
    return { data: shaped, total, preferredCurrency };
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
  // const filter = { shopId, isDeleted: false }
  // const data = await Machines.find(filter)
  //     .sort({ created: 1 })
  //     .skip(parseInt(skip))
  //     .limit(parseInt(limit));
  // const total = await Machines.countDocuments(filter);
  // return { data, total }
};

let getByGroupId = async (
  groupId,
  skip = 0,
  limit = 1000,
  preferredCurrency,
) => {
  const filter = { groupId };
  const total = await Machines.countDocuments(filter);
  try {
    const pipeline = [
      { $match: filter },
      { $sort: { created: -1 } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "groups",
          foreignField: "_id",

          localField: "groupId",
          as: "group",
        },
      },
      {
        $lookup: {
          from: "boxes",
          foreignField: "machineId",

          localField: "_id",
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
    ];
    const data = await Machines.aggregate(pipeline).exec();
    const shaped = data.map((machine) => {
      const withBoxes = attachBoxesToProducts(machine);
      return {
        ...withBoxes,
        products: Array.isArray(withBoxes.products)
          ? withBoxes.products.map((product) => ({
              ...flattenProductForPreferredCurrency(product, preferredCurrency),
              boxes: product.boxes,
            }))
          : withBoxes.products,
      };
    });
    return { data: shaped, total, preferredCurrency };
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
};

/**
 * Machines in one shop supplied by one vendor.
 *
 * `scope` is the caller's CASL row filter. It used to derive the scope from the
 * *path* `vendorId` instead — looking that user up and, if they were an Admin,
 * dropping the vendor filter so the whole shop floor came back. On a route that
 * did not require a session, that handed anyone who knew a shop id and any
 * admin's id the shop's full inventory. The caller's own rules decide now, and
 * a shop admin reaches the whole floor through the shop-only listing.
 */
let getByShopIdVendorId = async (
  shopId,
  vendorId,
  skip = 0,
  limit = 1000,
  preferredCurrency,
  scope = {},
) => {
  const requested = { shopId, vendorId, isDeleted: false };
  const filter =
    scope && Object.keys(scope).length ? { $and: [scope, requested] } : requested;

  const total = await Machines.countDocuments(filter);
  try {
    const pipeline = [
      { $match: filter },
      { $sort: { created: -1 } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "shops",
          foreignField: "_id",

          localField: "shopId",
          as: "shop",
        },
      },
      activeVendorLookup(),
      attachShopOwnerToShop(),
      {
        $lookup: {
          from: "boxes",
          foreignField: "machineId",

          localField: "_id",
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
    ];
    const data = await Machines.aggregate(pipeline).exec();
    const shaped = data.map((machine) => {
      const withBoxes = attachBoxesToProducts(machine);
      return {
        ...withBoxes,
        products: Array.isArray(withBoxes.products)
          ? withBoxes.products.map((product) => ({
              ...flattenProductForPreferredCurrency(product, preferredCurrency),
              boxes: product.boxes,
            }))
          : withBoxes.products,
      };
    });
    return { data: shaped, total, preferredCurrency };
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
  // const filter = { shopId, isDeleted: false }
  // const data = await Machines.find(filter)
  //     .sort({ created: 1 })
  //     .skip(parseInt(skip))
  //     .limit(parseInt(limit));
  // const total = await Machines.countDocuments(filter);
  // return { data, total }
};
/*
 * Toggle machine by id.
 * Toggle off means that the machine is Inactive.
 */
let toggle = async (machineId) => {
  let machine = await Machines.findOne({ _id: machineId });

  if (!machine || machine.isDeleted) {
    return Promise.reject({
      message: "Machine not found.",
      statusCode: 404,
    });
  }

  // Update property.
  if (machine.isActive)
    await Boxes.updateMany({ machineId }, { $set: { isActive: true } });

  machine.isActive = machine.isActive == true ? false : true;
  machine.updated = moment().utc().add(config.timeDifference, "hours");

  machine = await machine.save();
  machine = machine.toJSON();

  const socketServer = require("../../services/socket");
  // When Machine Active Status Change Publish for Applications for Customer/Vendor
  let event = {
    machineId: machine._id,
    isActive: machine.isActive,
  };
  await socketServer.socketPublish({ type: "MachineStatus", data: event });

  return machine;
};

/*
 * Update machine by id.
 */
/**
 * Fields a general update may write.
 *
 * Everything absent from this list is owned by a route that does more than set
 * the column, and writing it here skipped that work entirely:
 *   isActive     -> toggle(), which also cascades to the machine's boxes
 *   isConnected  -> updateConnection(), driven by device telemetry
 *   isAssigned   -> assign()/unassign(), kept in step with vendorId
 *   isDeleted    -> remove(), gated on `delete:Machine` — setting it here was a
 *                   soft-delete for anyone holding only `update:Machine`
 *   _id, qrCode  -> identity; qrCode is how a customer reaches this machine
 *   created/updated -> stamped by the repo
 *
 * `vendorId`/`shopId`/`groupId` stay writable because /assign and the admin
 * edit form legitimately set them; *who* may do so is enforced by
 * `assertCanReassign` in the controller, where the caller's ability lives.
 */
const UPDATABLE_FIELDS = new Set([
  "name",
  "mac",
  "location",
  "boxes",
  "type",
  "password",
  "specialProducts",
  "paymentProvider",
  "vendorId",
  "shopId",
  "groupId",
]);

let update = async (machineId, properties) => {
  let machine = await Machines.findOne({ _id: machineId });

  // Return error if machine not found.
  if (!machine || machine.isDeleted) {
    return Promise.reject({
      message: "Machine not found.",
      statusCode: 404,
    });
  }

  // Drop anything not writable here rather than rejecting: the dashboard form
  // submits the whole record, so a payload carrying isActive/isConnected is
  // normal traffic, not an attack. The fields simply stop being honoured.
  properties = Object.fromEntries(
    Object.entries(properties || {}).filter(([key]) => UPDATABLE_FIELDS.has(key)),
  );

  if (Object.prototype.hasOwnProperty.call(properties, "paymentProvider")) {
    await assertPaymentProviderAllowed(properties.paymentProvider);
  }

  if ("supportAssignments" in properties || "supportUserId" in properties) {
    const tenantId = properties.vendorId ?? machine.vendorId ?? null;
    await applySupportFields(properties, tenantId);
  }
  if ("supplierIds" in properties) {
    const tenantId = properties.vendorId ?? machine.vendorId ?? null;
    properties.supplierIds = await normalizeSupplierIds(
      properties.supplierIds,
      tenantId,
    );
  }

  // Edit forms often POST the full getOne payload. `boxes` must stay a
  // capacity Number — drop slot arrays / nested junk so save does not cast-fail.
  if (Array.isArray(properties.boxes)) {
    delete properties.boxes;
  } else if (
    properties.boxes != null &&
    typeof properties.boxes !== "number" &&
    !Number.isFinite(Number(properties.boxes))
  ) {
    delete properties.boxes;
  } else if (properties.boxes != null && typeof properties.boxes !== "number") {
    properties.boxes = Number(properties.boxes);
  }
  delete properties.boxSlots;
  delete properties.product;
  delete properties.products;
  delete properties.shop;
  delete properties.vendor;

  // Update all properties.
  for (let property in properties) {
    if (property == "boxes") {
      console.log("old boxes:", machine[property]);
      console.log("new boxes:", properties[property]);
      switch (MachineTypes[machine.type]) {
        case "kaisijin_12":
          properties.boxes = properties.boxes > 12 ? 12 : properties.boxes;
          break;
        case "kaisijin_24":
          properties.boxes = properties.boxes > 24 ? 24 : properties.boxes;
          break;
        case "Bluetooth_4":
          properties.boxes = properties.boxes > 256 ? 256 : properties.boxes;
          break;
        case "genai":
          properties.boxes = properties.boxes > 4 ? 4 : properties.boxes;
          break;
      }

      const actualBoxCount = await Boxes.countDocuments({
        machineId,
        isDeleted: false,
      });
      const targetBoxCount = properties[property];

      if (targetBoxCount != actualBoxCount) {
        console.log("Need to update boxes");
        const operation = targetBoxCount > actualBoxCount ? "add" : "remove";
        console.log(`${operation} boxes: ${actualBoxCount} -> ${targetBoxCount}`);

        await boxesRepo.modifyBoxes(
          machineId,
          actualBoxCount,
          targetBoxCount,
          operation,
          machine.type,
        );
      } else console.log("No need to update boxes");
    }
    machine[property] = properties[property];
  }
  machine.updated = moment().utc().add(config.timeDifference, "hours");

  machine = await machine.save();
  machine = machine.toJSON();
  // Boxes inherit their owner from the machine — keep them in step whenever
  // the machine's vendor, shop, or suppliers are among the updated properties.
  if (
    "vendorId" in properties ||
    "shopId" in properties ||
    "supplierIds" in properties
  ) {
    await boxesRepo.remachine(machine._id);
  }
  return machine;
};

/*
 * Update machine connection status by id.
 */
let updateConnection = async (machineId, status) => {
  let machine = await Machines.findOne({ _id: machineId });

  // Return error if machine not found.
  if (!machine || machine.isDeleted) {
    return Promise.reject({
      message: "Machine not found.",
      statusCode: 404,
    });
  }
  machine.isConnected = status;
  machine.updated = moment().utc().add(config.timeDifference, "hours");

  machine = await machine.save();
  machine = machine.toJSON();
  return machine;
};

/*
 * Assign machine to vendor.
 */
let assign = async (machineId, body) => {
  let machine = await Machines.findOne({ _id: machineId });

  // Return error if machine not found.
  if (!machine || machine.isDeleted) {
    return Promise.reject({
      message: "Machine not found.",
      statusCode: 404,
    });
  }

  // Update vendorId.
  machine.vendorId = body.vendorId;
  machine.isAssigned = true;
  machine.updated = moment().utc().add(config.timeDifference, "hours");

  machine = await machine.save();
  machine = machine.toJSON();
  await boxesRepo.remachine(machine._id);
  return machine;
};

/*
 * Assign machine to vendor in bulk.
 */
let assignBulk = async (vendorId, machines) => {
  machines.forEach(async (machineId) => {
    console.log("machineId:", machineId);
    await assign(machineId, { vendorId: vendorId });
  });
};

/**
 * Make `machineIds` the full set of machines owned by this vendor: assign any
 * missing ones and unassign ones no longer selected (only if still theirs).
 */
let syncVendorMachines = async (vendorId, machineIds) => {
  const desired = [
    ...new Set(
      (Array.isArray(machineIds) ? machineIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    ),
  ];
  const current = await Machines.find({
    vendorId: String(vendorId),
    isDeleted: false,
  })
    .select("_id")
    .lean();
  const currentIds = current.map((m) => String(m._id));
  const desiredSet = new Set(desired);
  const currentSet = new Set(currentIds);

  for (const id of desired) {
    if (!currentSet.has(id)) await assign(id, { vendorId: String(vendorId) });
  }
  for (const id of currentIds) {
    if (!desiredSet.has(id)) await unassign(id, {});
  }
  return desired;
};

/**
 * Sync many-to-many supplier assignments for one staff user.
 * Writes `machines.supplierIds` only — never touches `vendorId` ownership.
 */
let syncSupplierMachines = async (supplierId, machineIds) => {
  const uid = String(supplierId);
  const desired = [
    ...new Set(
      (Array.isArray(machineIds) ? machineIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ];
  const desiredSet = new Set(desired);

  // Resolve the supplier's vendor tenant. Never attach them to another
  // vendor's machines (normalizeSupplierIds is bypassed on this path).
  const supplier = await Users.findOne({ _id: uid }).select("tenantId role").lean();
  const tenantVendorId =
    (supplier && supplier.tenantId && String(supplier.tenantId)) || null;
  if (!tenantVendorId) {
    return Promise.reject({
      message: "Cannot assign supplier machines without a vendor tenant.",
      statusCode: 400,
    });
  }

  const currentlyAssigned = await Machines.find({
    supplierIds: uid,
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();
  const currentIds = currentlyAssigned.map((row) => String(row._id));
  const currentSet = new Set(currentIds);

  for (const id of desired) {
    if (currentSet.has(id)) continue;
    const result = await Machines.updateOne(
      {
        _id: id,
        isDeleted: { $ne: true },
        vendorId: tenantVendorId,
      },
      { $addToSet: { supplierIds: uid } },
    );
    if (result.matchedCount === 0) {
      return Promise.reject({
        message: `Machine ${id} is not in this supplier's vendor tenant.`,
        statusCode: 400,
      });
    }
    await boxesRepo.remachine(id);
  }
  for (const id of currentIds) {
    if (desiredSet.has(id)) continue;
    await Machines.updateOne(
      { _id: id },
      { $pull: { supplierIds: uid } },
    );
    await boxesRepo.remachine(id);
  }
  return desired;
};

/*
 * Assign machine to vendor.
 */
let unassign = async (machineId, body) => {
  let machine = await Machines.findOne({ _id: machineId });

  // Return error if machine not found.
  if (!machine || machine.isDeleted) {
    return Promise.reject({
      message: "Machine not found.",
      statusCode: 404,
    });
  }

  // Update vendorId.
  machine.vendorId = null;
  machine.isAssigned = false;
  machine.updated = moment().utc().add(config.timeDifference, "hours");

  machine = await machine.save();
  machine = machine.toJSON();
  await boxesRepo.remachine(machine._id);

  return machine;
};

/*
 * Delete machine by id.
 */
/** Owner lookup for CASL ownership checks (null = unassigned machine). */
let getVendorIdOf = async (machineId) => {
  const m = await Machines.findOne({ _id: machineId }).select("vendorId").lean();
  if (!m) {
    return Promise.reject({ message: "Machine not found.", statusCode: 404 });
  }
  return m.vendorId || null;
};

let remove = async (machineId) => {
  let machine = await Machines.deleteOne({ _id: machineId });
  await Boxes.deleteMany({ machineId: machineId });
  await Events.deleteMany({ machineId: machineId });
  await Purchases.deleteMany({ machineId: machineId });
  return machine;
};

module.exports = {
  create,
  toggle,
  get,
  getActive,
  getById,
  getByQrCode,
  getByProductId,
  getByShopId,
  getByGroupId,
  getByVendorId,
  getAllNotAssigned,
  update,
  updateConnection,
  assign,
  assignBulk,
  syncVendorMachines,
  syncSupplierMachines,
  unassign,
  remove,
  getVendorIdOf,
  getByShopIdVendorId,
};
