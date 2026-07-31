"use client";
import BlockHeader from "@/(root)/components/BlockHeader";
import MachineCard from "@/(root)/components/MachineCard";
import ProductCard from "@/(root)/components/ProductCard";
import { useRegisterContactTarget } from "@/(root)/context/contact-target-context";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import { Container } from "@/../components/ui/container";
import { Skeleton } from "@/../components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/../components/ui/tabs";
import { Fit } from "@/../services/data-provider";
import { useTranslations } from "next-intl";

const MachineCardSkeleton = () => (
  <div className="rounded-xl border p-4">
    <Skeleton className="size-11 rounded-2xl" />
    <Skeleton className="mt-3 h-5 w-3/4 rounded" />
    <div className="mt-3 flex items-center justify-between">
      <Skeleton className="h-4 w-10 rounded" />
      <Skeleton className="size-8 rounded-[10px]" />
    </div>
  </div>
);

const ProductCardSkeleton = () => (
  <div className="rounded-xl p-3">
    <Skeleton className="h-42 w-full rounded-2xl" />
    <Skeleton className="mt-3 h-4 w-3/4 rounded" />
    <Skeleton className="mt-2 h-6 w-1/2 rounded" />
  </div>
);

const CardsSkeleton = ({ Card, count = 8 }) => (
  <Container className="my-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} />
    ))}
  </Container>
);

const MachinesAndProducts = ({ id }) => {
  const t = useTranslations("Shop");
  const { isPending, data: rawData } = useGetManyReference("machines", {
    target: "shopId",
    id,
  });
  const { data: rawShopUsers, isPending: shopUsersPending } =
    useGetManyReference("vendors", {
      target: "shopId",
      id,
    });
  const data = !isPending
    ? (rawData ?? []).filter(({ isActive }) => isActive)
    : [];
  const shop = data[0]?.shop?.[0];
  const activeShopUsers = (rawShopUsers ?? []).filter(
    ({ isActive, isDeleted }) => isActive !== false && isDeleted !== true,
  );
  const shopOwnerId =
    shop?.shopOwner?._id ??
    shop?.ownerId ??
    shop?.vendorId ??
    (activeShopUsers.length === 1 ? activeShopUsers[0]?._id : null);

  useRegisterContactTarget({
    kind: "shop-owner",
    targetUserId: shopOwnerId,
    resourceId: id,
    isPending: isPending || shopUsersPending,
  });

  const products = !isPending
    ? Array.from(
        data
          .reduce((prev, curr) => {
            if (curr.isActive)
              (curr.products ?? []).forEach((product) => {
                if (product.isActive) prev.set(product._id, product);
              });
            return prev;
          }, new Map())
          .values(),
      )
    : [];

  return (
    <section className="my-8">
      {isPending ? (
        <>
          <BlockHeader title={<Skeleton className="h-6 w-40" />} />
          <CardsSkeleton Card={MachineCardSkeleton} count={4} />
        </>
      ) : data.length ? (
        <>
          <BlockHeader title={data[0]?.shop?.[0]?.name} />
          <Tabs defaultValue="machines" className="flex flex-col gap-0">
            <Container>
              <TabsList
                variant="line"
                className="h-auto w-full justify-start gap-6 border-b p-0"
              >
                <TabsTrigger
                  value="machines"
                  className="h-auto flex-none rounded-none px-0.5 pb-3 text-base font-bold"
                >
                  {t("machines")}
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="h-auto flex-none rounded-none px-0.5 pb-3 text-base font-bold"
                >
                  {t("products")}
                </TabsTrigger>
              </TabsList>
            </Container>
            <TabsContent value="machines">
              {data.length ? (
                <Container className="my-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                  {data
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((machine) => (
                      <MachineCard key={machine._id} {...machine} />
                    ))}
                </Container>
              ) : (
                <p className="text-muted-foreground mx-12 my-6">
                  {t("noMachines")}
                </p>
              )}
            </TabsContent>
            <TabsContent value="products">
              {products.length ? (
                <Container className="my-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                  {products
                    .map(Fit.image)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((product) => (
                      <ProductCard key={product._id} {...product} />
                    ))}
                </Container>
              ) : (
                <p className="text-muted-foreground mx-12 my-6">
                  {t("noProducts")}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p className="mx-12">{t("noProducts")}</p>
      )}
    </section>
  );
};

export default MachinesAndProducts;
