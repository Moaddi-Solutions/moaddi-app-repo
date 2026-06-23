import BoxGrid from "@/(root)/components/BoxGrid";
import InvoicePage from "@/(root)/components/InvoicePage";
import {
  computeInvoiceTotalTax,
  isMyFatooraPurchase,
  normalizePurchase,
  qrBufferToBase64,
} from "@/../lib/invoice-purchase";
import { client as contentClient } from "@/../services/contentClient";
import { client } from "@/../services/myFatoraClient";
import {
  purchaseAPI,
  purchaseByInvoice,
  purchasesAPI,
} from "@/../services/serverAddresses";
import { getRequest, postRequest } from "@/../services/serverDataProvider";
import { createQRData } from "@zatca/qr";

// const successExample = {
//   IsSuccess: true,
//   Message: "",
//   ValidationErrors: null,
//   Data: {
//     InvoiceId: 5980919,
//     /**
//         "Pending"
//         "Paid"
//         "Canceled"
//      */
//     InvoiceStatus: "Paid",
//     InvoiceReference: "2025292946",
//     CustomerReference: null,
//     CreatedDate: "2025-07-29T13:34:37.617",
//     ExpiryDate: "August 1, 2025",
//     ExpiryTime: "13:34:37.617",
//     InvoiceValue: 80,
//     Comments: null,
//     CustomerName: "Anonymous",
//     CustomerMobile: "+965",
//     CustomerEmail: null,
//     UserDefinedField: null,
//     InvoiceDisplayValue: "80.000 KD",
//     DueDeposit: 79.793,
//     DepositStatus: "Not Deposited",
//     InvoiceItems: [],
//     InvoiceTransactions: [
//       {
//         TransactionDate: "2025-07-29T13:34:51.0533333",
//         PaymentGateway: "VISA/MASTER",
//         ReferenceId: "521010319715",
//         TrackId: "29-07-2025_2896764",
//         TransactionId: "319715",
//         PaymentId: "07075980919289676475",
//         AuthorizationId: "206170",
//         /*
//             InProgress
//             Succss
//             Failed
//             Canceled
//             Authorized
//         */
//         TransactionStatus: "Succss",
//         TransationValue: "80.000",
//         CustomerServiceCharge: "0.000",
//         TotalServiceCharge: "0.180",
//         DueValue: "80.000",
//         PaidCurrency: "KD",
//         PaidCurrencyValue: "80.000",
//         VatAmount: "0.027",
//         IpAddress: "197.164.161.12",
//         Country: "Egypt",
//         Currency: "KD",
//         Error: null,
//         CardNumber: "545301xxxxxx5539",
//         ErrorCode: "",
//         ECI: "02",
//         Card: {
//           NameOnCard: "test test",
//           Number: "545301xxxxxx5539",
//           PanHash:
//             "8efb311e5bea8e001bba9efbfd680719cf4c8d2d047f4e91857ec217b9f9f5e3",
//           ExpiryMonth: "12",
//           ExpiryYear: "25",
//           Brand: "Mastercard",
//           Issuer: "Test Bank",
//           IssuerCountry: "KWT",
//           FundingMethod: "credit",
//         },
//       },
//     ],
//     Suppliers: [],
//   },
// };
// const errorExample = {
//   IsSuccess: true,
//   Message: "",
//   ValidationErrors: null,
//   Data: {
//     InvoiceId: 5980807,
//     /**
//         "Pending"
//         "Paid"
//         "Canceled"
//     */
//     InvoiceStatus: "Pending",
//     InvoiceReference: "2025292869",
//     CustomerReference: null,
//     CreatedDate: "2025-07-29T13:02:05.453",
//     ExpiryDate: "August 1, 2025",
//     ExpiryTime: "13:02:05.453",
//     InvoiceValue: 52,
//     Comments: null,
//     CustomerName: "Anonymous",
//     CustomerMobile: "+965",
//     CustomerEmail: null,
//     UserDefinedField: null,
//     InvoiceDisplayValue: "52.000 KD",
//     DueDeposit: 0,
//     DepositStatus: "Not Deposited",
//     InvoiceItems: [],
//     InvoiceTransactions: [
//       {
//         TransactionDate: "2025-07-29T13:02:05.5466667",
//         PaymentGateway: "VISA/MASTER",
//         ReferenceId: "07075980807289669775",
//         TrackId: "29-07-2025_2896697",
//         TransactionId: "07075980807289669775",
//         PaymentId: "07075980807289669775",
//         AuthorizationId: "07075980807289669775",
//         /*
//             InProgress
//             Succss
//             Failed
//             Canceled
//             Authorized
//         */
//         TransactionStatus: "Failed",
//         TransationValue: "52.000",
//         CustomerServiceCharge: "0.000",
//         TotalServiceCharge: "0.152",
//         DueValue: "52.000",
//         PaidCurrency: "KD",
//         PaidCurrencyValue: "52.000",
//         VatAmount: "0.023",
//         IpAddress: "197.164.161.12",
//         Country: "Egypt",
//         Currency: "KD",
//         Error: "TIMED_OUT : Issuer or switch inoperative",
//         CardNumber: "545721xxxxxx0019",
//         ErrorCode: "MF003",
//         ECI: "02",
//         Card: {
//           NameOnCard: "test test",
//           Number: "545721xxxxxx0019",
//           PanHash:
//             "a177b18a9c430441b22dc75935843f6f4b6c2c17566ebd8cd21b217a2d472ce1",
//           ExpiryMonth: "12",
//           ExpiryYear: "25",
//           Brand: "Mastercard",
//           Issuer: "Test Bank",
//           IssuerCountry: "KWT",
//           FundingMethod: "credit",
//         },
//       },
//     ],
//     Suppliers: [],
//   },
// };

const loadPurchaseForInvoiceKey = async (key) => {
  try {
    return await getRequest(purchaseByInvoice(key));
  } catch {
    return getRequest(purchaseAPI(key));
  }
};

const buildQrCode = ({ timestamp, total, vatTotal }) =>
  qrBufferToBase64(
    createQRData(
      {
        sellerName: process.env.NEXT_PUBLIC_SELLER_NAME,
        vatNumber: process.env.NEXT_PUBLIC_SELLER_VAT_NUMBER,
        timestamp,
        total,
        vatTotal,
      },
      { format: "buffer" },
    ),
  );

const buildProviderInvoice = (purchase, invoiceId) => {
  const createdDate = purchase.created ?? new Date().toISOString();
  const total =
    purchase.price != null
      ? `${Number(purchase.price).toFixed(2)} SAR`
      : "—";
  const isPaid = ["PaymentDone", "Processing", "Completed"].includes(
    purchase.status,
  );
  return {
    Data: {
      InvoiceId: purchase._id,
      InvoiceStatus: isPaid ? "Paid" : "Pending",
      InvoiceReference: purchase._id,
      CreatedDate: createdDate,
      ExpiryDate: createdDate,
      ExpiryTime:
        typeof createdDate === "string"
          ? (createdDate.split("T")[1] ?? "00:00:00")
          : "00:00:00",
      InvoiceValue: purchase.price ?? 0,
      InvoiceDisplayValue: total,
      InvoiceTransactions: [
        {
          PaymentId: purchase.invoiceId ?? invoiceId,
          Error: null,
          ErrorCode: "",
          TransactionStatus: isPaid ? "Succss" : "Pending",
        },
      ],
    },
  };
};

const getData = async ({ paymentId, invoiceId }) => {
  const { logo } = await contentClient("site");

  // MyFatoorah callback with paymentId — always use their API.
  if (paymentId) {
    const invoice = await client("GetPaymentStatus", {
      data: { Key: paymentId, KeyType: "PaymentId" },
    });
    const purchase = normalizePurchase(
      await loadPurchaseForInvoiceKey(String(invoice.Data.InvoiceId)),
    );
    purchase.totalTax = computeInvoiceTotalTax(purchase);
    const qrCode = buildQrCode({
      timestamp: invoice.Data.CreatedDate,
      total: invoice.Data.InvoiceValue.toFixed(2),
      vatTotal: purchase.totalTax.toFixed(2),
    });
    return { logo, purchase, invoice, qrCode };
  }

  const purchase = normalizePurchase(
    await loadPurchaseForInvoiceKey(String(invoiceId)),
  );
  purchase.totalTax = computeInvoiceTotalTax(purchase);

  if (isMyFatooraPurchase(purchase, invoiceId)) {
    const invoice = await client("GetPaymentStatus", {
      data: { Key: invoiceId, KeyType: "InvoiceId" },
    });
    const qrCode = buildQrCode({
      timestamp: invoice.Data.CreatedDate,
      total: invoice.Data.InvoiceValue.toFixed(2),
      vatTotal: purchase.totalTax.toFixed(2),
    });
    return { logo, purchase, invoice, qrCode };
  }

  const invoice = buildProviderInvoice(purchase, invoiceId);
  const qrCode = buildQrCode({
    timestamp: invoice.Data.CreatedDate,
    total: Number(purchase.price ?? 0).toFixed(2),
    vatTotal: purchase.totalTax.toFixed(2),
  });
  return { logo, purchase, invoice, qrCode };
};

const page = async ({ params, searchParams }) => {
  const { status } = await params;
  const { paymentId, invoiceId, show } = await searchParams;
  if (!paymentId && !invoiceId) return <h1>Payment ID is missing.</h1>;

  let data;
  try {
    data = await getData({ paymentId, invoiceId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load invoice data.";
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Invoice unavailable</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    );
  }

  const {
    logo: { src: logoUrl },
    invoice: {
      Data: {
        InvoiceId,
        InvoiceStatus,
        CreatedDate,
        ExpiryDate,
        ExpiryTime,
        InvoiceDisplayValue,
        InvoiceTransactions = [],
      },
    },
    purchase,
    qrCode,
  } = data;
  const {
    PaymentId = purchase.invoiceId ?? invoiceId,
    Error = null,
    ErrorCode = "",
    TransactionStatus = InvoiceStatus === "Paid" ? "Succss" : "Pending",
  } = InvoiceTransactions[0] ?? {};
  const invoicePage = {
    logoUrl,
    purchase,
    qrCode,
    invoice: {
      number: InvoiceId,
      status: InvoiceStatus, // Paid, Pending, Cancelled
      createdDate: CreatedDate,
      expiryDate: ExpiryDate,
      expiryTime: ExpiryTime,
      paymentId: PaymentId,
      total: InvoiceDisplayValue,
      error: Error && {
        message: Error,
        code: ErrorCode,
        status: TransactionStatus,
      },
    },
  };

  if (
    !show &&
    purchase.status == "PaymentDoneRequest" &&
    status == "success" &&
    InvoiceStatus == "Paid"
  ) {
    // Make it PaymentDone
    const boxGrid = await postRequest(`${purchasesAPI()}/complete`, {
      _id: purchase._id,
    });
    return <BoxGrid {...boxGrid} />;
  }

  if (!show && ["PaymentDone", "Processing"].includes(purchase.status)) {
    return (
      <BoxGrid
        _id={purchase._id}
        machineId={purchase.machineId}
        machine={purchase.machine}
        boxes={purchase.boxes}
        status={purchase.status}
      />
    );
  }

  return <InvoicePage {...invoicePage} />;
};

// class ZATCA {
//   #order = {
//     sellerName: 1,
//     VATNumber: 2,
//     timestamp: 3,
//     invoiceAmount: 4,
//     VATAmount: 5,
//   };
//   #output = [];
//   #getTLVForValue = (tagNum, TagValue) => {
//     const tagBuf = Buffer.from(tagNum.toString(), "utf-8");
//     const tagValueLengthBuf = Buffer.from(TagValue.length.toString(), "utf-8");
//     const tagValueBuf = Buffer.from(TagValue.toString(), "utf-8");
//     return Buffer.concat([tagBuf, tagValueLengthBuf, tagValueBuf]);
//   };
//   toBase64() {
//     const qrCodeBuf = Buffer.concat(this.#output);
//     return qrCodeBuf.toString("base64");
//   }
//   sellerName(input) {
//     this.#output.push(this.#getTLVForValue(this.#order.sellerName, input));
//     return this;
//   }
//   VATNumber(input) {
//     // Vat Registration Number must be 15 number
//     this.#output.push(this.#getTLVForValue(this.#order.VATNumber, input));
//     return this;
//   }
//   timestamp(input) {
//     this.#output.push(this.#getTLVForValue(this.#order.timestamp, input));
//     return this;
//   }
//   // total with VAT
//   invoiceAmount(input) {
//     this.#output.push(this.#getTLVForValue(this.#order.invoiceAmount, input));
//     return this;
//   }
//   VATAmount(input) {
//     this.#output.push(this.#getTLVForValue(this.#order.VATAmount, input));
//     return this;
//   }
// }

export default page;
