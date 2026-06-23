/**
 * Moyasar Service (SDK-COMPLIANT)
 * Uses official react-native-moyasar-sdk correctly
 */

import {
  PaymentResponse,
  PaymentStatus,
  NetworkError,
  NetworkEndpointError,
  GeneralError,
  UnexpectedError,
  TokenResponse,
  PaymentConfig,
} from "react-native-moyasar-sdk";

/**
 * Build PaymentConfig (IMPORTANT: SDK REQUIREMENT)
 */
export const buildPaymentConfig = (data) => {
  return new PaymentConfig({
    givenId: data.givenId, // UUID v4 recommended
    publishableApiKey: data.publishableApiKey,

    amount: data.amount, // smallest currency unit (e.g. halalas for SAR, cents for USD)
    currency: data.currency || "SAR",

    description: data.description || "",
    metadata: data.metadata || {},

    merchantCountryCode: "SA",
  });
};

/**
 * Handle Moyasar SDK result (OFFICIAL PATTERN)
 */
export const handlePaymentResult = (paymentResult) => {
  console.log("💳 [MOYASAR RESULT]", paymentResult);

  // SUCCESS
  if (paymentResult instanceof PaymentResponse) {
    if (paymentResult.status === PaymentStatus.paid) {
      return {
        success: true,
        status: "paid",
        data: paymentResult,
      };
    }

    if (paymentResult.status === PaymentStatus.failed) {
      return {
        success: false,
        status: "failed",
        data: paymentResult,
      };
    }

    return {
      success: false,
      status: paymentResult.status,
      data: paymentResult,
    };
  }

  // TOKEN FLOW (optional)
  if (paymentResult instanceof TokenResponse) {
    return {
      success: true,
      type: "token",
      data: paymentResult,
    };
  }

  // ERRORS
  if (paymentResult instanceof NetworkError) {
    return { success: false, error: "Network error" };
  }

  if (paymentResult instanceof NetworkEndpointError) {
    return { success: false, error: "Server error" };
  }

  if (paymentResult instanceof GeneralError) {
    return { success: false, error: "Payment error" };
  }

  if (paymentResult instanceof UnexpectedError) {
    return { success: false, error: "Unexpected error" };
  }

  return {
    success: false,
    error: "Unknown error",
    data: paymentResult,
  };
};