import BlockHeader from "@/(root)/components/BlockHeader";
import CardGrid from "@/(root)/components/layout/CardGrid";
import { getTranslations } from "next-intl/server";

const page = async () => {
  const t = await getTranslations("Home");
  const cardGrid = {
    card: {
      component: "shops",
    },
    queryOptions: {
      filter: {
        products: { $ne: [] },
        "products.isActive": true,
      },
    },
  };

  return (
    <section className="my-8">
      <BlockHeader title={t("specialShops")} />
      <CardGrid {...cardGrid} />
    </section>
  );
};

export default page;
