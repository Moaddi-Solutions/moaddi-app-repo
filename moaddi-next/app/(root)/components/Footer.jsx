import { SocialMediaIcons } from "@/(root)/components/SocialMediaIcons";
import StrapiImage from "@/(root)/components/StrapiImage";
import {
  AppGalleryBadge,
  AppStoreBadge,
  GooglePlayBadge,
} from "@/(root)/components/StoreBadges";
import { Container } from "@/../components/ui/container";
import { grouped } from "@/../lib/utils";
import { useLocale } from "next-intl";
import Link from "next/link";

/**
 * Fallback Footer content, used when the dashboard ({locale}FooterBody)
 * returns nothing for a given field. Edit these defaults to change what
 * renders before/without dashboard data.
 */
const FOOTER_FALLBACK = {
  en: {
    title: "Moaddi",
    body: "Smart vending machines across World. Scan, pick, pay — and Collect your product in seconds.",
    // Grouped by `category` — each becomes a footer column.
    links: [
      { category: "Shop", title: "Products", url: "/products" },
      { category: "Shop", title: "Machines", url: "/machines" },
      { category: "Legal", title: "Privacy policy", url: "/privacy-policy" },
      {
        category: "Legal",
        title: "Terms and conditions",
        url: "/terms-and-conditions",
      },
    ],
    copyright: "© 2026 Moaddi. All rights reserved.",
  },
  ar: {
    title: "Moaddi",
    body: "ماكينات بيع ذاتي ذكية حول العالم. امسح، اختر، ادفع — واحصل على منتجك في ثوانٍ.",
    links: [
      { category: "المتجر", title: "المنتجات", url: "/products" },
      { category: "المتجر", title: "الماكينات", url: "/machines" },
      { category: "قانوني", title: "سياسة الخصوصية", url: "/privacy-policy" },
      {
        category: "قانوني",
        title: "الشروط والأحكام",
        url: "/terms-and-conditions",
      },
    ],
    copyright: "© 2026 معدي. جميع الحقوق محفوظة.",
  },
  zh: {
    title: "Moaddi",
    body: "遍布全球的智能自动售货机。扫描、选购、支付 — 几秒钟内取走你的商品。",
    links: [
      { category: "商店", title: "产品", url: "/products" },
      { category: "商店", title: "机器", url: "/machines" },
      { category: "法律", title: "隐私政策", url: "/privacy-policy" },
      {
        category: "法律",
        title: "条款和条件",
        url: "/terms-and-conditions",
      },
    ],
    copyright: "© 2026 Moaddi。保留所有权利。",
  },
  it: {
    title: "Moaddi",
    body: "Distributori automatici intelligenti in tutto il mondo. Scansiona, scegli, paga — e ritira il tuo prodotto in pochi secondi.",
    links: [
      { category: "Negozio", title: "Prodotti", url: "/products" },
      { category: "Negozio", title: "Macchine", url: "/machines" },
      { category: "Legale", title: "Informativa sulla privacy", url: "/privacy-policy" },
      {
        category: "Legale",
        title: "Termini e condizioni",
        url: "/terms-and-conditions",
      },
    ],
    copyright: "© 2026 Moaddi. Tutti i diritti riservati.",
  },
};

// A footer link row is valid only when it has BOTH a title and a url.
const isValidLink = (link) =>
  Boolean(link?.title?.trim?.() && link?.url?.trim?.());

// md+ grid: a wide brand column (1.4fr) plus one 1fr per rendered category.
// Full literal class strings so Tailwind's JIT picks them up.
const FOOTER_GRID_CLASSES = {
  1: "md:grid-cols-[1.4fr_1fr]",
  2: "md:grid-cols-[1.4fr_1fr_1fr]",
  3: "md:grid-cols-[1.4fr_1fr_1fr_1fr]",
  4: "md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]",
};

const footerGridClass = (count) =>
  FOOTER_GRID_CLASSES[count] ?? "md:grid-cols-[1.4fr_1fr_1fr_1fr]";

// Same store links as the Hero section's CTA badges, shared across every
// locale — only used when the "site" dashboard entry has none set.
const STORE_URLS_FALLBACK = {
  appStoreUrl: "https://apps.apple.com/us/app/moaddi/id6753565231",
  googlePlayUrl:
    "https://play.google.com/store/apps/details?id=com.moaddi&hl=ar",
  appGalleryUrl: "https://appgallery.huawei.com/app/C115473181",
};

const normalizeHref = (url) => {
  if (!url) return "/";
  if (/^https?:\/\//.test(url)) return url;
  if (url === "home" || url === "/home") return "/";
  return url.startsWith("/") ? url : `/${url}`;
};

const Footer = ({
  body,
  title,
  links,
  logo,
  socialMedia,
  appStoreUrl,
  googlePlayUrl,
  appGalleryUrl,
}) => {
  const locale = useLocale();
  const fallback = FOOTER_FALLBACK[locale] ?? FOOTER_FALLBACK.en;
  const brandTitle = title || fallback.title;
  const brandBody = body || fallback.body;

  // Keep only rows with both title + url; if the dashboard yields none,
  // fall back to the hardcoded links. Empty categories drop out naturally.
  const validLinks = (links ?? []).filter(isValidLink);
  const columns = grouped(
    validLinks.length ? validLinks : fallback.links,
    "category",
  );

  return (
    <footer className="bg-primary-900 mt-14 text-[#bcd8de]">
      <Container
        variant="breakpoint"
        className={`grid grid-cols-1 justify-items-center gap-7.5 pt-11.5 pb-7.5 text-center sm:grid-cols-2 md:justify-items-stretch md:text-start ${footerGridClass(columns.length)}`}
      >
        <div className="flex flex-col items-center md:items-start">
          <StrapiImage
            src={logo || "/images/icon-new.jpg"}
            alt="Moaddi"
            width={50}
            height={50}
            className="mb-2.5 rounded-lg"
          />
          <h4 className="mb-2.5 text-sm font-extrabold text-white">
            {brandTitle}
          </h4>
          <p className="max-w-[34ch] text-[13px]">{brandBody}</p>
          <SocialMediaIcons
            items={socialMedia}
            variant="tile"
            size="md"
            className="mt-3.5 justify-center gap-2.5 md:justify-start"
          />
          <div className="moaddi-store-row mx-auto mt-3.5 max-w-70 md:mx-0">
            <GooglePlayBadge
              href={googlePlayUrl || STORE_URLS_FALLBACK.googlePlayUrl}
            />
            <AppStoreBadge
              href={appStoreUrl || STORE_URLS_FALLBACK.appStoreUrl}
            />
            <AppGalleryBadge
              href={appGalleryUrl || STORE_URLS_FALLBACK.appGalleryUrl}
            />
          </div>
        </div>
        {columns.map(([category, items]) => (
          <div key={category} className="w-full">
            <h4 className="mb-2.5 text-sm font-extrabold text-white">
              {category}
            </h4>
            <ul className="grid gap-1.75 text-[13px] font-semibold">
              {items.map(({ title, url }) => (
                <li key={title}>
                  <Link
                    href={normalizeHref(url)}
                    className="transition-colors hover:text-white"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-white/10">
        <Container
          variant="breakpoint"
          className="py-4 text-center text-xs"
        >
          {fallback.copyright}
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
