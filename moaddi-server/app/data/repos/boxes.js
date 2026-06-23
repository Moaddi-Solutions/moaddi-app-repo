const moment = require("moment");
const shortId = require("shortid");
const config = require("../../../config");
const Boxes = require("../models/boxes");
const productssRepo = require("../../data/repos/products");
const MachineTypes = require("../../utilities/machineTypes");

/*
 * Create new box.
 */
let create = async (box) => {
  box = new Boxes(box);
  box._id = "box_" + shortId.generate();
  box.created = moment().utc().add(config.timeDifference, "hours");
  box.updated = moment().utc().add(config.timeDifference, "hours");
  box = await box.save();
  box = box.toJSON();
  return box;
};

/*
 * Create new boxes in bulk.
 */
let createBulkDirect = async (body) => {
  const totalBoxes = body.count;
  let boxes = [];
  let cabinNumber = 1;
  for (let i = 1; i <= totalBoxes; i++)
    boxes.push({
      _id: body.machineId + "_" + "C" + cabinNumber + "_" + i,
      name: "C" + cabinNumber + "," + i,
      cabinNumber: cabinNumber,
      boxNumber: i,
      machineId: body.machineId,
      created: moment().utc().add(config.timeDifference, "hours"),
      updated: moment().utc().add(config.timeDifference, "hours"),
    });

  // console.log('boxes:', boxes);
  // Use the insertMany() method to perform bulk insert
  boxes = await Boxes.insertMany(boxes);
  return boxes;
};

/*
 * Create new boxes in bulk.
 */
let createBulkBluetooth2 = async (body) => {
  const totalBoxes = body.count;
  let boxes = [];
  let cabinNumber = 1;
  for (let i = 1; i <= totalBoxes; i++)
    boxes.push({
      _id: body.machineId + "_" + "C" + cabinNumber + "_" + i,
      name: i,
      boxNumber: i,
      cabinNumber,
      machineId: body.machineId,
      created: moment().utc().add(config.timeDifference, "hours"),
      updated: moment().utc().add(config.timeDifference, "hours"),
    });
  boxes = await Boxes.insertMany(boxes);
  return boxes;
};

/*
 * Create new boxes in bulk.
 */
let createBulk = async (body) => {
  const boxesPerCabin = 12;
  const totalBoxes = body.count;
  let remainingBoxes = totalBoxes;
  let boxes = [];
  for (let cabinNumber = 1; remainingBoxes > 0; cabinNumber++) {
    const boxesInThisCabin = Math.min(boxesPerCabin, remainingBoxes);
    for (let boxNumber = 1; boxNumber <= boxesInThisCabin; boxNumber++) {
      let box = {
        _id: body.machineId + "_" + "C" + cabinNumber + "_" + boxNumber,
        name: "C" + cabinNumber + "," + boxNumber,
        cabinNumber: cabinNumber,
        boxNumber: boxNumber,
        machineId: body.machineId,
        created: moment().utc().add(config.timeDifference, "hours"),
        updated: moment().utc().add(config.timeDifference, "hours"),
      };
      boxes.push(box);
    }
    remainingBoxes -= boxesInThisCabin;
  }
  // console.log('boxes:', boxes);
  // Use the insertMany() method to perform bulk insert
  boxes = await Boxes.insertMany(boxes);
  return boxes;
};
/*
 * Create new boxes in bulk.
 */
let createBulkByCabin = async (body) => {
  const boxesPerCabin = 12;

  let boxesToAdd = body.boxes;
  let boxes = [];
  boxesToAdd.forEach((boxToAdd) => {
    if (boxToAdd.boxNumber != 0) {
      let box = {
        _id:
          body.machineId +
          "_" +
          "C" +
          boxToAdd.cabinNumber +
          "_" +
          boxToAdd.boxNumber,
        name: "C" + boxToAdd.cabinNumber + "," + boxToAdd.boxNumber,
        cabinNumber: boxToAdd.cabinNumber,
        boxNumber: boxToAdd.boxNumber,
        machineId: body.machineId,
        created: moment().utc().add(config.timeDifference, "hours"),
        updated: moment().utc().add(config.timeDifference, "hours"),
      };
      boxes.push(box);
    } else {
      for (let boxNumber = 1; boxNumber <= boxesPerCabin; boxNumber++) {
        let box = {
          _id:
            body.machineId + "_" + "C" + boxToAdd.cabinNumber + "_" + boxNumber,
          name: "C" + boxToAdd.cabinNumber + "," + boxNumber,
          cabinNumber: boxToAdd.cabinNumber,
          boxNumber: boxNumber,
          machineId: body.machineId,
          created: moment().utc().add(config.timeDifference, "hours"),
          updated: moment().utc().add(config.timeDifference, "hours"),
        };
        boxes.push(box);
      }
    }
  });
  // console.log('boxes:', boxes);

  // Use the insertMany() method to perform bulk insert
  boxes = await Boxes.insertMany(boxes);

  return boxes;
};
/*
 * Get all boxes.
 */
const get = async (skip = 0, limit = 1000) => {
  let boxes = await Boxes.find({ isDeleted: false })
    .sort({ created: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  for (let i = 0; i < boxes.length; i++) {
    boxes[i] = boxes[i].toJSON();
  }
  return boxes;
};

/*
 * Get box by boxId.
 */
const getById = async (boxId, preferredCurrency) => {
  let box = await Boxes.findOne({ _id: boxId });

  if (!box || box.isDeleted) {
    return Promise.reject({
      message: "Box not found.",
      statusCode: 404,
    });
  }

  box = box.toJSON();

  if (box.productId != null) {
    const pref = preferredCurrency || "SAR";
    const prod = await productssRepo.getById(box.productId, pref);
    const ok =
      prod &&
      typeof prod === "object" &&
      prod._id != null &&
      String(prod._id).length > 0;
    box.product = ok ? prod : null;
  }

  return box;
};

const getBoxesWithProduct = async (boxIds) => {
  try {
    const boxes = await Boxes.find({ _id: { $in: boxIds } });

    if (!boxes || boxes.length === 0) {
      return Promise.reject({
        message: "No boxes found.",
        statusCode: 404,
      });
    }

    const populatedBoxes = await Boxes.populate(boxes, { path: "productId" });

    return populatedBoxes;
  } catch (error) {
    return Promise.reject(error);
  }
};

/*
 * Get all boxes by machineId.
 */
const getByMachineId = async (machineId) => {
  let boxes = await Boxes.find({ machineId: machineId, isDeleted: false }).sort(
    { cabinNumber: 1, boxNumber: 1 },
  );
  // console.log('boxes:', boxes);
  for (let i = 0; i < boxes.length; i++) {
    boxes[i] = boxes[i].toJSON();

    if (boxes[i].productId != null)
      boxes[i].product = await productssRepo.getById(boxes[i].productId);
  }
  return boxes;
};

/*
 * Toggle box by id.
 * Toggle off means that the box is Inactive.
 */
let toggle = async (boxId) => {
  let box = await Boxes.findOne({ _id: boxId });

  if (!box || box.isDeleted) {
    return Promise.reject({
      message: "Box not found.",
      statusCode: 404,
    });
  }

  // Update property.
  box.isActive = box.isActive == true ? false : true;
  box.updated = moment().utc().add(config.timeDifference, "hours");

  box = await box.save();
  box = box.toJSON();
  return box;
};

/*
 * Update box by id.
 */
let update = async (boxId, properties) => {
  let box = await Boxes.findOne({ _id: boxId });

  // Return error if box not found.
  if (!box || box.isDeleted) {
    return Promise.reject({
      message: "Box not found.",
      statusCode: 404,
    });
  }

  // Update all properties.
  for (let property in properties) {
    box[property] = properties[property];
  }
  box.updated = moment().utc().add(config.timeDifference, "hours");

  box = await box.save();
  box = box.toJSON();
  return box;
};

function mapDecimalToBoxes(decimal) {
  const binaryString = (decimal >>> 0).toString(2);
  const includedBoxNumbers = [];
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === "1") {
      includedBoxNumbers.push(binaryString.length - i);
    }
  }
  return includedBoxNumbers;
}

/*
 * Update box by id.
 */
let updateLockerStatus = async (event) => {
  await updateStatus(event, "status");
};

/*
 * Update filled box by id.
 */
let updateFilledStatus = async (event) => {
  await updateStatus(event, "isFilled");
};

/*
 * Update box parameter by id.
 */
let updateStatus = async (event, parameter) => {
  console.log("updateStatus event:", event);
  let boxIds = event.boxes;

  const updateCondition = { machineId: event.machineId };
  let update = { $set: { [parameter]: event.value } };
  if (boxIds[0] === "all") {
    if (event.value == "1") {
      if (event.purchaseId)
        update = { $set: { [parameter]: event.value /*, productId: null*/ } };
      else update = { $set: { [parameter]: event.value } };
    }
    await Boxes.updateMany(updateCondition, update);
  } else {
    if (boxIds.length > 0) {
      boxIds.forEach(async (boxId) => {
        let split = boxId.split("_");
        let cabinNumber = split[0];
        let boxNumbers = split[1];
        let updates = [];
        if (event.machineType == "direct") {
          updates.push({
            condition: {
              _id: event.machineId + "_C" + cabinNumber + "_" + boxNumbers,
            },
            setValue: { [parameter]: event.value },
          });
        } else {
          const includedBoxes = mapDecimalToBoxes(boxNumbers);
          includedBoxes.reverse();
          for (let i = 0; i < includedBoxes.length; i++) {
            let update = {
              condition: {
                _id:
                  event.machineId + "_C" + cabinNumber + "_" + includedBoxes[i],
              },
              setValue: { [parameter]: event.value },
            };
            // if (
            //   event.type == "LOCKER" &&
            //   event.value == "1" &&
            //   event.purchaseId
            // ) {
            //   update = {
            //     condition: {
            //       _id:
            //         event.machineId +
            //         "_C" +
            //         cabinNumber +
            //         "_" +
            //         includedBoxes[i],
            //     },
            //     setValue: { [parameter]: event.value /*, productId: null*/ },
            //   };
            // }
            updates.push(update);
          }
        }

        try {
          console.log("[updateStatus] updates", updates);
          const updatePromises = updates.map(async (update) => {
            const { condition, setValue } = update;
            await Boxes.updateMany(condition, { $set: setValue });
          });

          await Promise.all(updatePromises);
        } catch (error) {
          console.error("Error updating documents:", error);
        }
      });
    }
  }
};

/*
 * Fill box with product.
 */
let updateBox = async (boxId, properties) => {
  let box = await Boxes.findOne({ _id: boxId });

  // Return error if box not found.
  if (!box || box.isDeleted) {
    return Promise.reject({
      message: "Box not found.",
      statusCode: 404,
    });
  }
  if (box.productId != properties.productId) {
    box.productId = properties.productId;
    box.prodcutQunatity = 0;
  } else {
    box.isFilled = true;

    let oldProdcutQunatity = box.prodcutQunatity;
    if (properties.change == "Add")
      box.prodcutQunatity = oldProdcutQunatity + properties.prodcutQunatity;
    else if (properties.change == "Remove")
      box.prodcutQunatity = oldProdcutQunatity - properties.prodcutQunatity;
  }

  box.updated = moment().utc().add(config.timeDifference, "hours");

  box = await box.save();
  box = box.toJSON();

  return box;
};

/*
 * Fill box with product.
 */
let emptyBoxesByMachine = async (machineId) => {
  const updateCondition = { machineId: machineId };
  const update = { $set: { productId: null } };
  // const update = { $set: { productId: null, isFilled: false } };

  await Boxes.updateMany(updateCondition, update);
  return {};
};

/*
 * Fill box with product.
 */
// let fillProductInBox = async (productId, boxes) => {
//     // let body = {
//     //     machineId: 'machineId',
//     //     boxIds: ['all'] / ['boxId1', 'boxId2']
//     // }

//     let allBoxes = await getByMachineId(boxes.machineId);
//     // console.log('allBoxes:', allBoxes);

//     let tempBoxes = [];
//     if (boxes.boxIds[0] === 'all') {
//         const updateCondition = { machineId: boxes.machineId };
//         const update = { $set: { productId: productId, isFilled: true } };

//         await Boxes.updateMany(updateCondition, update);

//         tempBoxes = await getByMachineId(boxes.machineId);
//     } else {
//         boxes.boxIds.forEach(async (boxeId) => {
//             console.log('boxeId:', boxeId)
//             const updateCondition = { machineId: boxes.machineId, name: boxeId };
//             const update = { $set: { productId: productId, isFilled: true } };

//             await Boxes.updateOne(updateCondition, update);

//             for (const box of allBoxes) {
//                 if (box.name === boxeId) {
//                     console.log('box:', box)
//                     tempBoxes.push(box);
//                 }
//             }
//         });
//     }

//     console.log('tempBoxes:', tempBoxes)
//     return tempBoxes;
// }
// let fillProductInBox = async (productId, boxes) => {
//   let allBoxes = await getByMachineId(boxes.machineId);
//   let tempBoxes = [];

//   if (boxes.boxIds[0] === 'all') {
//     const updateCondition = { machineId: boxes.machineId };
//     const update = { $set: { productId: productId, isFilled: true } };

//     await Boxes.updateMany(updateCondition, update);

//     tempBoxes = await getByMachineId(boxes.machineId);
//   } else {
//     // Create an array of async functions to update boxes and push them into tempBoxes
//     const boxPromises = boxes.boxIds.map(async (boxeId) => {
//       console.log('boxeId:', boxeId);
//       const updateCondition = { machineId: boxes.machineId, name: boxeId };
//       const update = { $set: { productId: productId, isFilled: true } };

//       await Boxes.updateOne(updateCondition, update);

//       const box = allBoxes.find(box => box.name === boxeId);
//       console.log('box:', box);

//       if (box) {
//         tempBoxes.push(box);
//       }
//     });

//     // Wait for all the async updates to complete
//     await Promise.all(boxPromises);
//   }

//   console.log('tempBoxes:', tempBoxes);
//   return tempBoxes;
// };
// let fillProductInBox = async (productId, boxes) => {
//     // let body = {
//     //     machineId: 'machineId',
//     //     boxIds: ['all'] / ['boxId1', 'boxId2']
//     // }

//     let tempBoxes = [];
//     if (boxes.boxIds[0] === 'all') {
//         const updateCondition = { machineId: boxes.machineId };
//         const update = { $set: { productId: productId, isFilled: true } };

//         await Boxes.updateMany(updateCondition, update);

//         tempBoxes = await getByMachineId(boxes.machineId);
//     } else {
//         boxes.boxIds.forEach(async (boxeId) => {
//             console.log('boxeId:', boxeId)
//             const updateCondition = { _id: boxeId };
//             const update = { $set: { productId: productId, isFilled: true } };

//             await Boxes.updateOne(updateCondition, update);

//             await tempBoxes.push(getById(boxeId));
//         });
//     }

//     console.log('tempBoxes:', tempBoxes)
//     return tempBoxes;
// }

let fillProductInBox = async (productId, boxes) => {
  let tempBoxes = [];

  if (boxes.boxIds[0] === "all") {
    const updateCondition = { machineId: boxes.machineId };
    const update = { $set: { productId: productId, isActive: true } };

    await Boxes.updateMany(updateCondition, update);

    tempBoxes = await getByMachineId(boxes.machineId);
  } else {
    // Create an array of async functions to update boxes and push them into tempBoxes
    const boxPromises = boxes.boxIds.map(async (boxId) => {
      const updateCondition = { _id: boxId };
      const update = { $set: { productId: productId, isActive: true } };

      await Boxes.updateOne(updateCondition, update);

      const box = await getById(boxId);

      return box;
    });

    // Wait for all the async updates to complete
    tempBoxes = await Promise.all(boxPromises);
  }
  return tempBoxes;
};

/*
 * Delete box by id.
 */
let remove = async (boxId) => {
  let box = update(boxId, { isDeleted: true });
  return box;
};

const MQTT_BOXES_PER_CABIN = 12;

/** Same cabin/slot layout as createBulk for MQTT machines. */
const getMqttBoxSlots = (count) => {
  const slots = [];
  let remaining = count;

  for (let cabinNumber = 1; remaining > 0; cabinNumber++) {
    const inCabin = Math.min(MQTT_BOXES_PER_CABIN, remaining);
    for (let boxNumber = 1; boxNumber <= inCabin; boxNumber++) {
      slots.push({ cabinNumber, boxNumber });
    }
    remaining -= inCabin;
  }

  return slots;
};

const mqttSlotKey = ({ cabinNumber, boxNumber }) =>
  `${cabinNumber}_${boxNumber}`;

let modifyBoxes = (...args) => {
  const type = MachineTypes[args.pop()];
  console.log("type", type);

  return modifyBoxesObject[type](...args);
};

const modifyBoxesObject = {
  Direct: async (machineId, oldBoxes, newBoxes, operation, type) => {
    if (operation == "add") {
      let boxesToAdd = [];
      for (let i = oldBoxes + 1; i <= newBoxes; i++)
        boxesToAdd.push({ cabinNumber: 1, boxNumber: i });
      console.log("boxesToAdd", boxesToAdd);

      if (boxesToAdd.length > 0)
        await createBulkByCabin({ machineId: machineId, boxes: boxesToAdd });
    } else {
      let boxesToRemove = [];
      for (let i = oldBoxes; i > newBoxes; i--)
        boxesToRemove.push({ cabinNumber: 1, boxNumber: i });
      if (boxesToRemove.length > 0)
        await Boxes.deleteMany({ machineId: machineId, $or: boxesToRemove });
    }
  },
  MQTT: async (machineId, _oldBoxes, newBoxes) => {
    const targetSlots = getMqttBoxSlots(newBoxes);
    const targetKeys = new Set(targetSlots.map(mqttSlotKey));

    const existingBoxes = await Boxes.find({ machineId, isDeleted: false });
    const existingKeys = new Set(
      existingBoxes.map((box) => mqttSlotKey(box)),
    );

    const boxesToAdd = targetSlots.filter(
      (slot) => !existingKeys.has(mqttSlotKey(slot)),
    );
    const boxesToRemove = existingBoxes.filter(
      (box) => !targetKeys.has(mqttSlotKey(box)),
    );

    if (boxesToAdd.length > 0) {
      await createBulkByCabin({ machineId, boxes: boxesToAdd });
    }

    if (boxesToRemove.length > 0) {
      await Boxes.deleteMany({
        machineId,
        $or: boxesToRemove.map(({ cabinNumber, boxNumber }) => ({
          cabinNumber,
          boxNumber,
        })),
      });
    }
  },
};
modifyBoxesObject.Bluetooth = modifyBoxesObject.Direct;
modifyBoxesObject.Bluetooth_4 = modifyBoxesObject.Direct;
modifyBoxesObject.kaisijin_12 = modifyBoxesObject.Direct;
modifyBoxesObject.kaisijin_24 = modifyBoxesObject.Direct;
modifyBoxesObject.genai = modifyBoxesObject.Direct;

/*
 * Delete boxes by machineId.
 */
let removeByMachine = async (machineId) => {
  let box = await Boxes.deleteMany({ machineId: machineId });

  return box;
};

module.exports = {
  create,
  createBulk,
  toggle,
  get,
  getById,
  createBulkDirect,
  createBulkBluetooth2,
  getBoxesWithProduct,
  getByMachineId,
  update,
  updateLockerStatus,
  updateFilledStatus,
  updateBox,
  fillProductInBox,
  emptyBoxesByMachine,
  // addProductToBox,
  // removeProductToBox,
  remove,
  removeByMachine,
  modifyBoxes,
};
