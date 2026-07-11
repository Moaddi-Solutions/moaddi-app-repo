import BlockHeader from "@/(root)/components/BlockHeader";
import HowItWorks from "@/(root)/components/blocks/HowItWorks";
import MachinesNearYou from "@/(root)/components/blocks/MachinesNearYou";
import CardGrid from "@/(root)/components/layout/CardGrid";
import PageBlocks from "@/(root)/components/PageBlocks";
import { client } from "@/../services/contentClient";
import { getLocale, getTranslations } from "next-intl/server";

export default async function Home() {
  const locale = await getLocale();
  const blocks = await client(`${locale}HomeBlocks`);

  const t = await getTranslations("Home");
  const cardGrid = {
    shops: {
      rows: {
        xs: 4,
        sm: 2,
        md: 2,
        lg: 2,
        xl: 2,
      },
      card: {
        component: "shops",
      },
      queryOptions: {
        limit: 10,
        filter: {
          products: { $ne: [] },
          "products.isActive": true,
        },
      },
    },
    products: {
      rows: {
        xs: 2,
        sm: 2,
        md: 2,
        lg: 2,
        xl: 2,
      },
      card: {
        component: "products",
      },
      queryOptions: {
        limit: 10,
        filter: {
          machines: { $ne: [] },
          "machines.isActive": true,
        },
      },
    },
    specialProducts: {
      rows: {
        xs: 2,
        sm: 2,
        md: 2,
        lg: 2,
        xl: 2,
      },
      card: {
        component: "products",
      },
      queryOptions: {
        limit: 10,
        filter: {
          isFeatured: true,
          machines: { $ne: [] },
          "machines.isActive": true,
        },
      },
    },
  };
  return (
    <main className="pb-12">
      <PageBlocks blocks={blocks} />
      <div className="space-y-5">
        <section className="py-3">
          <BlockHeader title={t("specialShops")} href={"/shops"} />
          <CardGrid {...cardGrid.shops} />
        </section>
        <MachinesNearYou />
        <section className="py-3">
          <BlockHeader title={t("specialProducts")} href={"/offers"} />
          <CardGrid {...cardGrid.specialProducts} />
        </section>
        <section className="py-3">
          <BlockHeader title={t("products")} href={"/products"} />
          <CardGrid {...cardGrid.products} />
        </section>
        <HowItWorks />
      </div>
    </main>
  );
}
