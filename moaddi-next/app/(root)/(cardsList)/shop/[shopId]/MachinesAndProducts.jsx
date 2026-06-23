"use client";
import BlockHeader from "@/(root)/components/BlockHeader";
import MachineCard from "@/(root)/components/MachineCard";
import ProductCard from "@/(root)/components/ProductCard";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Container } from "@/../components/ui/container";
import { Fit } from "@/../services/data-provider";

const MachinesAndProducts = ({ id }) => {
  const { isPending, data: rawData } = useGetManyReference("machines", {
    target: "shopId",
    id,
  });
  const data = !isPending ? rawData.filter(({ isActive }) => isActive) : [];
  const products = !isPending
    ? Array.from(
        data
          .reduce((prev, curr) => {
            if (curr.isActive)
              curr.products.forEach((product) => {
                if (product.isActive) prev.set(product._id, product);
              });
            return prev;
          }, new Map())
          .values(),
      )
    : [];
  return (
    <section className="my-8">
      {!isPending ? (
        data.length ? (
          <>
            <BlockHeader title={data[0].shop[0].name} />
            <BlockHeader title="Machines" />
            <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {data
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((machine) => (
                  <MachineCard key={machine._id} {...machine} />
                ))}
            </Container>
            <BlockHeader title="Products" />
            <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {products
                .map(Fit.image)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((product, i) => (
                  <ProductCard key={product._id} {...product} />
                ))}
            </Container>
          </>
        ) : (
          <p className="mx-12">No products</p>
        )
      ) : (
        <p className="mx-12">Loading</p>
      )}
    </section>
  );
};

export default MachinesAndProducts;
