"use client";
import BlockHeader from "@/(root)/components/BlockHeader";
import VendorCard from "@/(root)/components/VendorCard";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Container } from "@/../components/ui/container";

const Vendors = ({ id }) => {
  const { isPending, data } = useGetManyReference("vendors", {
    target: "shopId",
    id,
  });

  return (
    <section className="my-8">
      <BlockHeader title={data?.name} />
      <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {!isPending &&
          data
            .filter(({ isActive }) => isActive)
            .map((vendor) => <VendorCard key={vendor._id} {...vendor} />)}
      </Container>
    </section>
  );
};

export default Vendors;
