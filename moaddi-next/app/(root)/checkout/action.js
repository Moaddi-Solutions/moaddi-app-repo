"use server";

import { client } from "@/../services/myFatoraClient";
import serverDataProvider from "@/../services/serverDataProvider";

const executePayment = async ({ SessionId, purchaseId, totalPrice }) => {
  const {
    data: { price },
  } = await serverDataProvider.getOne("purchases", {
    id: purchaseId,
  });
  // console.log(price, totalPrice);

  if (price != totalPrice)
    return {
      message: "Payment error.",
      errors: { totalPrice: "price not match" },
    };

  const response = await client("ExecutePayment", {
    data: {
      SessionId,
      InvoiceValue: price,
      CallBackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/invoice/success`,
      ErrorUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/invoice/error`,
    },
  });

  await serverDataProvider.update("purchases", {
    id: purchaseId,
    data: {
      invoiceId: response.Data.InvoiceId,
    },
  });

  return response;
};

export { executePayment };
