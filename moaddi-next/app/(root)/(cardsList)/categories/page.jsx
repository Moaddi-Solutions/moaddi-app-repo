import BlockHeader from "@/(root)/components/BlockHeader";
import CardGrid from "@/(root)/components/layout/CardGrid";
import { getTranslations } from "next-intl/server";

const page = async () => {
  const t = await getTranslations("Home");
  const cardGrid = {
    card: {
      component: "category",
    },
  };

  return (
    <section className="my-8">
      <BlockHeader title={t("specialCategories")} />
      <CardGrid {...cardGrid} />
    </section>
  );
};

export default page;
