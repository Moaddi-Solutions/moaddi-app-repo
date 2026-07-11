"use client";
import { Container } from "@/../components/ui/container";
import rtlRules from "@/../i18n/rtl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

const BlockHeader = ({ title, href }) => {
  const t = useTranslations("Home");
  const locale = useLocale();
  const Chevron = rtlRules[locale] ? ChevronLeft : ChevronRight;
  return (
    <Container className="mt-3 mb-3 flex items-baseline justify-between gap-4">
      <h6 className="text-[22px] font-extrabold tracking-tight text-foreground">
        {title}
      </h6>
      {href && (
        <Link
          className="text-primary-text hover:text-primary-700 flex items-center gap-1 text-[13.5px] font-extrabold whitespace-nowrap"
          href={href}
        >
          {t("showMore")}
          <Chevron className="size-3.5" />
        </Link>
      )}
    </Container>
  );
};

export default BlockHeader;
