import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "~/components/ui/text";
import dataProvider from "~/services/dataProvider";
import { ProductCard } from "./ProductCard";

const products = [
  {
    id: 1,
    name: "Quantum Earbuds Pro",
    price: 199.99,
    status: "Available",
    image: "earbuds",
  },
  {
    id: 2,
    name: "Neural Smart Watch",
    price: 349.99,
    status: "Bluetooth-enabled",
    image: "smartwatch",
  },
  {
    id: 3,
    name: "Pulse Speaker X",
    price: 149.99,
    status: "Available",
    image: "speaker",
  },
  {
    id: 4,
    name: "IoT Sensor Kit",
    price: 89.99,
    status: "Bluetooth-enabled",
    image: "sensor",
  },
  {
    id: 5,
    name: "Cyber Fitness Tracker",
    price: 129.99,
    status: "Available",
    image: "tracker",
  },
  {
    id: 6,
    name: "Smart Hub Gateway",
    price: 249.99,
    status: "Bluetooth-enabled",
    image: "hub",
  },
];

export function ProductsScreen() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    dataProvider
      .getList(`productsActive`, {
        pagination: { page: 1, perPage: 10 },
        // @ts-ignore
        limit: 10,
        filter: {
          machines: { $ne: [] },
          "machines.isActive": true,
        },
      })
      // @ts-ignore
      .then(({ data }) => {
        setItems(data);
      });
  }, []);

  return (
    <View className="px-6 py-16 bg-white">
      {/* Section Header */}
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Products</Text>
        <Text className="text-gray-600">
          Discover our smart device collection
        </Text>
      </View>
      {/* Product Grid */}
      <View className="grid grid-cols-2 gap-4">
        {items.map((item, i) => (
          // @ts-ignore
          <ProductCard key={i} {...item} />
        ))}
      </View>
    </View>
  );
}
