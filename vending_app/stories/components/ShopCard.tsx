import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { ChevronRight, Store } from "lucide-react-native";
import { Text, View } from "react-native";

interface ShopCardProps {
  id: number;
  name: string;
  description: string;
  image?: string;
  color: string;
}

export function ShopCard({
  name,
  description,
  image,
  id,
  color,
}: ShopCardProps) {
  return (
    <Link
      href={`/Shop/${id}`}
      className="mt-2 group relative rounded-3xl bg-white border border-gray-200 p-4 transition-all duration-300 active:scale-95 shadow-sm"
    >
      <View className="flex flex-row items-start gap-4">
        {/* Icon */}
        <LinearGradient
          colors={["#2cb4cc", "#7287e2"]}
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} p-[2px] flex-shrink-0`}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View className="w-full h-full rounded-2xl bg-white flex items-center justify-center">
            <Store className="w-6 h-6 text-gray-800" />
          </View>
        </LinearGradient>

        {/* Content */}
        <View className="flex-1 min-w-0">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {name}
          </Text>
          <Text className="text-sm text-gray-600">{description}</Text>
        </View>

        {/* Arrow Indicator */}
        <View className="mt-2">
          <ChevronRight color={"gray"} />
        </View>
      </View>

      {/* Status Indicator */}
      <View className="mt-4 flex flex-row items-center gap-2">
        <View className="w-2 h-2 rounded-full bg-[#2cb4cc] animate-pulse" />
        <Text className="mt-2 text-xs text-gray-500">Bluetooth Enabled</Text>
      </View>
    </Link>
  );
}
