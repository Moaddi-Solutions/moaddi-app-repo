import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import GradientText from "~/components/GradientText";
import { Text } from "~/components/ui/text";

interface ProductCardProps {
  _id: number;
  name: string;
  salePrice: number;
  campaignPrice: number;
  originalPrice: number;
  status: string;
  image: { src: string };
  preferredCurrency: string;
}

export function ProductCard({
  _id,
  name,
  image,
  salePrice,
  campaignPrice,
  originalPrice,
  preferredCurrency,
}: ProductCardProps) {
  const isBluetoothEnabled = true;
  const status = "Available";
  // const t = (key: string) => {
  //   return key;
  // };
  const { t } = useTranslation();
  return (
    <Link href={`/Machines/${_id}`} asChild>
      <View className="group relative rounded-3xl bg-white border border-gray-200 overflow-hidden transition-all duration-300 shadow-sm active:scale-[0.97]">
        {/* Product Image Placeholder */}
        <View className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex flex-row items-center justify-center">
          {/* Abstract Product Visual */}
          <View className="absolute inset-0 bg-gray-100" />

        {/* <View className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2cb4cc]/20 via-[#7287e2]/20 to-[#e0bd5f]/20 border border-gray-200 flex flex-row items-center justify-center">
          <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2cb4cc] to-[#7287e2] opacity-60" />
        </View> */}
        <Image
          className="h-52 w-full rounded-xl border border-muted "
          source={{ uri: image.src }}
          resizeMode="cover"
          alt={name}
          style={{ width: "100%", height: "100%" }}
        />

        {/* Status Badge */}
        <View className="absolute top-3 right-3">
          <Text
            className={`px-3 py-1 rounded-full text-xs border ${
              isBluetoothEnabled
                ? "bg-[#2cb4cc]/10 border-[#2cb4cc]/30 text-[#2cb4cc]"
                : "bg-gray-100 border-gray-200 text-gray-700"
            }`}
          >
            {status}
          </Text>
        </View>

        {/* Gradient Overlay */}
        {/* <LinearGradient
          className="absolute inset-0 opacity-40"
          colors={["#fff", "#2cb4cc"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        /> */}
      </View>

      {/* Product Info */}
      <View className="p-4">
        <Text className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
          {name}
        </Text>
        <View className="flex flex-row items-center justify-between">
          <GradientText
            colors={["#2cb4cc", "#7287e2"]}
            className="text-lg font-bold "
          >
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
          </GradientText>

            {/* Bluetooth Indicator */}
            {isBluetoothEnabled && (
              <View className="w-6 h-6 rounded-lg bg-[#2cb4cc]/10 border border-[#2cb4cc]/30 flex flex-row items-center justify-center">
                <Svg
                  className="w-4 h-4 text-[#2cb4cc]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <Path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z" />
                </Svg>
              </View>
            )}
          </View>
        </View>
      </View>
    </Link>
  );
}
