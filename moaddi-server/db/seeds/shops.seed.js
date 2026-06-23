const Shop = require("../../app/data/models/shops");
const ids = require("./ids");

module.exports = async function seedShops() {
  await Shop.deleteMany({});

  await Shop.insertMany([
    {
      _id: ids.shops.main,
      name: "Main Shop",
      description: "Main retail location for the vending network.",
      image: "/images/shops/main.jpg",
      isActive: true,
      isDeleted: false,
    },
    {
      _id: ids.shops.branch,
      name: "Branch Shop",
      description: "Smaller branch location.",
      image: "/images/shops/branch.jpg",
      isActive: true,
      isDeleted: false,
    },
  ]);

  console.log("Seeded shops: 2");
};
