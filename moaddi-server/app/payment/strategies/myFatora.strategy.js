"use strict";

const { createQRData } = require("@zatca/qr");
const { PAYMENT_PROVIDER } = require("../constants");
const Purchases = require("../../data/models/purchases");

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

/**
 * Thin fetch wrapper for the My Fatoora v2 API.
 * @param {string} path
 * @param {{ method?: string, data?: object }} [options]
 * @returns {Promise<any>}
 */
const myFatoraClient = (path, { method = "POST", data } = {}) =>
  fetch(process.env.MYFATORA_API_ENDPOINT + "/v2/" + path, {
    method,
    ...(data && { body: JSON.stringify(data) }),
    headers: {
      Authorization: `Bearer ${process.env.MYFATORA_API_TOKEN}`,
      ...(data && { "Content-Type": "application/json" }),
    },
  }).then((r) => r.json());

/**
 * Server-side GetPaymentStatus (for webhooks and verification).
 * @param {string|number} key
 * @param {"PaymentId"|"InvoiceId"} [keyType="InvoiceId"]
 */
const getPaymentStatus = (key, keyType = "InvoiceId") =>
  myFatoraClient("GetPaymentStatus", { data: { Key: String(key), KeyType: keyType } });

// ---------------------------------------------------------------------------
// verifyPayment
// ---------------------------------------------------------------------------

/**
 * Verify a My Fatoora payment before marking a purchase as PaymentDone.
 *
 * Idempotent: if the purchase already has an invoiceId set the verification
 * is skipped (payment was already verified on a previous call).
 *
 * @param {{ _id: string, invoiceId: string|number }} request
 * @returns {Promise<import('./base.strategy').VerifyPaymentResult>}
 */
const verifyPayment = async (request) => {
  const purchasesRepo = require("../../data/repos/purchases");

  const purchase = await purchasesRepo.getById(request._id);

  if (purchase.invoiceId) return { error: false };

  if (!request.invoiceId) return { error: true, message: "invoiceId missing" };

  const invoice = await myFatoraClient("GetPaymentStatus", {
    data: { Key: request.invoiceId, KeyType: "InvoiceId" },
  });

  if (Number(invoice.Data.InvoiceValue) !== purchase.price) {
    return { error: true, message: "price not match" };
  }

  await purchasesRepo.setProviderFields(request._id, {
    invoiceId: String(request.invoiceId),
  });
  return { error: false };
};

// ---------------------------------------------------------------------------
// getInvoice
// ---------------------------------------------------------------------------

/**
 * Fetch full invoice details from My Fatoora and compose the response for
 * GET /purchases/invoiceData/:invoiceId including ZATCA QR code.
 *
 * @param {string} invoiceId
 * @returns {Promise<{ purchase: object, invoice: object, qrCode: Buffer }>}
 */
const getInvoice = async (invoiceId) => {
  const invoice = await myFatoraClient("GetPaymentStatus", {
    data: { Key: invoiceId, KeyType: "InvoiceId" },
  });

  const pipeline = [
    { $match: { invoiceId: parseInt(invoiceId) } },
    {
      $lookup: {
        from: "products",
        foreignField: "_id",
        localField: "items.productId",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "machines",
        foreignField: "_id",
        localField: "machineId",
        as: "machine",
      },
    },
    {
      $lookup: {
        from: "shops",
        foreignField: "_id",
        localField: "machine.shopId",
        as: "shop",
      },
    },
  ];

  const purchase = (await Purchases.aggregate(pipeline).exec())[0];
  if (!purchase) {
    const err = new Error("Purchase not found for this invoice.");
    err.statusCode = 404;
    throw err;
  }

  const groupedProducts = Object.groupBy(purchase.products, ({ _id }) => _id);
  purchase.totalTax = purchase.items.reduce((sum, item) => {
    const { campaignPrice, salePrice, tax } = groupedProducts[item.productId][0];
    const price = campaignPrice ?? salePrice;
    return sum + price * (tax / 100);
  }, 0);

  const qrCode = createQRData(
    {
      sellerName: process.env.SELLER_NAME || process.env.NEXT_PUBLIC_SELLER_NAME,
      vatNumber: process.env.SELLER_VAT_NUMBER || process.env.NEXT_PUBLIC_SELLER_VAT_NUMBER,
      timestamp: invoice.Data.CreatedDate,
      total: invoice.Data.InvoiceValue.toFixed(2),
      vatTotal: purchase.totalTax.toFixed(2),
    },
    { format: "buffer" }
  );

  const d = invoice?.Data;
  if (!d) {
    const err = new Error("Invalid GetPaymentStatus response: missing Data.");
    err.statusCode = 502;
    throw err;
  }
  const { InvoiceId, InvoiceStatus, CreatedDate, ExpiryDate, ExpiryTime, InvoiceDisplayValue } = d;
  const tx0 = Array.isArray(d.InvoiceTransactions) && d.InvoiceTransactions.length
    ? d.InvoiceTransactions[0]
    : {};
  const { PaymentId, Error, ErrorCode, TransactionStatus } = tx0;

  const parsedInvoice = {
    number: InvoiceId,
    status: InvoiceStatus,
    createdDate: CreatedDate,
    expiryDate: ExpiryDate,
    expiryTime: ExpiryTime,
    paymentId: PaymentId,
    total: InvoiceDisplayValue,
    error: Error && { message: Error, code: ErrorCode, status: TransactionStatus },
  };

  return { purchase, invoice: parsedInvoice, qrCode };
};

// ---------------------------------------------------------------------------
// Strategy object
// ---------------------------------------------------------------------------

/** @type {import('./base.strategy').PaymentStrategy} */
const myFatoraStrategy = {
  name: PAYMENT_PROVIDER.MYFATOORA,
  verifyPayment,
  getInvoice,
  getPaymentStatus,
  myFatoraClient,
};

module.exports = myFatoraStrategy;
