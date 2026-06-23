"use client";
import {
  CalendarDays,
  Clock,
  Phone,
  PrinterIcon as Print,
  Store,
  User,
  WashingMachine,
} from "lucide-react";

import StrapiImage from "@/(root)/components/StrapiImage";
import { useCart } from "@/(root)/context/cart-provider";
import { Alert, AlertDescription } from "@/../components/ui/alert";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { Separator } from "@/../components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import {
  computeInvoiceSubtotal,
  getProductPricing,
} from "@/../lib/invoice-purchase";
import QRCode from "react-qr-code";

const getStatusColor = (status) => {
  switch (status) {
    case "Paid":
      return "text-lg bg-green-100 text-green-800";
    case "Pending":
      return "text-lg bg-yellow-100 text-yellow-800";
    // case "overdue":
    //   return "text-lg bg-red-100 text-red-800";
    case "Canceled":
      return "text-lg bg-gray-100 text-gray-800";
    default:
      return "text-lg bg-gray-100 text-gray-800";
  }
};

export default function InvoicePage({
  purchase,
  logoUrl,
  qrCode,
  invoice: {
    number,
    status,
    createdDate,
    expiryDate,
    expiryTime,
    paymentId,
    total,
    error,
  },
}) {
  const { user } = useCart();
  // Prefer the buyer carried on the purchase (server lookup) so the invoice is
  // correct for anyone viewing it — e.g. an admin — not just the logged-in cart.
  const purchaseCustomer = Array.isArray(purchase.customer)
    ? purchase.customer[0]
    : purchase.customer;
  const buyer = purchaseCustomer ?? user;
  const address = `6563 Al Makhzoumi Street
  Al Yarmouk
  Riyadh 13243
  SAU`;
  // const address = null;

  // Sample invoice data
  // const invoice = {
  //   number: "INV-2024-001",
  //   status: "paid", // paid, pending, overdue, cancelled
  //   date: "2024-01-15",
  //   dueDate: "2024-02-15",
  //   paymentId: "PAY-789123456",
  //   customer: {
  //     name: "John Smith",
  //     email: "john.smith@example.com",
  //     phone: "+1 (555) 123-4567",
  //     address: "123 Business Street\nSuite 100\nNew York, NY 10001",
  //   },
  //   items: [
  //     {
  //       id: 1,
  //       description: "Web Development Services",
  //       quantity: 40,
  //       unitPrice: 125.0,
  //       vatRate: 0.2,
  //     },
  //     {
  //       id: 2,
  //       description: "UI/UX Design Consultation",
  //       quantity: 8,
  //       unitPrice: 150.0,
  //       vatRate: 0.2,
  //     },
  //     {
  //       id: 3,
  //       description: "Project Management",
  //       quantity: 20,
  //       unitPrice: 100.0,
  //       vatRate: 0.2,
  //     },
  //   ],
  // };

  const subtotal = computeInvoiceSubtotal(purchase);
  const totalTax = Number(purchase.totalTax) || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="print-area mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Error Message */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              <p className="font-bold">{error.status}</p>
              {error.code} : {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice Header */}
        <Card className="mb-6 gap-2">
          <CardHeader className="gap-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-2xl font-bold">
                  Invoice {number}
                </CardTitle>
                <Badge className={getStatusColor(status)}>{status}</Badge>
              </div>
              <div className="non-print-area flex items-center gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Print className="mr-2 h-4 w-4" />
                  Print
                </Button>
                {/* <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button> */}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Customer Details */}
          <Card className="gap-2 md:col-span-2">
            <div className="flex justify-between px-6">
              <div>
                <StrapiImage className="w-48 min-w-48" src={logoUrl} />
                <p>{process.env.NEXT_PUBLIC_SELLER_NAME}</p>
                <p>{process.env.NEXT_PUBLIC_SELLER_VAT_NUMBER}</p>
                {/* <br />
              المتجر : قهوة - شاي - سكر */}
              </div>
              <QRCode className="size-30" value={qrCode} />
              {/* {qrCode} */}
            </div>
            <CardContent className="mt-4 space-y-4">
              <CardTitle className="mb-1 flex items-center gap-2 text-lg">
                <User className="size-5" />
                Customer Details
              </CardTitle>
              <div>
                <h6 className="text-xl font-semibold">{buyer?.name}</h6>
                <div className="text-muted-foreground mt-2 space-y-2 text-sm">
                  {/* <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{invoice.customer.email}</span>
                  </div> */}
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>
                      Phone: {buyer?.phone ?? buyer?.username ?? buyer?._id}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardContent className="mt-4 space-y-4">
              <Separator />
              <CardTitle className="mb-1 flex items-center gap-2 text-lg">
                <Store className="size-5" />
                Shop Details
              </CardTitle>
              <div>
                <div className="text-muted-foreground mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span>
                      {purchase.shop?.name ?? purchase.shop?.[0]?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <WashingMachine className="h-4 w-4" />
                    <span>
                      {purchase.machine?.name ??
                        purchase.machine?.[0]?.name ??
                        "—"}
                    </span>
                  </div>
                </div>
              </div>
              {address && (
                <>
                  <Separator />
                  <div>
                    <h6 className="mb-2 text-lg font-semibold">
                      Billing Address
                    </h6>
                    <div className="text-muted-foreground text-sm whitespace-pre-line">
                      {address}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-muted-foreground">Created Date</span>
                </div>
                <p className="font-medium">
                  {new Date(createdDate).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-muted-foreground">Expiry Date</span>
                </div>
                <p className="font-medium">
                  {new Date(expiryDate).toLocaleDateString()}
                </p>
              </div>

              <div className="non-print-area space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span className="text-muted-foreground">Expiry Time</span>
                </div>
                <p className="font-medium">{expiryTime.split(".")[0]}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Payment ID</p>
                <p className="rounded bg-gray-100 p-2 font-mono text-sm">
                  {paymentId}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Total Amount</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">TAX Rate</TableHead>
                    <TableHead className="text-right">TAX Amount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.products.map((product, i) => {
                      const { _id, name } = product;
                      const quantity = purchase.items.filter(
                        ({ productId }) => productId == _id,
                      ).length;
                      const { price, tax } = getProductPricing(
                        product,
                        purchase.preferredCurrency,
                      );
                      const taxAmount = price * (tax / 100);
                      return (
                        <TableRow key={_id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{name}</TableCell>
                          <TableCell className="text-right">
                            {quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {(price - taxAmount).toFixed(2)} SAR
                          </TableCell>
                          <TableCell className="text-right">{tax}%</TableCell>
                          <TableCell className="text-right">
                            {taxAmount.toFixed(2)} SAR
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(price * quantity).toFixed(2)} SAR
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-2">
              <Separator className="mb-6" />
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{subtotal.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Tax</span>
                    <span>{totalTax.toFixed(2)} SAR</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{(subtotal + totalTax).toFixed(2)} SAR</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .non-print-area,
          .non-print-area * {
            display: none;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            width: 100%;
            position: absolute;
            left: 0;
            top: 8px;
          }
          @page {
            margin: 1in;
          }
        }
      `}</style>
    </div>
  );
}
