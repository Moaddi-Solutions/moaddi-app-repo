"use client";
import BlockHeader from "@/(root)/components/BlockHeader";
import MachineCard from "@/(root)/components/MachineCard";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Container } from "@/../components/ui/container";
import { Radar } from "lucide-react";
import { useTranslations } from "next-intl";

const Machines = ({ id }) => {
  const t = useTranslations("MachinesPage");
  const { isPending, data } = useGetManyReference("machines", {
    target: "productId",
    id,
  });
  const machines = (data ?? []).filter(({ isActive }) => isActive);

  return (
    <section className="my-8">
      <BlockHeader title={data?.name ?? t("title")} />
      <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {!isPending &&
          machines.map((machine) => (
            <MachineCard key={machine._id} {...machine} />
          ))}
      </Container>
      {!isPending && machines.length === 0 && (
        <Container className="mt-2 flex flex-col items-center gap-2 py-14 text-center">
          <div className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
            <Radar className="size-7" />
          </div>
          <p className="text-[15px] font-extrabold">{t("emptyTitle")}</p>
          <p className="text-muted-foreground max-w-xs text-sm font-semibold">
            {t("emptyBody")}
          </p>
        </Container>
      )}
    </section>
  );
};

export default Machines;
