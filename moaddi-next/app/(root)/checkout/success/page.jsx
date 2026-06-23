"use client";

import BlockHeader from "@/(root)/components/BlockHeader";
import { Container } from "@/../components/ui/container";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const t = useTranslations("Checkout");

  return (
    <section>
      <BlockHeader title={t("successTitle")} />
      <Container variant="breakpoint" className="mx-auto max-w-lg py-10 text-center">
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          {t("successDescription")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/machine-scan"
            className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            {t("successCtaMachine")}
          </Link>
          <Link
            href="/"
            className="border-input bg-background inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            {t("successCtaHome")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
