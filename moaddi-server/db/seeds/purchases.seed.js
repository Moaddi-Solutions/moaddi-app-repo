const Purchase = require("../../app/data/models/purchases");
const ids = require("./ids");

module.exports = async function seedPurchases() {
  await Purchase.deleteMany({});

  await Purchase.insertMany([
    {
      _id: ids.purchases.completed,
      customerId: ids.users.customer,
      machineId: ids.machines.one,
      items: [
        {
          machineId: ids.machines.one,
          productId: ids.products.water,
          boxId: ids.boxes.m1_1,
          boxStatus: true,
        },
      ],
      price: 9.78,
      preferredCurrency: "SAR",
      status: "Completed",
      invoiceId: "inv_seed_completed_001",
      paymentProvider: "stripe",
    },
    {
      _id: ids.purchases.paymentDone,
      customerId: ids.users.customer,
      machineId: ids.machines.one,
      items: [
        {
          machineId: ids.machines.one,
          productId: ids.products.snack,
          boxId: ids.boxes.m1_2,
          boxStatus: false,
        },
      ],
      price: 51.75,
      preferredCurrency: "EGP",
      status: "PaymentDone",
      invoiceId: "cs_seed_paymentdone_001",
      paymentProvider: "stripe",
    },
  ]);

  console.log("Seeded purchases: 2 (Completed, PaymentDone)");
};
