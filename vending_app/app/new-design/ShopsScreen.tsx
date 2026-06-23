import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import dataProvider from "~/services/dataProvider";
import { ShopCard } from "../../stories/components/ShopCard";

// const shops = [
//   {
//     id: 1,
//     name: "TechHub Station",
//     description: "Premium Bluetooth headphones",
//     icon: Bluetooth,
//     color: "from-[#2cb4cc] to-[#0077cc]",
//   },
//   {
//     id: 2,
//     name: "SmartLife Vending",
//     description: "Automated smart home devices",
//     icon: Zap,
//     color: "from-[#7287e2] to-[#6d28d9]",
//   },
//   {
//     id: 3,
//     name: "IoT Marketplace",
//     description: "Connected sensors and IoT gadgets",
//     icon: Cpu,
//     color: "from-[#e0bd5f] to-[#db2777]",
//   },
//   {
//     id: 4,
//     name: "Wireless Corner",
//     description: "Bluetooth accessories and wearables",
//     icon: Radio,
//     color: "from-[#2cb4cc] to-[#7287e2]",
//   },
// ];

function ShopsScreen() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    dataProvider
      .getList(`shopsActive`, {
        pagination: { page: 1, perPage: 10 },
        // @ts-ignore
        limit: 10,
        filter: {
          products: { $ne: [] },
          "products.isActive": true,
        },
      })
      // @ts-ignore
      .then(({ data }) => {
        setItems(data);
      });
  }, []);
  const colors = [
    "from-[#7287e2] to-[#6d28d9]",
    "from-[#2cb4cc] to-[#0077cc]",
    "from-[#2cb4cc] to-[#7287e2]",
  ];
  return (
    <View className="mt-4 py-4 px-6 bg-gray-50">
      {/* Section Header */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Shops</Text>
        <Text className="text-gray-600">
          Explore our Bluetooth-enabled retail locations
        </Text>
      </View>

      {/* Shop Cards */}
      <View>
        {items
          .filter(({ isActive }) => isActive)
          .map((item, i) => {
            return (
              // @ts-ignore
              <ShopCard key={i} {...item} color={colors[i % colors.length]} />
            );
          })}
      </View>
    </View>
  );
}

export default ShopsScreen;
