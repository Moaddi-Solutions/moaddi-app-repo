"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { formatProductPrice } from "@/../constants/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import { Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

const getStatusBadge = (status, t) => {
  switch (status) {
    case "Completed":
      return <Badge variant="default">{t("status.completed")}</Badge>;
    case "PaymentDoneRequest":
      return <Badge variant="secondary">{t("status.initiate")}</Badge>;
    case "PaymentDone":
      return <Badge variant="outline">{t("status.paymentDone")}</Badge>;
    // case "cancelled":
    //   return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const PurchaseHistoryData = ({ id, preferredCurrency = "SAR" }) => {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const { isPending, data = [], total = 0 } = useGetManyReference("purchases", {
    id,
    target: "customerId",
    pagination: { page: 1, perPage: 100 },
    // sort: { field: "date", order: "DESC" },
    // filter: {},
  });
  const totalSpent = data.reduce(
    (sum, purchase) => Number(purchase.price || 0) + sum,
    0,
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SummaryCard label={t("totalOrders")} value={isPending ? "..." : total} />
        <SummaryCard
          label={t("totalSpent")}
          value={isPending ? "..." : formatProductPrice(totalSpent, preferredCurrency)}
        />
      </div>

      <Card className="border-border/80 bg-card" size="sm">
        <CardHeader className="gap-1">
          <CardTitle className="text-2xl font-black">{t("purchaseHistory")}</CardTitle>
          <CardDescription>
            {t("purchaseHistoryDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border/80">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 font-black text-muted-foreground">
                  {t("date")}
                </TableHead>
                <TableHead className="hidden md:table-cell">{t("items")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("qty")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("statusColumn")}</TableHead>
                <TableHead className="px-4 text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 px-4 text-center font-semibold text-muted-foreground"
                  >
                    {t("loadingOrders")}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 px-4 text-center font-semibold text-muted-foreground"
                  >
                    {t("noOrdersYetPeriod")}
                  </TableCell>
                </TableRow>
              ) : (
                data.map(
                  ({
                    _id,
                    products,
                    boxes,
                    items,
                    created,
                    price,
                    status,
                    invoiceId,
                  }) => {
                    const productsString = getPurchaseProductNames(
                      products,
                      boxes,
                      t,
                    );
                    return (
                      <TableRow key={_id} className="hover:bg-accent/40">
                        <TableCell className="px-4 font-semibold">
                          {formatDate(created, locale)}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] md:table-cell">
                          <div className="truncate" title={productsString}>
                            {productsString}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {Array.isArray(items) ? items.length : 0}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatProductPrice(price, preferredCurrency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(status, t)}</TableCell>
                        <TableCell className="px-4 text-end">
                          <Link
                            href={`/invoice/success?invoiceId=${encodeURIComponent(String(invoiceId ?? _id))}&show=1`}
                          >
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("viewOrder")}
                            >
                              <Eye aria-hidden="true" />
                            </Button>
                          </Link>
                          {/* <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button> */}
                        </TableCell>
                      </TableRow>
                    );
                  },
                )
              )}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>
    </section>
  );
};
export default function PurchaseHistory({ preferredCurrency }) {
  const { user } = useCart();
  const currency = preferredCurrency ?? user?.preferredCurrency ?? "SAR";
  return (
    user && <PurchaseHistoryData id={user._id} preferredCurrency={currency} />
  );
}

function getPurchaseProductNames(products, boxes, t) {
  const productNames = Array.isArray(products)
    ? products.map(({ name }) => name).filter(Boolean)
    : [];

  if (productNames.length > 0) return productNames.join(", ");

  const boxProductNames = Array.isArray(boxes)
    ? boxes.map((box) => box?.product?.name).filter(Boolean)
    : [];

  return boxProductNames.length > 0
    ? boxProductNames.join(", ")
    : t("moaddiOrder");
}

function SummaryCard({ label, value }) {
  return (
    <Card className="border-border/80 bg-card" size="sm">
      <CardContent className="flex min-h-28 flex-col justify-center p-5">
        <div className="text-2xl font-black tabular-nums">{value}</div>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
