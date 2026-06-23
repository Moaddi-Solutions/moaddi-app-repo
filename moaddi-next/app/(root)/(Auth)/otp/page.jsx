import { OTPForm } from "@/(root)/components/UserAuthForm";
import { Container } from "@/../components/ui/container";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function OTPPage() {
  const t = await getTranslations("");

  return (
    <>
      <Container className="relative container my-40 flex-col items-center justify-center">
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("Auth.otp")}
              </h1>
              <p className="text-muted-foreground text-sm">{t("otp.input")}</p>
            </div>
            <OTPForm />
            <p className="text-muted-foreground px-8 text-center text-sm">
              {t("Auth.agree")}
              <Link
                href="/terms"
                className="hover:text-primary underline underline-offset-4"
              >
                {t("Auth.terms")}
              </Link>
              {t("Auth.and")}
              <Link
                href="/privacy"
                className="hover:text-primary underline underline-offset-4"
              >
                {t("Auth.privacy")}
              </Link>
              .
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
