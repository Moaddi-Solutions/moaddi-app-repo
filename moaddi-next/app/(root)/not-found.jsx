import { Container } from "@/../components/ui/container";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <section className="flex min-h-[70vh] items-center">
      <Container variant="breakpoint" className="mx-auto max-w-2xl py-16 text-center">
        <p className="moaddi-404-rise text-primary text-sm font-extrabold tracking-[0.14em] uppercase">
          404
        </p>
        <h1 className="moaddi-404-rise moaddi-404-rise-1 text-foreground mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="moaddi-404-rise moaddi-404-rise-2 text-muted-foreground mx-auto mt-4 max-w-md text-sm leading-relaxed">
          {t("description")}
        </p>

        <div className="moaddi-404-rise moaddi-404-rise-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-primary text-(--brand-on-solid) hover:bg-(--primary-hover) inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-extrabold transition-colors"
          >
            {t("backHome")}
          </Link>
          <Link
            href="/machine-scan"
            className="border-border bg-card text-foreground hover:border-primary inline-flex h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-extrabold transition-colors"
          >
            {t("scanMachine")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
