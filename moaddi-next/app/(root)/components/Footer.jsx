import { SocialMediaIcons } from "@/(root)/components/SocialMediaIcons";
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
    body: "Smart vending machines across Saudi Arabia. Scan, pick, pay — and grab your snack in seconds.",
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
    bottomLinks: [
      { title: "© 2026 Moaddi. All rights reserved." },
      { title: "Payments secured by Moyasar · مودي للبيع الذاتي" },
    ],
  },
  ar: {
    title: "معدي",
    body: "ماكينات بيع ذاتي ذكية في جميع أنحاء المملكة العربية السعودية. امسح، اختر، ادفع — واحصل على وجبتك الخفيفة في ثوانٍ.",
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
    bottomLinks: [
      { title: "© 2026 معدي. جميع الحقوق محفوظة." },
      { title: "المدفوعات مؤمنة بواسطة ميسر · مودي للبيع الذاتي" },
    ],
  },
  zh: {
    title: "Moaddi",
    body: "遍布沙特阿拉伯的智能自动售货机。扫描、选购、支付 — 几秒钟内取走你的零食。",
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
    bottomLinks: [
      { title: "© 2026 Moaddi。保留所有权利。" },
      { title: "支付由 Moyasar 提供安全保障 · مودي للبيع الذاتي" },
    ],
  },
  it: {
    title: "Moaddi",
    body: "Distributori automatici intelligenti in tutta l'Arabia Saudita. Scansiona, scegli, paga — e prendi il tuo snack in pochi secondi.",
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
    bottomLinks: [
      { title: "© 2026 Moaddi. Tutti i diritti riservati." },
      { title: "Pagamenti protetti da Moyasar · مودي للبيع الذاتي" },
    ],
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

const normalizeHref = (url) => {
  if (!url) return "/";
  if (/^https?:\/\//.test(url)) return url;
  if (url === "home" || url === "/home") return "/";
  return url.startsWith("/") ? url : `/${url}`;
};

const Footer = ({ body, title, links, bottomLinks, socialMedia }) => {
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
  const bottom = bottomLinks?.length ? bottomLinks : fallback.bottomLinks;

  return (
    <footer className="bg-primary-900 mt-14 text-[#bcd8de]">
      <Container
        variant="breakpoint"
        className={`grid grid-cols-1 gap-7.5 pt-11.5 pb-7.5 sm:grid-cols-2 ${footerGridClass(columns.length)}`}
      >
        <div>
          <h4 className="mb-2.5 text-sm font-extrabold text-white">
            {brandTitle}
          </h4>
          <p className="max-w-[34ch] text-[13px]">{brandBody}</p>
          <SocialMediaIcons
            items={socialMedia}
            variant="tile"
            size="md"
            className="mt-3.5 gap-2.5"
          />
        </div>
        {columns.map(([category, items]) => (
          <div key={category}>
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
          className="flex flex-wrap justify-between gap-3.5 py-4 text-xs"
        >
          {bottom.map(({ title, url }, i) =>
            url ? (
              <Link
                key={i}
                href={normalizeHref(url)}
                className="transition-colors hover:text-white"
              >
                {title}
              </Link>
            ) : (
              <span key={i}>{title}</span>
            ),
          )}
        </Container>
      </div>
    </footer>
  );
};

export default Footer;
