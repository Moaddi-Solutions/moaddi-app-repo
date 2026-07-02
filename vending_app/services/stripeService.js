/**
 * Stripe Service
 * Handles Stripe payment configuration and result handling
 */

/**
 * Get Stripe Publishable Key from environment
 */
export const getStripePublishableKey = () => {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error("🔐 [STRIPE] Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable");
  }
  return key;
};

/**
 * Build Stripe Payment Config
 */
export const buildStripePaymentConfig = (data) => {
  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
    publishableKey: data.publishableKey || getStripePublishableKey(),
    amount: data.amount, // smallest unit (cents for USD, fils for SAR)
    currency: data.currency || "SAR",
    description: data.description || "",
    metadata: data.metadata || {},
  };
};

/**
 * Handle Stripe result
 */
export const handleStripePaymentResult = (paymentResult) => {
  console.log("💳 [STRIPE RESULT]", paymentResult);

  // SUCCESS
  if (paymentResult?.success) {
    return {
      success: true,
      status: "paid",
      data: paymentResult,
    };
  }

  // ERRORS
  if (paymentResult?.error) {
    return {
      success: false,
      error: paymentResult.error.message || "Payment error",
      data: paymentResult,
    };
  }

  if (paymentResult?.status === "requires_action") {
    return {
      success: false,
      status: "requires_action",
      error: "Additional authentication required",
      data: paymentResult,
    };
  }

  return {
    success: false,
    error: "Unknown error",
    data: paymentResult,
  };
};
