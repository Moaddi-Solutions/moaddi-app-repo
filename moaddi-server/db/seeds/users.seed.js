const User = require("../../app/data/models/users");
const ids = require("./ids");

module.exports = async function seedUsers() {
  await User.deleteMany({});

  // Plain passwords only — UsersSchema pre("save") hashes once (manual bcrypt here would double-hash).
  const password = "password123";

  const users = [
    {
      _id: ids.users.admin,
      password,
      name: "Admin User",
      role: "Admin",
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      created: new Date("2026-05-23T23:37:33.280Z"),
    },
    {
      _id: ids.users.vendor,
      password,
      name: "Vendor User",
      role: "Vendor",
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      created: new Date("2026-05-23T23:37:33.508Z"),
    },
    {
      _id: ids.users.vendorOsamah,
      password,
      name: "Osamah",
      role: "Vendor",
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      created: new Date("2026-05-24T01:00:56.284Z"),
      updated: new Date("2026-05-24T01:00:56.285Z"),
    },
    {
      _id: ids.users.vendorAhmedV1,
      password,
      name: "ahmed mrsawy v1",
      role: "Vendor",
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      created: new Date("2026-05-24T16:01:25.105Z"),
      updated: new Date("2026-05-24T16:01:25.106Z"),
    },
    {
      _id: ids.users.vendorAhmedV2,
      password,
      name: "ahmed mrsawy v2",
      role: "Vendor",
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      created: new Date("2026-05-24T16:01:43.038Z"),
      updated: new Date("2026-05-24T16:01:43.038Z"),
    },
    {
      _id: ids.users.customer,
      password,
      name: "user",
      role: "Customer",
      otp: 6421,
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      machines: [],
      created: new Date("2026-05-25T00:51:17.140Z"),
      updated: new Date("2026-05-25T00:51:17.140Z"),
    },
    {
      _id: ids.users.vendorDirect,
      password,
      name: "Dirct Vendor",
      role: "Vendor",
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      created: new Date("2026-05-25T01:21:57.118Z"),
      updated: new Date("2026-05-25T01:21:57.118Z"),
    },
    {
      _id: ids.users.vendorRabie,
      password,
      name: "Rabie",
      role: "Vendor",
      preferredCurrency: "SAR",
      isActive: true,
      isDeleted: false,
      created: new Date("2026-05-25T01:32:57.372Z"),
      updated: new Date("2026-05-25T01:32:57.372Z"),
    },
  ];

  for (const user of users) {
    await User.create(user);
  }

  console.log(
    `Seeded ${users.length} users (1 admin, 6 vendors, 1 customer). Password for all: ${password}`
  );
};
