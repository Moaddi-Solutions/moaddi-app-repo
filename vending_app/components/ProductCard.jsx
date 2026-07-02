import { Link, useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";
import { Badge, badgeTextVariants } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useUser } from "~/context/UserContext";
import { productImageUrl } from "~/services/serverAddresses";

export default function ProductCard({
  _id,
  name,
  image,
  salePrice,
  campaignPrice,
  originalPrice,
  preferredCurrency,

}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const handlePress = (machineId) => {
    // if (!user) router.navigate("/Signin");
    // else
    router.navigate(`Machines/${machineId}`);
  };
  console.log("💳 [PRODUCT CARD]","preferredCurrency",preferredCurrency)
  return (
    <Card className="rounded-xl border overflow-hidden">
      <View
        className="relative w-full overflow-hidden bg-muted"
        style={{ aspectRatio: 1 }}
      >
        <Image
          style={{ width: "100%", height: "100%" }}
          source={{ uri: productImageUrl(image) }}
          resizeMode="cover"
          alt={name}
        />
        {campaignPrice && (
          <Badge
            variant="destructive"
            className="absolute start-2 top-2 font-semibold"
          >
            <Text
              dir="ltr"
              className={badgeTextVariants({ variant: "destructive" })}
            >
              {"-"} {Math.round(100 * (1 - campaignPrice / salePrice))}{" "}
              {t("percent")}
            </Text>
          </Badge>
        )}
      </View>
      <View className="grid gap-1 px-4 pb-4 pt-2">
        <Text className="font-semibold text-foreground">{name}</Text>
        <View className="flex flex-row justify-between">
          {campaignPrice ? (
            <>
              <Text className="text-foreground">
                {campaignPrice.toFixed(2)} {t(preferredCurrency)}
              </Text>
              <Text className="line-through text-destructive text-sm font-semibold md:text-base">
                {salePrice.toFixed(2)} {t(preferredCurrency)}
              </Text>
            </>
          ) : (
            <Text className="text-foreground">
              {" "}
              {salePrice.toFixed(2)} {t(preferredCurrency)}
            </Text>
          )}
        </View>
        <View className="flex gap-1">
          {/* <Link asChild href={`Machines/${_id}`}> */}
          <Button
            onPress={(e) => handlePress(_id)}
            className="bg-indigo-600 py-2 mt-2"
          >
            <Text className="text-white">{t("showMachines")}</Text>
          </Button>
          {/* </Link> */}
        </View>
      </View>
    </Card>
  );
}
