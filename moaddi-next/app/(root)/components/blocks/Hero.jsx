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
const HERO_FALLBACK = {
  en: {
    kicker: "240+ machines across World",
    // Pipe-split: text before "|" is plain, text after is emphasized (<em>).
    title: "Shop smarter from|every Moaddi machine",
    button: {
      title: "Scan a machine",
      page: { url: "/machine-scan" },
    },
    appStoreUrl: "#home",
    googlePlayUrl: "#home",
    appGalleryUrl: "#home",
    stats: [
      { value: "12+", label: "machines online" },
      { value: "19", label: "products" },
      { value: "<30s", label: "scan to get Product" },
    ],
    floatingCards: [
      { title: "M-014 Olaya", subtitle: "Online - 46 products" },
      { title: "Paid 13.95 SAR", subtitle: "Opening..." },
    ],
  },
  ar: {
    kicker: "أكثر من 12 ماكينة حول العالم",
    title: "تسوق بذكاء من|كل ماكينة معدي",
    button: {
      title: "امسح الماكينة",
      page: { url: "/machine-scan" },
    },
    appStoreUrl: "#home",
    googlePlayUrl: "#home",
    appGalleryUrl: "#home",
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
    appStoreUrl: "#home",
    googlePlayUrl: "#home",
    appGalleryUrl: "#home",
    stats: [
      { value: "12+", label: "台在线机器" },
      { value: "19", label: "件产品" },
      { value: "<30秒", label: "从扫描到取货" },
    ],
    floatingCards: [
      { title: "M-014 欧莱亚", subtitle: "在线 - 46 件产品" },
      { title: "已支付 13.95 里亚尔", subtitle: "正在打开..." },
    ],
  },
  it: {
    kicker: "Oltre 240 macchine nel mondo",
    title: "Acquista in modo più intelligente|da ogni macchina Moaddi",
    button: {
      title: "Scansiona una macchina",
      page: { url: "/machine-scan" },
    },
    appStoreUrl: "#home",
    googlePlayUrl: "#home",
    appGalleryUrl: "#home",
    stats: [
      { value: "12+", label: "macchine online" },
      { value: "19", label: "prodotti" },
      { value: "<30s", label: "dalla scansione al prodotto" },
    ],
    floatingCards: [
      { title: "M-014 Olaya", subtitle: "Online - 46 prodotti" },
      { title: "Pagato 13.95 SAR", subtitle: "Apertura in corso..." },
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
  const appStore = appStoreUrl || fallback.appStoreUrl;
  const googlePlay = googlePlayUrl || fallback.googlePlayUrl;
  const appGallery = appGalleryUrl || fallback.appGalleryUrl;
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

const BadgeShell = ({ label, href = "#home", width = 120, children }) => (
  <a className="moaddi-store-badge" href={href} aria-label={label} dir="ltr">
    <svg
      aria-hidden="true"
      focusable="false"
      width={width}
      height="40"
      viewBox={`0 0 ${width} 40`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width={width - 1}
        height="39"
        rx="5.5"
        fill="black"
      />
      {children}
    </svg>
  </a>
);

const GooglePlayBadge = ({ href }) => {
  return (
    <BadgeShell label="Get it on Google Play" href={href}>
      <path
        d="M17.8048 19.4617L8.0896 30.0059C8.09051 30.0078 8.09051 30.0106 8.09142 30.0125C8.38981 31.1574 9.41179 32 10.6254 32C11.1108 32 11.5662 31.8656 11.9567 31.6305L11.9877 31.6118L22.9229 25.1593L17.8048 19.4617Z"
        fill="#EA4335"
      />
      <path
        d="M27.6331 17.6662L27.624 17.6597L22.9028 14.8612L17.5839 19.7013L22.9219 25.1582L27.6176 22.3878C28.4406 21.9324 29 21.045 29 20.0223C29 19.0052 28.4489 18.1225 27.6331 17.6662Z"
        fill="#FBBC04"
      />
      <path
        d="M8.08942 9.99331C8.03102 10.2135 8 10.4449 8 10.6838V29.3163C8 29.5552 8.03102 29.7866 8.09034 30.0059L18.1386 19.7313L8.08942 9.99331Z"
        fill="#4285F4"
      />
      <path
        d="M17.8766 19.9999L22.9044 14.8594L11.9819 8.38351C11.585 8.13996 11.1214 8 10.626 8C9.41237 8 8.38856 8.84447 8.09018 9.99034C8.09018 9.99127 8.08926 9.9922 8.08926 9.99314L17.8766 19.9999Z"
        fill="#34A853"
      />
      <path
        d="M43.61 11.71C43.61 12.71 43.3133 13.5067 42.72 14.1C42.0533 14.8067 41.1767 15.16 40.09 15.16C39.05 15.16 38.17 14.8 37.45 14.08C36.73 13.36 36.37 12.4733 36.37 11.42C36.37 10.3667 36.73 9.48 37.45 8.76C38.17 8.04 39.05 7.68 40.09 7.68C40.6167 7.68 41.1133 7.77333 41.58 7.96C42.0467 8.14667 42.43 8.41 42.73 8.75L42.07 9.41C41.85 9.14333 41.5633 8.93667 41.21 8.79C40.8633 8.63667 40.49 8.56 40.09 8.56C39.31 8.56 38.65 8.83 38.11 9.37C37.5767 9.91667 37.31 10.6 37.31 11.42C37.31 12.24 37.5767 12.9233 38.11 13.47C38.65 14.01 39.31 14.28 40.09 14.28C40.8033 14.28 41.3967 14.08 41.87 13.68C42.3433 13.28 42.6167 12.73 42.69 12.03H40.09V11.17H43.56C43.5933 11.3567 43.61 11.5367 43.61 11.71ZM48.9078 7.84V8.72H45.6478V10.99H48.5878V11.85H45.6478V14.12H48.9078V15H44.7278V7.84H48.9078ZM52.5877 8.72V15H51.6677V8.72H49.6677V7.84H54.5877V8.72H52.5877ZM58.6654 15H57.7454V7.84H58.6654V15ZM62.5487 8.72V15H61.6287V8.72H59.6287V7.84H64.5487V8.72H62.5487ZM74.521 11.42C74.521 12.48 74.1677 13.3667 73.461 14.08C72.7477 14.8 71.8743 15.16 70.841 15.16C69.801 15.16 68.9277 14.8 68.221 14.08C67.5143 13.3667 67.161 12.48 67.161 11.42C67.161 10.36 67.5143 9.47333 68.221 8.76C68.9277 8.04 69.801 7.68 70.841 7.68C71.881 7.68 72.7543 8.04333 73.461 8.77C74.1677 9.48333 74.521 10.3667 74.521 11.42ZM68.101 11.42C68.101 12.2467 68.361 12.93 68.881 13.47C69.4077 14.01 70.061 14.28 70.841 14.28C71.621 14.28 72.271 14.01 72.791 13.47C73.3177 12.9367 73.581 12.2533 73.581 11.42C73.581 10.5867 73.3177 9.90333 72.791 9.37C72.271 8.83 71.621 8.56 70.841 8.56C70.061 8.56 69.4077 8.83 68.881 9.37C68.361 9.91 68.101 10.5933 68.101 11.42ZM76.5267 15H75.6067V7.84H76.7267L80.2067 13.41H80.2467L80.2067 12.03V7.84H81.1267V15H80.1667L76.5267 9.16H76.4867L76.5267 10.54V15Z"
        fill="white"
      />
      <path
        d="M93.5181 31.4097H95.1469V20.3981H93.5181V31.4097ZM108.189 24.3646L106.322 29.1388H106.266L104.328 24.3646H102.573L105.479 31.0371L103.823 34.749H105.521L110 24.3646H108.189ZM98.9519 30.1588C98.4176 30.1588 97.6739 29.8902 97.6739 29.2234C97.6739 28.3742 98.6001 28.0483 99.4005 28.0483C100.116 28.0483 100.454 28.2042 100.889 28.4165C100.762 29.4365 99.892 30.1588 98.9519 30.1588ZM99.1483 24.1241C97.969 24.1241 96.7469 24.6482 96.2424 25.8101L97.6879 26.4188C97.9969 25.8101 98.5721 25.611 99.1762 25.611C100.019 25.611 100.875 26.121 100.889 27.0283V27.1411C100.594 26.971 99.9627 26.7165 99.1902 26.7165C97.632 26.7165 96.0451 27.5806 96.0451 29.1952C96.0451 30.6689 97.323 31.6184 98.7546 31.6184C99.8501 31.6184 100.454 31.1225 100.833 30.5411H100.889V31.3912H102.461V27.1692C102.461 25.2146 101.015 24.1241 99.1483 24.1241ZM89.0821 25.7053H86.7655V21.9308H89.0821C90.2998 21.9308 90.9911 22.9482 90.9911 23.8176C90.9911 24.6711 90.2998 25.7053 89.0821 25.7053ZM89.0402 20.3981H85.1375V31.4097H86.7655V27.2379H89.0402C90.8453 27.2379 92.6199 25.9184 92.6199 23.8176C92.6199 21.7168 90.8453 20.3981 89.0402 20.3981ZM67.7583 30.1606C66.6332 30.1606 65.6913 29.2102 65.6913 27.9047C65.6913 26.5852 66.6332 25.6198 67.7583 25.6198C68.8695 25.6198 69.7406 26.5852 69.7406 27.9047C69.7406 29.2102 68.8695 30.1606 67.7583 30.1606ZM69.6289 24.9812H69.5722C69.2064 24.5417 68.5038 24.1444 67.6178 24.1444C65.7611 24.1444 64.0599 25.7898 64.0599 27.9047C64.0599 30.0047 65.7611 31.6369 67.6178 31.6369C68.5038 31.6369 69.2064 31.2396 69.5722 30.7851H69.6289V31.3251C69.6289 32.7582 68.8695 33.5246 67.6457 33.5246C66.6471 33.5246 66.0282 32.8005 65.7751 32.1901L64.3549 32.7864C64.7626 33.78 65.8458 35 67.6457 35C69.5582 35 71.1757 33.8646 71.1757 31.0978V24.3708H69.6289V24.9812ZM72.3008 31.4097H73.9323V20.3973H72.3008V31.4097ZM76.3362 27.777C76.2943 26.3298 77.4474 25.5916 78.2766 25.5916C78.9243 25.5916 79.4725 25.9176 79.6549 26.3862L76.3362 27.777ZM81.3989 26.528C81.0899 25.6912 80.1472 24.1444 78.2208 24.1444C76.3083 24.1444 74.7196 25.6621 74.7196 27.8907C74.7196 29.9906 76.2943 31.6369 78.4032 31.6369C80.1053 31.6369 81.0899 30.5869 81.4976 29.9765L80.2319 29.1247C79.8103 29.7493 79.2333 30.1606 78.4032 30.1606C77.5739 30.1606 76.983 29.7774 76.6033 29.0261L81.5674 26.9534L81.3989 26.528ZM41.8501 25.2939V26.883H45.6184C45.5058 27.777 45.2107 28.4297 44.7612 28.8834C44.2121 29.4374 43.3541 30.0479 41.8501 30.0479C39.5291 30.0479 37.7152 28.1602 37.7152 25.8189C37.7152 23.4767 39.5291 21.5899 41.8501 21.5899C43.1018 21.5899 44.0157 22.0867 44.6905 22.7254L45.8017 21.604C44.8589 20.6959 43.6081 20 41.8501 20C38.6719 20 36 22.6117 36 25.8189C36 29.0261 38.6719 31.6369 41.8501 31.6369C43.5653 31.6369 44.8589 31.0688 45.8715 30.0047C46.9129 28.9547 47.2358 27.4793 47.2358 26.2866C47.2358 25.9176 47.2079 25.5775 47.1512 25.2939H41.8501ZM51.5208 30.1606C50.3957 30.1606 49.425 29.2243 49.425 27.8907C49.425 26.5421 50.3957 25.6198 51.5208 25.6198C52.6451 25.6198 53.6158 26.5421 53.6158 27.8907C53.6158 29.2243 52.6451 30.1606 51.5208 30.1606ZM51.5208 24.1444C49.4669 24.1444 47.7936 25.7194 47.7936 27.8907C47.7936 30.0479 49.4669 31.6369 51.5208 31.6369C53.5739 31.6369 55.2472 30.0479 55.2472 27.8907C55.2472 25.7194 53.5739 24.1444 51.5208 24.1444ZM59.65 30.1606C58.5249 30.1606 57.5542 29.2243 57.5542 27.8907C57.5542 26.5421 58.5249 25.6198 59.65 25.6198C60.7752 25.6198 61.745 26.5421 61.745 27.8907C61.745 29.2243 60.7752 30.1606 59.65 30.1606ZM59.65 24.1444C57.597 24.1444 55.9237 25.7194 55.9237 27.8907C55.9237 30.0479 57.597 31.6369 59.65 31.6369C61.7031 31.6369 63.3764 30.0479 63.3764 27.8907C63.3764 25.7194 61.7031 24.1444 59.65 24.1444Z"
        fill="white"
      />
    </BadgeShell>
  );
};

const AppStoreBadge = ({ href }) => {
  return (
    <BadgeShell label="Download on the App Store" href={href}>
      <path
        d="M24.705 20.763c.012-.92.262-1.822.727-2.622a5.53 5.53 0 0 1 1.933-1.954 5.65 5.65 0 0 0-1.965-1.71 5.89 5.89 0 0 0-2.541-.668c-1.896-.194-3.733 1.107-4.699 1.107-.985 0-2.472-1.088-4.074-1.056a5.98 5.98 0 0 0-2.93.854 6.18 6.18 0 0 0-2.119 2.153c-2.183 3.69-.555 9.114 1.536 12.097 1.047 1.461 2.27 3.092 3.87 3.035 1.566-.064 2.15-.975 4.041-.975 1.872 0 2.421.975 4.053.938 1.681-.027 2.739-1.467 3.749-2.942A12.29 12.29 0 0 0 28 25.612a5.43 5.43 0 0 1-2.395-1.94 5.25 5.25 0 0 1-.9-2.909Z"
        fill="white"
      />
      <path
        d="M21.621 11.847c.916-1.074 1.367-2.454 1.258-3.847a5.64 5.64 0 0 0-3.621 1.829 5.36 5.36 0 0 0-1.291 3.705 4.8 4.8 0 0 0 2.025-.433 4.95 4.95 0 0 0 1.629-1.254Z"
        fill="white"
      />
      <text
        x="36"
        y="14.5"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="8.5"
        fontWeight="500"
      >
        Download on the
      </text>
      <text
        x="36"
        y="31"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="17"
        fontWeight="500"
      >
        App Store
      </text>
    </BadgeShell>
  );
};

const AppGalleryBadge = ({ href }) => {
  return (
    <BadgeShell label="Explore it on AppGallery" href={href} width={142}>
      <rect x="9.5" y="7.5" width="28" height="25" rx="5.5" fill="#D90B34" />
      <path
        d="M20.25 11.3c.62 3.42 1.66 5.1 3.25 5.1s2.63-1.68 3.25-5.1"
        stroke="white"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <text
        x="23.5"
        y="26.8"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="5.3"
        fontWeight="800"
        letterSpacing=".22"
      >
        HUAWEI
      </text>
      <text
        x="46"
        y="14"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.9"
        fontWeight="800"
      >
        EXPLORE IT ON
      </text>
      <text
        x="46"
        y="31"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="17.5"
        fontWeight="700"
      >
        AppGallery
      </text>
    </BadgeShell>
  );
};

const Stat = ({ value, label }) => (
  <div>
    <b>{value}</b>
    <span>{label}</span>
  </div>
);

export default Hero;
