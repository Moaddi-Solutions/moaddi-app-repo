const moment = require("moment");
const config = require("../../../config");
const Machines = require("../models/machines");
const boxesRepo = require("../../data/repos/boxes");
const productssRepo = require("../../data/repos/products");
const optionsRepo = require("../../data/repos/options");
const Products = require("../models/products");
const Boxes = require("../models/boxes");
const Events = require("../models/events");
const Purchases = require("../models/purchases");
const MachineTypes = require("../../utilities/machineTypes");
const Users = require("../models/users");

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
let get = async (skip = 0, limit = 1000, { role, _id }) => {
  const filter = {
    isDeleted: false,
    ...(role == "Vendor" && {
      vendorId: _id,
    }),
  };
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

  // machine = machine.toJSON();

  if (getBoxes) machine.boxes = await boxesRepo.getByMachineId(machine._id);

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
      {
        $project: {
          boxes: false,
        },
      },
    ];
    const data = await Machines.aggregate(pipeline).exec();
    console.log(data, "data");
    const shaped = data.map((machine) => ({
      ...machine,
      products: Array.isArray(machine.products)
        ? machine.products.map((product) =>
            flattenProductForPreferredCurrency(product, preferredCurrency)
          )
        : machine.products,
    }));
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
      {
        $project: {
          boxes: false,
        },
      },
    ];
    const data = await Machines.aggregate(pipeline).exec();
    const shaped = data.map((machine) => ({
      ...machine,
      products: Array.isArray(machine.products)
        ? machine.products.map((product) =>
            flattenProductForPreferredCurrency(product, preferredCurrency)
          )
        : machine.products,
    }));
    return { data: shaped, total, preferredCurrency };
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
};

let getByShopIdVendorId = async (
  shopId,
  vendorId,
  skip = 0,
  limit = 1000,
  preferredCurrency,
) => {
  const filter = { shopId, vendorId, isDeleted: false };

  const user = await Users.findOne({ _id: vendorId });
  if (user?.role == "Admin") delete filter.vendorId;

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
    const shaped = data.map((machine) => ({
      ...machine,
      products: Array.isArray(machine.products)
        ? machine.products.map((product) =>
            flattenProductForPreferredCurrency(product, preferredCurrency)
          )
        : machine.products,
    }));
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
let update = async (machineId, properties) => {
  let machine = await Machines.findOne({ _id: machineId });

  // Return error if machine not found.
  if (!machine || machine.isDeleted) {
    return Promise.reject({
      message: "Machine not found.",
      statusCode: 404,
    });
  }

  if (Object.prototype.hasOwnProperty.call(properties, "paymentProvider")) {
    await assertPaymentProviderAllowed(properties.paymentProvider);
  }

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
    machine.x = "y";
  }
  machine.updated = moment().utc().add(config.timeDifference, "hours");

  machine = await machine.save();
  machine = machine.toJSON();
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

  return machine;
};

/*
 * Delete machine by id.
 */
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
  unassign,
  remove,
  getByShopIdVendorId,
};
