const Product = require("../../app/data/models/products");
const ids = require("./ids");
const { convertToUSD } = require("../../app/services/currency");

/**
 * Persisted shape matches `products` repo create/update: `currency` + `localPrice` + `usdPrice` buckets.
 */
function buildProduct(opts) {
  const {
    _id,
    name,
    currency,
    originalPrice,
    tax,
    salePrice,
    campaignPrice,
    supportedMachines,
    image,
    barCode,
    isFeatured,
  } = opts;

  const cur = String(currency).trim().toUpperCase();
  const localPrice = {
    originalPrice,
    tax,
    salePrice,
    ...(campaignPrice != null ? { campaignPrice } : {}),
  };
  const usdPrice = {
    originalPrice: convertToUSD(originalPrice, cur),
    tax: convertToUSD(tax, cur),
    salePrice: convertToUSD(salePrice, cur),
    ...(campaignPrice != null
      ? { campaignPrice: convertToUSD(campaignPrice, cur) }
      : {}),
  };

  return {
    _id,
    name,
    currency: cur,
    localPrice,
    usdPrice,
    ...(supportedMachines ? { supportedMachines } : {}),
    image,
    barCode,
    isActive: true,
    isFeatured: !!isFeatured,
    isDeleted: false,
  };
}

module.exports = async function seedProducts() {
  await Product.deleteMany({});

  await Product.insertMany([
    buildProduct({
      _id: ids.products.water,
      name: "Water Bottle 500ml",
      supportedMachines: [ids.machines.one, ids.machines.two],
      currency: "SAR",
      originalPrice: 8.5,
      tax: 1.28,
      salePrice: 9.78,
      campaignPrice: 8.49,
      image: "/images/products/water.png",
      barCode: "6280000000001",
      isFeatured: true,
    }),
    buildProduct({
      _id: ids.products.snack,
      name: "Snack Bar",
      currency: "EGP",
      originalPrice: 45,
      tax: 6.75,
      salePrice: 51.75,
      image: "/images/products/snack.png",
      barCode: "6280000000002",
      isFeatured: false,
    }),
    buildProduct({
      _id: ids.products.energy,
      name: "Energy Drink",
      currency: "USD",
      originalPrice: 5.0,
      tax: 0.75,
      salePrice: 5.75,
      campaignPrice: 5.25,
      image: "/images/products/energy.png",
      barCode: "6280000000003",
      isFeatured: true,
    }),
  ]);

  console.log("Seeded products: 3 (SAR, EGP, USD with localPrice + usdPrice)");
};
