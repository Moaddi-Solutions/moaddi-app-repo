import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import MachineCard from "~/components/MachineCard";
import ProductCard from "~/components/ProductCard";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useManyReference } from "~/hook/useManyReference";
import { Fit } from "~/services/dataProvider";

const MachinesAndProducts = () => {
  const { shopId } = useLocalSearchParams();
  const { t } = useTranslation();
  const { setInfo } = useMachine();

  const { isPending, items, total } = useManyReference("machines", {
    target: "shopId",
    id: shopId,
  });

  const products = !isPending
    ? Array.from(
        items
          .reduce((prev, curr) => {
            if (curr.isActive)
              curr.products.forEach((product) => {
                if (product.isActive) prev.set(product._id, product);
              });
            return prev;
          }, new Map())
          .values()
      )
    : [];

  useEffect(() => {
    if (isPending) return;
    if (!items.length) return;
    setInfo((prev) => ({ ...prev, shopName: items[0].shop[0].name }));
  }, [items]);
  return (
    <>
      <ScrollView className="px-6">
        {!isPending ? (
          items.length ? (
            <>
              <Stack.Screen
                options={{
                  title: items[0].shop[0].name,
                }}
              />
              <Text className="mt-2 text-lg">{t("machines")}</Text>
              <View className="my-3 flex gap-4">
                {items
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .filter((machine) => machine.isActive)
                  .map((machine) => (
                    <MachineCard key={machine._id} {...machine} />
                  ))}
              </View>
              {console.log("💳 [PRODUCTS]", products)}
              <Text className="text-lg">{t("products")}</Text>
              <View className="my-3 flex gap-4">
                {products
                  .map(Fit.image)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((product, i) => (
                    <ProductCard key={product._id} {...product} />
                  ))}
              </View>
            </>
          ) : (
            <Text className="mx-12">{t("noProducts")}</Text>
          )
        ) : (
          <Text className="mx-12">{t("loading")}</Text>
        )}
      </ScrollView>
    </>
  );
};

export default MachinesAndProducts;
