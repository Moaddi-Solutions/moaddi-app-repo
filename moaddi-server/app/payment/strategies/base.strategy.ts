import type { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Shared result types
// ---------------------------------------------------------------------------

export interface VerifyPaymentResult {
  error: boolean;
  message?: string;
}

/** My Fatoora and similar may pass `amount` from a prior quote; Stripe derives amount from the stored purchase. */
export interface CreatePaymentArgs {
  purchaseId: string;
  /** If omitted, Stripe uses `purchase.price` server-side (never trust client for payment amount). */
  amount?: number;
  currency?: string;
  /** Authenticated user id; required for Stripe `create-payment-intent` ownership checks. */
  customerId?: string;
}

// ---------------------------------------------------------------------------
// Strategy contract
// ---------------------------------------------------------------------------

/**
 * Contract for payment provider strategies.
 * Each strategy implements only the methods relevant to its provider.
 */
export interface PaymentStrategy {
  /** One of the PAYMENT_PROVIDER constants. */
  name: string;

  /**
   * Initialise a payment on the provider side (e.g. Stripe PaymentIntent).
   * Not required for admin-driven flows like My Fatoora.
   */
  createPayment?: (args: CreatePaymentArgs) => Promise<unknown>;

  /**
   * Server-side verification that a payment actually succeeded before marking
   * the purchase as PaymentDone (e.g. My Fatoora GetPaymentStatus price check).
   * Not required for webhook-driven flows like Stripe.
   */
  verifyPayment?: (request: object) => Promise<VerifyPaymentResult>;

  /**
   * Handle an incoming provider webhook (signature verification + fulfillment).
   * Not required for My Fatoora (no webhook).
   */
  handleWebhook?: (req: Request, res: Response) => Promise<void>;

  /**
   * Retrieve provider invoice details and compose the response returned by
   * GET /purchases/invoiceData/:invoiceId.
   */
  getInvoice?: (invoiceRef: string) => Promise<unknown>;
}
