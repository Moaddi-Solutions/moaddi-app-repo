/** Helpers for invoice / post-payment purchase loading. */

/** Unit price (campaign if set, else sale) and tax % from flat or nested product shape. */
export function getProductPricing(product, preferredCurrency = "SAR") {
  const pick = (row) => {
    if (!row || typeof row !== "object") return { price: 0, tax: 0 };
    const sale = Number(row.salePrice);
    const saleOk = Number.isFinite(sale) ? sale : 0;
    const campRaw = row.campaignPrice;
    const camp =
      campRaw != null && campRaw !== "" ? Number(campRaw) : Number.NaN;
    const price = Number.isFinite(camp) ? camp : saleOk;
    const tax = Number(row.tax);
    return { price, tax: Number.isFinite(tax) ? tax : 0 };
  };

  if (
    product?.salePrice != null ||
    product?.campaignPrice != null ||
    product?.tax != null
  ) {
    return pick(product);
  }

  if (product?.localPrice) {
    return pick(product.localPrice);
  }

  return { price: 0, tax: 0 };
}

export function computeInvoiceTotalTax(purchase) {
  const groupedProducts = Object.groupBy(purchase.products, ({ _id }) => _id);
  const pref = purchase.preferredCurrency ?? "SAR";
  return purchase.items.reduce((sum, item) => {
    const product = groupedProducts[item.productId]?.[0];
    if (!product) return sum;
    const { price, tax } = getProductPricing(product, pref);
    return sum + price * (tax / 100);
  }, 0);
}

export function computeInvoiceSubtotal(purchase) {
  const groupedProducts = Object.groupBy(purchase.products, ({ _id }) => _id);
  const pref = purchase.preferredCurrency ?? "SAR";
  return purchase.items.reduce((sum, item) => {
    const product = groupedProducts[item.productId]?.[0];
    if (!product) return sum;
    const { price, tax } = getProductPricing(product, pref);
    const taxAmount = price * (tax / 100);
    return sum + (price - taxAmount);
  }, 0);
}

export function normalizePurchase(purchase) {
  if (!purchase || typeof purchase !== "object") return purchase;
  const machine = Array.isArray(purchase.machine)
    ? purchase.machine[0] ?? null
    : purchase.machine ?? null;
  const shop = Array.isArray(purchase.shop)
    ? purchase.shop[0] ?? null
    : purchase.shop ?? null;
  return { ...purchase, machine, shop };
}

export function isMyFatooraPurchase(purchase, invoiceKey) {
  const provider = String(purchase?.paymentProvider ?? "").toLowerCase();
  if (provider === "myfatoora") return true;
  if (provider === "moyasar" || provider === "stripe") return false;
  return /^\d+$/.test(String(invoiceKey ?? ""));
}

export function qrBufferToBase64(qr) {
  if (typeof qr === "string") return qr;
  if (qr && typeof qr === "object" && qr.type === "Buffer" && Array.isArray(qr.data)) {
    return Buffer.from(qr.data).toString("base64");
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(qr)) {
    return qr.toString("base64");
  }
  return String(qr ?? "");
}
