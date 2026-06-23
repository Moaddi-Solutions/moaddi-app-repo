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
    status: "Bluetooth-enabled",
    image: "speaker",
  },
  {
    id: 4,
    name: "IoT Sensor Kit",
    price: 89.99,
    status: "Available",
    image: "sensor",
  },
];

export function FeaturedProductsScreen() {
  return (
    <section className="px-6 py-16 bg-white">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Featured Products
        </h2>
        <p className="text-gray-600">Discover our smart device collection</p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
