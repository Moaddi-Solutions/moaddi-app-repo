"use client";
import BlockHeader from "@/(root)/components/BlockHeader";
import MachineCard from "@/(root)/components/MachineCard";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Container } from "@/../components/ui/container";

const Machines = ({ id }) => {
  const { isPending, data } = useGetManyReference("machines", {
    target: "productId",
    id,
  });

  return (
    <section className="my-8">
      <BlockHeader title={data?.name} />
      <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {!isPending &&
          data
            .filter(({ isActive }) => isActive)
            .map((machine) => <MachineCard key={machine._id} {...machine} />)}
      </Container>
    </section>
  );
};

export default Machines;
