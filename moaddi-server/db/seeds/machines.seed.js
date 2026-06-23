const Machine = require("../../app/data/models/machines");
const { PAYMENT_PROVIDER } = require("../../app/payment/constants");
const ids = require("./ids");

module.exports = async function seedMachines() {
  await Machine.deleteMany({});

  await Machine.insertMany([
    {
      _id: ids.machines.one,
      mac: "AA:BB:CC:DD:EE:01",
      name: "MQTT Vending Unit 1",
      boxes: 3,
      qrCode: "MACHINE_QR_001",
      type: 1, // MQTT
      password: null,
      vendorId: ids.users.vendor,
      shopId: ids.shops.main,
      groupId: ids.groups.main,
      specialProducts: {
        [ids.products.water]: { price: 1.99 },
      },
      isConnected: true,
      isAssigned: true,
      isActive: true,
      isDeleted: false,
      paymentProvider: PAYMENT_PROVIDER.STRIPE,
    },
    {
      _id: ids.machines.two,
      mac: "AA:BB:CC:DD:EE:02",
      name: "Direct Vending Unit 2",
      boxes: 2,
      qrCode: "MACHINE_QR_002",
      type: 0, // Direct
      password: "machine2pin",
      vendorId: ids.users.vendor,
      shopId: ids.shops.branch,
      groupId: ids.groups.secondary,
      isConnected: true,
      isAssigned: true,
      isActive: true,
      isDeleted: false,
      paymentProvider: PAYMENT_PROVIDER.MOYASAR,
    },
  ]);

  console.log("Seeded machines: 2");
};
