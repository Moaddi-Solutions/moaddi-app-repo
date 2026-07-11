import { Container } from "@/../components/ui/container";
import { getTranslations } from "next-intl/server";

const icons = {
  scan: (
    <svg
      aria-hidden="true"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 12h10" />
    </svg>
  ),
  pick: (
    <svg
      aria-hidden="true"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7l1.5-4h13L20 7M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 11a3 3 0 0 0 6 0" />
    </svg>
  ),
  pay: (
    <svg
      aria-hidden="true"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  ),
  collect: (
    <svg
      aria-hidden="true"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3v10M12 13l-3.5-3.5M12 13l3.5-3.5M5 17h14v4H5z" />
    </svg>
  ),
};

const HowItWorks = async () => {
  const t = await getTranslations("Home.howItWorks");
  const stepKeys = ["scan", "pick", "pay", "collect"];

  return (
    <section className="py-3" aria-label={t("title")}>
      <Container>
        <h6 className="text-[22px] font-extrabold tracking-tight text-foreground">
          {t("title")}
        </h6>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stepKeys.map((key) => (
            <div
              key={key}
              className="grid justify-items-start gap-1.5 rounded-2xl border border-border bg-card p-5"
            >
              <span className="text-[11px] font-extrabold tracking-[0.14em] text-primary-700 uppercase">
                {t(`steps.${key}.label`)}
              </span>
              <span className="text-primary-700 bg-primary-100 grid size-11 place-items-center rounded-[13px]">
                {icons[key]}
              </span>
              <b className="text-[15px] font-extrabold">
                {t(`steps.${key}.title`)}
              </b>
              <p className="m-0 text-[13px] text-muted-foreground">
                {t(`steps.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default HowItWorks;
