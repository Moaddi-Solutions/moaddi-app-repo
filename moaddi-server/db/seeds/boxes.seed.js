const Box = require("../../app/data/models/boxes");
const ids = require("./ids");

module.exports = async function seedBoxes() {
  await Box.deleteMany({});

  await Box.insertMany([
    {
      _id: ids.boxes.m1_1,
      name: "Cabin 1 - Slot 1",
      cabinNumber: 1,
      boxNumber: 1,
      machineId: ids.machines.one,
      productId: ids.products.water,
      status: false,
      isFilled: true,
      isActive: true,
      isDeleted: false,
    },
    {
      _id: ids.boxes.m1_2,
      name: "Cabin 1 - Slot 2",
      cabinNumber: 1,
      boxNumber: 2,
      machineId: ids.machines.one,
      productId: ids.products.snack,
      status: false,
      isFilled: true,
      isActive: true,
      isDeleted: false,
    },
    {
      _id: ids.boxes.m1_3,
      name: "Cabin 2 - Slot 1",
      cabinNumber: 2,
      boxNumber: 1,
      machineId: ids.machines.one,
      productId: ids.products.energy,
      status: false,
      isFilled: true,
      isActive: true,
      isDeleted: false,
    },
    {
      _id: ids.boxes.m2_1,
      name: "Cabin 1 - Slot 1",
      cabinNumber: 1,
      boxNumber: 1,
      machineId: ids.machines.two,
      productId: ids.products.water,
      status: false,
      isFilled: true,
      isActive: true,
      isDeleted: false,
    },
    {
      _id: ids.boxes.m2_2,
      name: "Cabin 1 - Slot 2",
      cabinNumber: 1,
      boxNumber: 2,
      machineId: ids.machines.two,
      productId: null,
      status: false,
      isFilled: false,
      isActive: true,
      isDeleted: false,
    },
  ]);

  console.log("Seeded boxes: 5");
};
