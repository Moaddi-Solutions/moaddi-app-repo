/** Helpers for invoice / purchase history pricing (flat or nested product shape). */

function pickPricing(row) {
  if (!row || typeof row !== "object") return { price: 0, tax: 0 };
  const sale = Number(row.salePrice);
  const saleOk = Number.isFinite(sale) ? sale : 0;
  const campRaw = row.campaignPrice;
  const camp =
    campRaw != null && campRaw !== "" ? Number(campRaw) : Number.NaN;
  const price = Number.isFinite(camp) ? camp : saleOk;
  const tax = Number(row.tax);
  return { price, tax: Number.isFinite(tax) ? tax : 0 };
}

/** Unit price (campaign if set, else sale) and tax % from flat or nested product shape. */
export function getProductPricing(product) {
  if (
    product?.salePrice != null ||
    product?.campaignPrice != null ||
    product?.tax != null
  ) {
    return pickPricing(product);
  }

  if (product?.localPrice) {
    return pickPricing(product.localPrice);
  }

  if (product?.usdPrice) {
    return pickPricing(product.usdPrice);
  }

  return { price: 0, tax: 0 };
}

function groupProductsById(products) {
  return (products ?? []).reduce((acc, product) => {
    (acc[product._id] ??= []).push(product);
    return acc;
  }, {});
}

export function computeInvoiceTotalTax(purchase) {
  const groupedProducts = groupProductsById(purchase.products);
  return (purchase.items ?? []).reduce((sum, item) => {
    const product = groupedProducts[item.productId]?.[0];
    if (!product) return sum;
    const { price, tax } = getProductPricing(product);
    return sum + price * (tax / 100);
  }, 0);
}

export function computeInvoiceSubtotal(purchase) {
  const groupedProducts = groupProductsById(purchase.products);
  return (purchase.items ?? []).reduce((sum, item) => {
    const product = groupedProducts[item.productId]?.[0];
    if (!product) return sum;
    const { price, tax } = getProductPricing(product);
    const taxAmount = price * (tax / 100);
    return sum + (price - taxAmount);
  }, 0);
}

export function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function purchasePreferredCurrency(purchase) {
  const product = purchase?.products?.[0];
  return (
    product?.preferredCurrency ??
    product?.currency ??
    purchase?.preferredCurrency ??
    "sar"
  );
}
