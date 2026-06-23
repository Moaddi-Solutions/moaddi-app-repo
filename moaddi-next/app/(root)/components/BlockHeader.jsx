"use client";
import { Badge } from "@/../components/ui/badge";
import { Container } from "@/../components/ui/container";
import { useTranslations } from "next-intl";
import Link from "next/link";

const BlockHeader = ({ title, href }) => {
  const t = useTranslations("Home");
  return (
    <Container className="max-md:bg-primary mt-3 mb-2 flex items-center justify-between">
      <h6 className="text-primary-900 px-1 font-bold max-md:text-white">
        {title}
      </h6>
      {href && (
        <Link className="my-2 flex items-center" href={href}>
          <Badge className="max-md:text-primary rounded-full max-md:bg-white">
            {t("showMore")}
          </Badge>
        </Link>
      )}
    </Container>
  );
};

export default BlockHeader;
