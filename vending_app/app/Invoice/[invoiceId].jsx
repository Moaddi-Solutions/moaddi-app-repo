import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Share2 } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, Share, Text, View } from "react-native";
import QRCode from "react-qr-code";
import { Badge, Card, IconButton, Separator } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useUser } from "~/context/UserContext";
import {
  asNumber,
  computeInvoiceSubtotal,
  computeInvoiceTotalTax,
  getProductPricing,
  purchasePreferredCurrency,
} from "~/lib/invoicePurchase";
import { colors, radius, space, type as typo } from "~/theme/moaddi";

const STATUS_TONE = {
  Completed: "success",
  PaymentDone: "info",
  PaymentDoneRequest: "warning",
  Failed: "danger",
};

function Row({ label, value, strong, danger }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ ...typo.body, color: colors.textMuted }}>{label}</Text>
      <Text
        style={{
          ...(strong ? typo.bodyStrong : typo.body),
          color: danger ? colors.danger : strong ? colors.textHeading : colors.textBody,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function InvoicePage({ purchaseData }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const router = useRouter();

  const { products, items, created, status, invoiceId, _id } = purchaseData;
  const price = asNumber(purchaseData.price);
  const currency = purchasePreferredCurrency(purchaseData);

  const qrCode = useMemo(
    () => JSON.stringify({ invoiceId, total: price, date: created }),
    [invoiceId, price, created]
  );
  const subtotal = useMemo(() => computeInvoiceSubtotal(purchaseData), [purchaseData]);
  const totalTax = useMemo(() => computeInvoiceTotalTax(purchaseData), [purchaseData]);

  const share = () =>
    Share.share({
      message: `Moaddi invoice #${invoiceId} — ${(subtotal + totalTax).toFixed(2)} ${currency}`,
    }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("invoice")}
        subtitle={`#${invoiceId}`}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
        trailing={
          <IconButton label="Share" onPress={share} icon={<Share2 size={18} color={colors.textHeading} />} />
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 16 }}
      >
        {/* Header card */}
        <Card raised>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image
              source={require("~/assets/images/icon-new.jpg")}
              style={{ width: 44, height: 44, borderRadius: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                {process.env.EXPO_PUBLIC_SELLER_NAME || "Moaddi Solutions"}
              </Text>
              <Text style={{ ...typo.caption, color: colors.textMuted }}>
                {new Date(created).toLocaleString()}
              </Text>
            </View>
            <Badge tone={STATUS_TONE[status] ?? "neutral"} dot>
              {t(status?.toLowerCase?.()) || status}
            </Badge>
          </View>
        </Card>

        {/* QR + customer */}
        <Card>
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 4 }}>
            <QRCode size={140} value={qrCode} />
            {process.env.EXPO_PUBLIC_SELLER_VAT_NUMBER ? (
              <Text style={{ ...typo.caption, color: colors.textMuted }}>
                {process.env.EXPO_PUBLIC_SELLER_VAT_NUMBER}
              </Text>
            ) : null}
          </View>
          <Separator gap={12} />
          <Row label={t("id")} value={String(_id).slice(-10)} strong />
          {user?.name ? <Row label={t("customerDetails")} value={user.name} /> : null}
        </Card>

        {/* Items */}
        <Card>
          <Text style={{ ...typo.title3, color: colors.textHeading, marginBottom: 10 }}>
            {t("invoiceItems")}
          </Text>
          {products.map((product, i) => {
            const quantity = items.filter(({ productId }) => productId == product._id).length;
            const { price: itemPrice } = getProductPricing(product);
            const lineCurrency = product.preferredCurrency ?? product.currency ?? currency;
            return (
              <View key={product._id}>
                {i > 0 ? <Separator gap={10} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                      {product.name}
                    </Text>
                    <Text style={{ ...typo.caption, color: colors.textMuted }}>
                      {quantity} × {itemPrice.toFixed(2)} {t(lineCurrency)}
                    </Text>
                  </View>
                  <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                    {(itemPrice * quantity).toFixed(2)} {t(lineCurrency)}
                  </Text>
                </View>
              </View>
            );
          })}
          <Separator gap={12} />
          <View style={{ gap: 6 }}>
            <Row label={t("subtotal")} value={`${subtotal.toFixed(2)} ${t(currency)}`} />
            <Row label={t("totalTax")} value={`${totalTax.toFixed(2)} ${t(currency)}`} />
          </View>
          <Separator gap={12} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ ...typo.price, color: colors.textHeading }}>{t("total")}</Text>
            <Text style={{ ...typo.price, color: colors.textHeading }}>
              {(subtotal + totalTax).toFixed(2)} {t(currency)}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

export default function Invoice() {
  const { purchaseData } = useLocalSearchParams();
  const { t } = useTranslation();

  if (!purchaseData) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfacePage }}>
        <Text style={{ ...typo.body, color: colors.textMuted }}>
          {t("noInvoiceData") || "No invoice data available"}
        </Text>
      </View>
    );
  }

  return <InvoicePage purchaseData={JSON.parse(purchaseData)} />;
}
