"use strict";

/**
 * Webhook router — must be mounted BEFORE the global bodyParser.json()
 * middleware so that each handler can receive the raw request body required
 * for signature verification.
 *
 * Mount in app.js:
 *   app.use("/api/v1", require("./routes/webhooks"));
 */

const crypto = require("crypto");
const express = require("express");
const { stripeStrategy, moyasarStrategy } = require("../payment");

const router = express.Router();

router.post(
  "/purchases/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => stripeStrategy.handleWebhook(req, res).catch(next),
);

router.post(
  "/purchases/webhook/moyasar",
  express.json({ limit: "5mb" }),
  (req, res, next) => moyasarStrategy.handleWebhook(req, res).catch(next),
);

/**
 * MyFatoorah Webhook V2 — PAYMENT_STATUS_CHANGED.
 * Set MYFATORA_WEBHOOK_SECRET in the portal; header `myfatoorah-signature` (HMAC-SHA256, base64).
 * See: https://docs.myfatoorah.com/docs/webhook-signature
 * Always re-verifies with GetPaymentStatus in applyMyFatoraIpn.
 */
const verifyMyFatoorahPaymentStatusSignature = (
  body,
  signatureHeader,
  secret,
) => {
  if (!secret || !signatureHeader) return false;
  const { Data } = body;
  if (!Data?.Invoice || !Data?.Transaction) return false;
  const inv = Data.Invoice;
  const txn = Data.Transaction;
  const ext =
    inv.ExternalIdentifier != null ? String(inv.ExternalIdentifier) : "";
  const str = `Invoice.Id=${inv.Id},Invoice.Status=${inv.Status},Transaction.Status=${txn.Status},Transaction.PaymentId=${txn.PaymentId},Invoice.ExternalIdentifier=${ext}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(str, "utf8");
  const expected = hmac.digest("base64");
  const a = Buffer.from(String(expected).trim());
  const b = Buffer.from(String(signatureHeader).trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

router.post(
  "/purchases/webhook/myfatoora",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      let body;
      try {
        body = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ message: "Invalid JSON." });
      }

      const secret = process.env.MYFATORA_WEBHOOK_SECRET;
      const sig =
        req.headers["myfatoorah-signature"] ||
        req.headers["MyFatoorah-Signature"] ||
        req.headers["Myfatoorah-Signature"];

      if (body?.Event?.Code === 1) {
        if (secret) {
          if (!verifyMyFatoorahPaymentStatusSignature(body, sig, secret)) {
            return res
              .status(401)
              .json({ message: "Invalid or missing MyFatoorah-Signature." });
          }
        } else {
          console.warn(
            "[myfatoora-ipn] MYFATORA_WEBHOOK_SECRET not set; using GetPaymentStatus only",
          );
        }
      }

      if (body?.Event?.Code !== 1) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const st = body?.Data?.Invoice?.Status;
      const txSt = body?.Data?.Transaction?.Status;
      if (st !== "PAID" || txSt !== "SUCCESS") {
        return res.status(200).json({ received: true, skipped: true });
      }

      const invoiceId = body?.Data?.Invoice?.Id;
      if (invoiceId == null || invoiceId === "") {
        return res.status(400).json({ message: "Missing Data.Invoice.Id" });
      }

      const purchasesRepo = require("../data/repos/purchases");
      await purchasesRepo.applyMyFatoraIpn(invoiceId);
      return res.status(200).json({ received: true });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
