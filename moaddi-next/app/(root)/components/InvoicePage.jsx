"use client";

import StrapiImage from "@/(root)/components/StrapiImage";
import { useCart } from "@/(root)/context/cart-provider";
import { Alert, AlertDescription, AlertTitle } from "@/../components/ui/alert";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { getProductPricing } from "@/../lib/invoice-purchase";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Package,
  PrinterIcon as Print,
  ReceiptText,
  Store,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "react-qr-code";

const sellerAddress = `6563 Al Makhzoumi Street
Al Yarmouk
Riyadh 13243
SAU`;

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
  const t = useTranslations("Invoice");
  const locale = useLocale();
  const { user } = useCart();
  const purchaseCustomer = Array.isArray(purchase.customer)
    ? purchase.customer[0]
    : purchase.customer;
  const buyer = purchaseCustomer ?? user;
  const currency = purchase.preferredCurrency ?? "SAR";
  const lineItems = buildInvoiceItems(purchase, currency, t("productFallback"));
  const chargedTotal = Number(purchase.price);
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.netUnitPrice,
    0,
  );
  const totalTax = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.taxAmount,
    0,
  );
  const computedTotal = subtotal + totalTax;

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="bg-background py-6 sm:py-8 lg:py-10">
      <div className="print-area mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 sm:px-6 lg:px-8">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{error.status}</AlertTitle>
            <AlertDescription>
              {error.code} : {error.message}
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-border/80 bg-card" size="sm">
          <CardHeader>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary-text">
                    <ReceiptText aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <CardDescription className="font-black uppercase tracking-[0.16em] text-primary-text">
                      {t("title")}
                    </CardDescription>
                    <CardTitle className="truncate text-2xl font-black sm:text-3xl">
                      {number}
                    </CardTitle>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <p className="max-w-2xl text-sm font-semibold text-muted-foreground">
                  {t("subtitle")}
                </p>
              </div>

              <div className="non-print-area flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={handlePrint}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Print data-icon="inline-start" aria-hidden="true" />
                  {t("printInvoice")}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card className="border-border/80 bg-card" size="sm">
              <CardContent className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="min-w-0">
                  <StrapiImage
                    className="mb-4 h-14 w-auto max-w-44 object-contain rounded-2xl"
                    src={logoUrl}
                    alt="Moaddi"
                  />
                  <div className="grid gap-2 text-sm">
                    <DetailLine
                      icon={Building2}
                      label={t("seller")}
                      value={process.env.NEXT_PUBLIC_SELLER_NAME || "Moaddi"}
                    />
                    <DetailLine
                      icon={ReceiptText}
                      label={t("vat")}
                      value={process.env.NEXT_PUBLIC_SELLER_VAT_NUMBER || "-"}
                    />
                    <DetailLine
                      icon={MapPin}
                      label={t("address")}
                      value={sellerAddress}
                    />
                  </div>
                </div>

                <div
                  className="flex justify-center rounded-xl border border-border/80 bg-background p-4"
                  aria-label={t("qrCodeAriaLabel")}
                >
                  <QRCode className="size-28 sm:size-32" value={qrCode} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <InfoCard
                title={t("customer")}
                icon={User}
                rows={[
                  [t("name"), buyer?.name ?? t("customerFallback")],
                  [t("phone"), buyer?.phone ?? buyer?.username ?? buyer?._id ?? "-"],
                ]}
              />
              <InfoCard
                title={t("machine")}
                icon={Store}
                rows={[
                  [t("shop"), purchase.shop?.name ?? "-"],
                  [t("machine"), purchase.machine?.name ?? "-"],
                  [t("location"), purchase.machine?.location ?? "-"],
                ]}
              />
            </div>

            <ItemsCard
              items={lineItems}
              currency={currency}
              subtotal={subtotal}
              totalTax={totalTax}
              total={Number.isFinite(chargedTotal) ? chargedTotal : computedTotal}
              t={t}
            />
          </div>

          <aside className="flex min-w-0 flex-col gap-5">
            <Card className="border-border/80 bg-card" size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <CreditCard aria-hidden="true" />
                  {t("paymentSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <SummaryLine
                  icon={CalendarDays}
                  label={t("created")}
                  value={formatDate(createdDate, locale)}
                />
                <SummaryLine
                  icon={CalendarDays}
                  label={t("expires")}
                  value={formatDate(expiryDate, locale)}
                />
                <SummaryLine
                  icon={Clock}
                  label={t("expiryTime")}
                  value={formatTime(expiryTime)}
                />
                <Separator />
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                    {t("paymentId")}
                  </p>
                  <p className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs font-semibold">
                    {paymentId ?? "-"}
                  </p>
                </div>
                <Separator />
                <div className="rounded-xl bg-accent p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                    {t("totalAmount")}
                  </p>
                  <p className="mt-1 text-3xl font-black tabular-nums">
                    {total || formatMoney(computedTotal, currency)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card" size="sm">
              <CardContent className="flex items-start gap-3 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary-text">
                  <CheckCircle2 aria-hidden="true" />
                </span>
                <div>
                  <p className="font-black">{t("orderReference")}</p>
                  <p className="mt-1 break-all text-sm font-semibold text-muted-foreground">
                    {purchase._id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

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
    </main>
  );
}

function StatusBadge({ status }) {
  if (status === "Paid") {
    return <Badge variant="default">{status}</Badge>;
  }

  if (status === "Pending") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  if (status === "Canceled") {
    return <Badge variant="destructive">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}

function DetailLine({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-primary-text" />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="whitespace-pre-line break-words font-semibold">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, icon: Icon, rows }) {
  return (
    <Card className="border-border/80 bg-card" size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black">
          <Icon aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 break-words font-semibold">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SummaryLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary-text">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ItemsCard({ items, currency, subtotal, totalTax, total, t }) {
  return (
    <Card className="border-border/80 bg-card" size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black">
          <Package aria-hidden="true" />
          {t("invoiceItems")}
        </CardTitle>
        <CardDescription>{t("invoiceItemsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:hidden">
          {items.map((item, index) => (
            <Card key={item.key} className="border-border/80 bg-background" size="sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-primary-text">
                      #{index + 1}
                    </p>
                    <p className="mt-1 truncate font-black">{item.name}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {t("qtyTaxLine", { qty: item.quantity, tax: item.taxRate })}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black tabular-nums">
                    {formatMoney(item.lineTotal, currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border/80 md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[56px] px-4 font-black">{t("colIndex")}</TableHead>
                <TableHead className="font-black">{t("colDescription")}</TableHead>
                <TableHead className="text-end font-black">{t("colQty")}</TableHead>
                <TableHead className="text-end font-black">{t("colUnitPrice")}</TableHead>
                <TableHead className="text-end font-black">{t("colTaxRate")}</TableHead>
                <TableHead className="text-end font-black">{t("colTaxAmount")}</TableHead>
                <TableHead className="px-4 text-end font-black">{t("colTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.key} className="hover:bg-accent/40">
                  <TableCell className="px-4 font-semibold">
                    {index + 1}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="truncate" title={item.name}>
                      {item.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatMoney(item.netUnitPrice, currency)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {item.taxRate}%
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatMoney(item.taxAmount, currency)}
                  </TableCell>
                  <TableCell className="px-4 text-end font-black tabular-nums">
                    {formatMoney(item.lineTotal, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm rounded-xl border border-border/80 bg-background p-4">
            <TotalRow label={t("subtotal")} value={formatMoney(subtotal, currency)} />
            <TotalRow label={t("totalTax")} value={formatMoney(totalTax, currency)} />
            <Separator className="my-3" />
            <TotalRow
              label={t("total")}
              value={formatMoney(total, currency)}
              strong
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TotalRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? "text-xl font-black tabular-nums"
            : "font-semibold tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function buildInvoiceItems(purchase, currency, productFallback) {
  const products = getProductsFromPurchase(purchase);
  const items = Array.isArray(purchase.items) ? purchase.items : [];
  const boxes = Array.isArray(purchase.boxes) ? purchase.boxes : [];

  const rows = products.map((product) => {
    const quantityFromItems = items.filter(
      ({ productId }) => String(productId) === String(product._id),
    ).length;
    const quantityFromBoxes = boxes.filter(
      (box) => String(box?.product?._id ?? box?.productId) === String(product._id),
    ).length;
    const quantity = quantityFromItems || quantityFromBoxes || 1;
    const { price, tax } = getProductPricing(product, currency);

    return {
      key: product._id ?? product.name,
      name: product.name ?? productFallback,
      quantity,
      taxRate: tax,
      grossUnitPrice: price,
    };
  });

  const catalogTotal = rows.reduce(
    (sum, item) => sum + item.grossUnitPrice * item.quantity,
    0,
  );
  const purchaseTotal = Number(purchase.price);
  const scale =
    Number.isFinite(purchaseTotal) && purchaseTotal > 0 && catalogTotal > 0
      ? purchaseTotal / catalogTotal
      : 1;

  return rows.map((item) => {
    const grossUnitPrice = item.grossUnitPrice * scale;
    const taxAmount = grossUnitPrice * (item.taxRate / 100);
    const netUnitPrice = grossUnitPrice - taxAmount;

    return {
      ...item,
      taxAmount,
      netUnitPrice,
      lineTotal: grossUnitPrice * item.quantity,
    };
  });
}

function getProductsFromPurchase(purchase) {
  if (Array.isArray(purchase.products) && purchase.products.length > 0) {
    return purchase.products;
  }

  const products = [];
  const seen = new Set();
  for (const box of purchase.boxes ?? []) {
    const product = box?.product;
    const key = product?._id ?? box?.productId;
    if (!product || !key || seen.has(String(key))) continue;
    seen.add(String(key));
    products.push(product);
  }

  return products;
}

function formatDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "-";
  return String(value).split(".")[0] || "-";
}

function formatMoney(value, currency) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toFixed(2)} ${String(currency).toUpperCase()}`;
}
