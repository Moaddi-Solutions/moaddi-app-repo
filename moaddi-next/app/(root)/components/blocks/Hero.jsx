import {
  AppGalleryBadge,
  AppStoreBadge,
  GooglePlayBadge,
} from "@/(root)/components/StoreBadges";
import { Button } from "@/../components/ui/button";
import rtlRules from "@/../i18n/rtl";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ScanQrCode,
} from "lucide-react";
import * as motion from "motion/react-client";
import { useLocale } from "next-intl";
import Link from "next/link";

const motionPropsFromTop = {
  initial: { y: -40 },
  whileInView: { y: 0 },
};

/**
 * Fallback Hero content, used when the dashboard block
 * ({locale}HomeBlocks/Hero) returns nothing for a given field. Edit these
 * defaults to change what renders before/without dashboard data.
 */
// Store links are the same for every locale — not part of HERO_FALLBACK.
const STORE_URLS_FALLBACK = {
  appStoreUrl: "https://apps.apple.com/us/app/moaddi/id6753565231",
  googlePlayUrl:
    "https://play.google.com/store/apps/details?id=com.moaddi&hl=ar",
  appGalleryUrl: "https://appgallery.huawei.com/app/C115473181",
};

const HERO_FALLBACK = {
  en: {
    kicker: "240+ machines across World",
    // Pipe-split: text before "|" is plain, text after is emphasized (<em>).
    title: "Shop smarter from|every Moaddi machine",
    button: {
      title: "Scan a machine",
      page: { url: "/machine-scan" },
    },
    stats: [
      { value: "12+", label: "machines online" },
      { value: "19", label: "products" },
      { value: "<30s", label: "scan to get Product" },
    ],
    floatingCards: [
      { title: "M-014 Olaya", subtitle: "Online - 46 products" },
      { title: "Paid $13.95", subtitle: "Opening..." },
    ],
  },
  ar: {
    kicker: "أكثر من 12 ماكينة حول العالم",
    title: "تسوق بذكاء من|كل ماكينة Moaddi",
    button: {
      title: "امسح الماكينة",
      page: { url: "/machine-scan" },
    },
    stats: [
      { value: "+12", label: "ماكينة متصلة" },
      { value: "19", label: "منتج" },
      { value: "<30 ث", label: "من المسح إلى المنتج" },
    ],
    floatingCards: [
      { title: "M-014 العليا", subtitle: "متصلة - 46 منتج" },
      { title: "تم الدفع 13.95 ريال", subtitle: "جاري الفتح..." },
    ],
  },
  zh: {
    kicker: "全球 240+ 台机器",
    title: "从每台 Moaddi 机器|更智能地购物",
    button: {
      title: "扫描机器",
      page: { url: "/machine-scan" },
    },
    stats: [
      { value: "12+", label: "台在线机器" },
      { value: "19", label: "件产品" },
      { value: "<30秒", label: "从扫描到取货" },
    ],
    floatingCards: [
      { title: "M-014 欧莱亚", subtitle: "在线 - 46 件产品" },
      { title: "已支付 ¥13.95", subtitle: "正在打开..." },
    ],
  },
  it: {
    kicker: "Oltre 240 macchine nel mondo",
    title: "Acquista in modo più intelligente|da ogni macchina Moaddi",
    button: {
      title: "Scansiona una macchina",
      page: { url: "/machine-scan" },
    },
    stats: [
      { value: "12+", label: "macchine online" },
      { value: "19", label: "prodotti" },
      { value: "<30s", label: "dalla scansione al prodotto" },
    ],
    floatingCards: [
      { title: "M-014 Olaya", subtitle: "Online - 46 prodotti" },
      { title: "Pagato €13,95", subtitle: "Apertura in corso..." },
    ],
  },
};

const splitTitle = (title) => {
  const [lead, ...rest] = String(title ?? "").split("|");
  return { lead: lead ?? "", emphasis: rest.join("|") };
};

const Hero = ({
  kicker,
  title,
  button,
  appStoreUrl,
  googlePlayUrl,
  appGalleryUrl,
  stats,
  floatingCards,
}) => {
  const locale = useLocale();
  const dir = rtlRules[locale];
  const Chevron = dir ? ChevronLeft : ChevronRight;
  const fallback = HERO_FALLBACK[locale] ?? HERO_FALLBACK.en;

  const kickerText = kicker || fallback.kicker;
  const { lead, emphasis } = splitTitle(title || fallback.title);
  const buttonTitle = button?.title || fallback.button.title;
  const ctaUrl = button?.page?.url || fallback.button.page.url;
  const appStore = appStoreUrl || STORE_URLS_FALLBACK.appStoreUrl;
  const googlePlay = googlePlayUrl || STORE_URLS_FALLBACK.googlePlayUrl;
  const appGallery = appGalleryUrl || STORE_URLS_FALLBACK.appGalleryUrl;
  const statItems = stats?.length ? stats : fallback.stats;
  const cards = floatingCards?.length ? floatingCards : fallback.floatingCards;

  return (
    <section>
      <motion.div {...motionPropsFromTop} className="moaddi-hero-band">
        <div className="moaddi-hero">
          <div className="moaddi-hero-copy">
            <span className="moaddi-hero-kicker">
              <span className="moaddi-hero-kicker-dot" />
              {kickerText}
            </span>
            <h2 className="moaddi-hero-title">
              {lead}
              {emphasis ? (
                <>
                  {" "}
                  <em>{emphasis}</em>
                </>
              ) : null}
            </h2>
            <div className="moaddi-hero-cta">
              <Button
                asChild
                size="lg"
                className="moaddi-hero-scan ltr:hover:[&_svg:last-child]:translate-x-1 rtl:hover:[&_svg:last-child]:-translate-x-1"
              >
                <Link href={ctaUrl}>
                  <ScanQrCode data-icon="inline-start" />
                  {buttonTitle}
                  <Chevron
                    data-icon="inline-end"
                    className="transition-transform"
                  />
                </Link>
              </Button>
              <div className="moaddi-store-row">
                <GooglePlayBadge href={googlePlay} />
                <AppStoreBadge href={appStore} />
                <AppGalleryBadge href={appGallery} />
              </div>
            </div>
            <div className="moaddi-hero-stats">
              {statItems.map((stat, i) => (
                <Stat key={i} value={stat.value} label={stat.label} />
              ))}
            </div>
          </div>

          <div className="moaddi-hero-art" aria-hidden>
            <img
              src="/images/hero.png"
              alt=""
              width={1024}
              height={1536}
              className="moaddi-hero-shot"
            />
            {cards[0] ? (
              <div className="moaddi-hero-float moaddi-hero-float-one">
                <span className="moaddi-hero-dot" />
                <span>
                  {cards[0].title}
                  <small>{cards[0].subtitle}</small>
                </span>
              </div>
            ) : null}
            {cards[1] ? (
              <div className="moaddi-hero-float moaddi-hero-float-two">
                <CreditCard className="moaddi-hero-float-icon" />
                <span>
                  {cards[1].title}
                  <small>{cards[1].subtitle}</small>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

const Stat = ({ value, label }) => (
  <div>
    <b>{value}</b>
    <span>{label}</span>
  </div>
);

export default Hero;
