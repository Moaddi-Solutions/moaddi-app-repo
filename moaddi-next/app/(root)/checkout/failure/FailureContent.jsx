"use client";

import BlockHeader from "@/(root)/components/BlockHeader";
import { Container } from "@/../components/ui/container";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function FailureContent() {
  const t = useTranslations("Checkout");
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || t("paymentFailedDefault");

  return (
    <section>
      <BlockHeader title={t("failureTitle")} />
      <Container variant="breakpoint" className="mx-auto max-w-lg py-10 text-center">
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <Link
          href="/checkout"
          className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
        >
          {t("failureCtaRetry")}
        </Link>
      </Container>
    </section>
  );
}
