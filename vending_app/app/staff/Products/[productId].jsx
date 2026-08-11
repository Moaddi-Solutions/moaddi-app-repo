import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, Input, Loader, Switch } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useAbility } from "~/context/AbilityContext";
import alert from "~/lib/alert";
import { can } from "~/lib/ability";
import dataProvider from "~/services/dataProvider";
import { colors, space, type as typo } from "~/theme/moaddi";

/** The flat shape the products endpoint takes; the server splits it into the
 *  local/USD price pair itself, exactly as the web dashboard's form does. */
const emptyForm = {
  name: "",
  barCode: "",
  currency: "SAR",
  originalPrice: "",
  tax: "",
  salePrice: "",
  isActive: true,
};

const num = (value) => {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function StaffProductForm() {
  const { productId } = useLocalSearchParams();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ability } = useAbility();

  const isNew = String(productId) === "new";
  const [form, setForm] = useState(emptyForm);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    dataProvider
      .getOne("staffProducts", { id: productId })
      .then((product) => {
        if (cancelled) return;
        // Asked of the record: the list scope says which products come back,
        // this says whether this one may be changed by this user.
        const owners = {
          _id: product._id,
          vendorId: product.vendorId ?? null,
          shopId: product.shopId ?? null,
        };
        if (!can(ability, "update", "Product", owners)) {
          setDenied(true);
          return;
        }
        setRecord(product);
        setForm({
          name: product.name ?? "",
          barCode: product.barCode ?? "",
          currency: product.currency ?? "SAR",
          originalPrice: String(
            product.originalPrice ?? product.localPrice?.originalPrice ?? "",
          ),
          tax: String(product.tax ?? product.localPrice?.tax ?? ""),
          salePrice: String(
            product.salePrice ?? product.localPrice?.salePrice ?? "",
          ),
          isActive: product.isActive !== false,
        });
      })
      .catch((error) => alert("error", error?.message || String(error)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [productId, isNew, ability]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) return alert("error", t("error"));
    if (!form.barCode.trim()) return alert("error", t("error"));
    const salePrice = num(form.salePrice);
    const originalPrice = num(form.originalPrice) ?? salePrice;
    const tax = num(form.tax) ?? 0;
    if (salePrice === null || salePrice < 0) return alert("error", t("error"));

    setBusy(true);
    try {
      const data = {
        name: form.name.trim(),
        barCode: form.barCode.trim(),
        currency: form.currency.trim() || "SAR",
        originalPrice,
        tax,
        salePrice,
        isActive: form.isActive,
      };
      if (isNew) {
        await dataProvider.create("products", { data });
      } else {
        await dataProvider.update("products", {
          id: productId,
          data,
          previousData: record ?? {},
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["StaffProducts"] });
      alert("success", t("success"));
      router.back();
    } catch (error) {
      alert("error", error?.message || String(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await dataProvider.delete("products", { id: productId });
      await queryClient.invalidateQueries({ queryKey: ["StaffProducts"] });
      alert("success", t("success"));
      router.back();
    } catch (error) {
      alert("error", error?.message || String(error));
    } finally {
      setBusy(false);
    }
  };

  const canDelete =
    !isNew &&
    record &&
    can(ability, "delete", "Product", {
      _id: record._id,
      vendorId: record.vendorId ?? null,
      shopId: record.shopId ?? null,
    });

  const title = isNew ? t("addProduct") || "Add product" : form.name || t("product");

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={title}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {loading ? (
        <Loader />
      ) : denied ? (
        <Text
          style={{
            ...typo.body,
            textAlign: "center",
            marginTop: 48,
            color: colors.textMuted,
          }}
        >
          {t("notYourProduct") || t("staffAreaOnly")}
        </Text>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: space.gutter,
            gap: 12,
            paddingTop: 16,
            paddingBottom: 32,
          }}
        >
          <Card>
            <View style={{ gap: 12 }}>
              <Input
                label={t("name")}
                value={form.name}
                onChangeText={set("name")}
              />
              <Input
                label={t("barCode") || "Barcode"}
                value={form.barCode}
                onChangeText={set("barCode")}
                autoCapitalize="none"
                textAlign="left"
              />
              <Input
                label={t("currency") || "Currency"}
                value={form.currency}
                onChangeText={set("currency")}
                autoCapitalize="characters"
                textAlign="left"
              />
            </View>
          </Card>

          <Card>
            <View style={{ gap: 12 }}>
              <Input
                label={t("originalPrice") || "Original price"}
                value={form.originalPrice}
                onChangeText={set("originalPrice")}
                keyboardType="numeric"
                textAlign="left"
              />
              <Input
                label={t("tax") || "Tax"}
                value={form.tax}
                onChangeText={set("tax")}
                keyboardType="numeric"
                textAlign="left"
              />
              <Input
                label={t("salePrice") || "Sale price"}
                value={form.salePrice}
                onChangeText={set("salePrice")}
                keyboardType="numeric"
                textAlign="left"
              />
            </View>
          </Card>

          <Card>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ ...typo.label, color: colors.textHeading }}>
                {t("active") || "Active"}
              </Text>
              <Switch checked={form.isActive} onChange={set("isActive")} />
            </View>
          </Card>

          <Button fullWidth disabled={busy} onPress={submit}>
            <Text style={{ ...typo.label, color: colors.textOnBrand }}>
              {t("save") || "Save"}
            </Text>
          </Button>

          {canDelete && (
            <Button
              fullWidth
              variant="destructive"
              disabled={busy}
              onPress={remove}
            >
              <Text style={{ ...typo.label, color: colors.textOnBrand }}>
                {t("delete") || "Delete"}
              </Text>
            </Button>
          )}
        </ScrollView>
      )}
    </View>
  );
}
