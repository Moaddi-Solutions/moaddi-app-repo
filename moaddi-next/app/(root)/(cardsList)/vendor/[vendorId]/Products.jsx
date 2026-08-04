"use client";
import BlockHeader from "@/(root)/components/BlockHeader";
import ProductCard from "@/(root)/components/ProductCard";
import { useRegisterContactTarget } from "@/(root)/context/contact-target-context";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Container } from "@/../components/ui/container";
import { Fit } from "@/../services/data-provider";

const Machines = ({ id }) => {
  const { isPending, data } = useGetManyReference("products", {
    target: "vendorId",
    id,
  });

  useRegisterContactTarget({
    kind: "vendor",
    targetUserId: id,
    resourceId: id,
    isPending,
  });

  return (
    <section className="my-8">
      <BlockHeader title={data?.name} />
      <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {!isPending &&
          data
            ?.map(Fit.image)
            .filter(({ isActive }) => isActive)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((product) => <ProductCard key={product._id} {...product} />)}
      </Container>
    </section>
  );
};

export default Machines;
