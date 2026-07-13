import { SignUpForm } from "@/(root)/components/UserAuthForm";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Authentication",
  description: "Authentication forms built using the components.",
};

export default async function SignUpPage() {
  const t = await getTranslations("");

  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-start justify-center px-4 py-10 sm:py-14">
      <section className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_18px_50px_rgba(16,40,46,0.10)] sm:p-7 dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <svg
            aria-hidden="true"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </div>
        <div className="mb-5 flex flex-col gap-2">
          <h1 className="text-[1.35rem] leading-tight font-extrabold tracking-normal">
            {t("SignUp.create")}
          </h1>
          <p className="max-w-[34ch] text-sm leading-6 text-muted-foreground">
            {t("SignUp.input")}
          </p>
        </div>
        <SignUpForm variant="card" />
      </section>
    </main>
  );
}
