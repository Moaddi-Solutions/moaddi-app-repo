import { useLocalSearchParams } from "expo-router";
import { CalendarDays, Phone, User } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, View } from "react-native";
import QRCode from "react-qr-code";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Text } from "~/components/ui/text";
import { useUser } from "~/context/UserContext";
import {
  asNumber,
  computeInvoiceSubtotal,
  computeInvoiceTotalTax,
  getProductPricing,
  purchasePreferredCurrency,
} from "~/lib/invoicePurchase";
import { cn } from "~/lib/utils";

const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return { badge: "bg-green-100", text: "text-lg text-green-800" };
    case "PaymentDoneRequest":
      return { badge: "bg-yellow-100", text: "text-lg text-yellow-800" };
    case "PaymentDone":
      return { badge: "bg-blue-100", text: "text-lg text-blue-800" };
    default:
      return { badge: "bg-gray-100", text: "text-lg text-gray-800" };
  }
};

function InvoicePage({ purchaseData }) {
  const { user } = useUser();
  const { t } = useTranslation();

  const { products, items, created, status, invoiceId, _id } = purchaseData;
  const price = asNumber(purchaseData.price);
  const currency = purchasePreferredCurrency(purchaseData);

  const address = `6563 Al Makhzoumi Street
  Al Yarmouk
  Riyadh 13243
  SAU`;

  const qrCode = useMemo(() => {
    return JSON.stringify({
      invoiceId,
      total: price,
      date: created,
    });
  }, [invoiceId, price, created]);

  const subtotal = useMemo(
    () => computeInvoiceSubtotal(purchaseData),
    [purchaseData]
  );
  const totalTax = useMemo(
    () => computeInvoiceTotalTax(purchaseData),
    [purchaseData]
  );

  const { badge, text } = getStatusColor(status);

  return (
    <ScrollView className="py-6">
      <View className="print-area px-4">
        {/* Invoice Header */}
        <Card className="mb-6">
          <CardHeader className="p-4">
            <View className="flex flex-row justify-between items-center">
              <View className="w-[50%]">
                <CardTitle className="text-2xl font-bold">
                  <Text numberOfLines={1} ellipsizeMode="tail" className="text-xs">
                    {t("id")} {_id}
                  </Text>
                </CardTitle>
              </View>

              <Badge className={badge}>
                <Text className={cn(text, "text-xs")}>{t(status.toLowerCase())}</Text>
              </Badge>
            </View>
          </CardHeader>
        </Card>

        <View className="mb-6">
          {/* Customer Details */}
          <Card>
            <View className="flex items-center">
              <Image
                resizeMode="contain"
                className="w-48 min-w-48 h-20"
                source={require("~/assets/images/icon-new.jpg")}
              />
              <QRCode size={160} value={qrCode} />
              <Text className="mt-4">
                {process.env.EXPO_PUBLIC_SELLER_NAME}
              </Text>
              <Text>{process.env.EXPO_PUBLIC_SELLER_VAT_NUMBER}</Text>
            </View>

            <CardContent className="mt-4">
              <Separator className="mb-4" />
              <CardTitle className="text-lg">{t("customerDetails")}</CardTitle>
              <View className="flex flex-row gap-2 mt-2">
                <User size={18} strokeWidth={1.25} />
                <Text className="text-sm">{user?.name}</Text>
              </View>
              <View className="flex flex-row gap-2 mt-1">
                <Phone size={18} strokeWidth={1.25} />
                <Text className="text-sm">{user?._id}</Text>
              </View>

              <Separator className="my-4" />
              <Text className="mb-2 text-lg font-semibold">
                {t("billingAddress")}
              </Text>
              <Text className="text-muted-foreground text-sm whitespace-pre-line">
                {address}
              </Text>
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          <Card className="gap-2 mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {t("invoiceSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex flex-row gap-2 mt-1">
                <CalendarDays size={18} strokeWidth={1.25} />
                <Text className="text-sm">{t("createdDate")}</Text>
                <Text className="text-muted-foreground text-sm">
                  {new Date(created).toLocaleDateString()}
                </Text>
              </View>

              <Separator className="my-4" />

              <View className="mt-4">
                <Text className="text-muted-foreground text-sm">
                  {t("totalAmount")}
                </Text>
                <Text className="text-2xl font-bold">
                  {price.toFixed(2)} {t(currency)}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Items Table */}
        <Card className="gap-2 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              <Text>{t("invoiceItems")}</Text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View className="overflow-x-auto">
              <ScrollView horizontal>
                <Table>
                  <TableHeader>
                    <TableRow className="flex justify-between">
                      <TableHead className="">
                        <Text>#</Text>
                      </TableHead>
                      <TableHead>
                        <Text>{t("description")}</Text>
                      </TableHead>
                      <TableHead className="text-right">
                        <Text>{t("qty")}</Text>
                      </TableHead>
                      <TableHead className="text-right">
                        <Text>{t("unitPrice")}</Text>
                      </TableHead>
                      <TableHead className="text-right">
                        <Text>{t("taxRate")}</Text>
                      </TableHead>
                      <TableHead className="text-right">
                        <Text>{t("taxAmount")}</Text>
                      </TableHead>
                      <TableHead className="text-right">
                        <Text>{t("total")}</Text>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, i) => {
                        const { _id, name, preferredCurrency, currency: productCurrency } =
                          product;
                        const quantity = items.filter(
                          ({ productId }) => productId == _id
                        ).length;
                        const { price: itemPrice, tax } = getProductPricing(product);
                        const taxAmount = itemPrice * (tax / 100);
                        const lineCurrency =
                          preferredCurrency ?? productCurrency ?? currency;
                        return (
                          <TableRow key={_id} className="flex justify-between">
                            <TableCell className="font-medium">
                              <Text>{i + 1}</Text>
                            </TableCell>
                            <TableCell>
                              <Text>{name}</Text>
                            </TableCell>
                            <TableCell className="text-right">
                              <Text>{quantity}</Text>
                            </TableCell>
                            <TableCell className="text-right">
                              <Text>
                                {(itemPrice - taxAmount).toFixed(2)} {t(lineCurrency)}
                              </Text>
                            </TableCell>
                            <TableCell className="text-right">
                              <Text>
                                {tax}
                                {t("percent")}
                              </Text>
                            </TableCell>
                            <TableCell className="text-right">
                              <Text>
                                {taxAmount.toFixed(2)} {t(lineCurrency)}
                              </Text>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <Text>
                                {(itemPrice * quantity).toFixed(2)} {t(lineCurrency)}
                              </Text>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </ScrollView>
            </View>

            {/* Totals */}
            <View className="mt-6">
              <View className="flex justify-end">
                <View className="w-full">
                  <View className="flex flex-row justify-between text-sm">
                    <Text className="text-muted-foreground">
                      {t("subtotal")}
                    </Text>
                    <Text>
                      {subtotal.toFixed(2)} {t(currency)}
                    </Text>
                  </View>
                  <View className="flex flex-row justify-between text-sm">
                    <Text className="text-muted-foreground">
                      {t("totalTax")}
                    </Text>
                    <Text>
                      {totalTax.toFixed(2)} {t(currency)}
                    </Text>
                  </View>
                  <Separator className="my-2" />
                  <View className="flex flex-row justify-between text-lg font-bold">
                    <Text>{t("total")}</Text>
                    <Text>
                      {(subtotal + totalTax).toFixed(2)} {t(currency)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

export default function Invoice() {
  const { purchaseData } = useLocalSearchParams();

  if (!purchaseData) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>No invoice data available</Text>
      </View>
    );
  }

  const parsedPurchaseData = JSON.parse(purchaseData);

  return <InvoicePage purchaseData={parsedPurchaseData} />;
}