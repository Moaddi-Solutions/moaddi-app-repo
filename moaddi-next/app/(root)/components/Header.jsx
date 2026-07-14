"use client";

import StrapiImage from "@/(root)/components/StrapiImage";
import { useCart } from "@/(root)/context/cart-provider";
import { themeContext } from "@/(root)/context/Theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/../components/ui/dropdown-menu";
import rtlRules from "@/../i18n/rtl";
import { cn } from "@/../lib/utils";
import { useTheme } from "@/../lib/use-theme";
import { Languages, Menu, Moon, ScanQrCode, Sun, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useMemo, useState } from "react";

// Used only when the dashboard (HeaderLinks) yields no direct links at all.
const FALLBACK_NAV_ITEMS = {
  en: [
    { title: "Home", href: "/" },
    { title: "Products", href: "/products" },
    { title: "Shops", href: "/shops" },
    { title: "Machines", href: "/machines" },
  ],
  ar: [
    { title: "الرئيسية", href: "/" },
    { title: "المنتجات", href: "/products" },
    { title: "المتاجر", href: "/shops" },
    { title: "الماكينات", href: "/machines" },
  ],
  zh: [
    { title: "首页", href: "/" },
    { title: "产品", href: "/products" },
    { title: "商店", href: "/shops" },
    { title: "机器", href: "/machines" },
  ],
  it: [
    { title: "Home", href: "/" },
    { title: "Prodotti", href: "/products" },
    { title: "Negozi", href: "/shops" },
    { title: "Macchine", href: "/machines" },
  ],
};

const tagline = {
  en: "Vending Machine",
  ar: "بيع ذاتي ذكي",
  zh: "自动售货机",
  it: "Distributore automatico",
};

const LOCALES = [
  { code: "en", label: "English" },
  { code: "ar", label: "عربي" },
  { code: "zh", label: "中文" },
  { code: "it", label: "Italiano" },
];

export default function Header({ items = [], logo }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const locale = useLocale();
  const navItems = useNavItems(items, locale);

  return (
    <header className={cn("moaddi-site-head", menuOpen && "menu-open")}>
      <div className="moaddi-header-wrap moaddi-header-inner">
        <Logo src={logo} />
        <MainNav items={navItems} />
        <div className="moaddi-head-actions">
          <ThemeToggle />
          <LocaleToggle />
          <ScanLink />
          <ProfileAvatar />
          <button
            id="menu-btn"
            className="moaddi-menu-btn"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </div>
      <MobileNav items={navItems} onNavigate={() => setMenuOpen(false)} />
    </header>
  );
}

// Header links are flat records: { title, url }. A record needs both to
// render — same rule as the footer links.
function useNavItems(items, locale) {
  return useMemo(() => {
    const dynamicItems = (items ?? [])
      .filter(({ title, url }) => title?.trim?.() && url?.trim?.())
      .map(({ title, url }) => ({ title, href: normalizeHref(url) }));

    // Use dashboard links if any exist; otherwise fall back to hardcoded nav.
    return dynamicItems.length > 0
      ? dynamicItems
      : (FALLBACK_NAV_ITEMS[locale] ?? FALLBACK_NAV_ITEMS.en);
  }, [items, locale]);
}

function normalizeHref(url) {
  if (!url || url === "home" || url === "/home") return "/";
  return url.startsWith("/") ? url : `/${url}`;
}

function MainNav({ items }) {
  const pathname = usePathname();

  return (
    <nav className="moaddi-main-nav" aria-label="Site">
      {items.map(({ title, href }) => (
        <Link
          key={`${title}-${href}`}
          href={href}
          data-active={isActivePath(pathname, href)}
        >
          {title}
        </Link>
      ))}
    </nav>
  );
}

function MobileNav({ items, onNavigate }) {
  const pathname = usePathname();

  return (
    <nav id="mobile-nav" className="moaddi-mobile-nav" aria-label="Site mobile">
      <div className="moaddi-header-wrap moaddi-mobile-nav-inner">
        {items.map(({ title, href }) => (
          <Link
            key={`${title}-${href}`}
            href={href}
            data-active={isActivePath(pathname, href)}
            onClick={onNavigate}
          >
            {title}
          </Link>
        ))}
        <MobileLocale />
      </div>
    </nav>
  );
}

// The header LocaleToggle is hidden on mobile (no room in the top bar), so the
// language switcher lives inside the hamburger menu on small screens instead.
function MobileLocale() {
  const { setLocale } = useContext(themeContext);
  const locale = useLocale();

  return (
    <div className="moaddi-mobile-lang">
      <span className="moaddi-mobile-lang-label">
        <Languages aria-hidden="true" className="size-4" />
      </span>
      <div className="moaddi-mobile-lang-options">
        {LOCALES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            lang={code}
            dir={rtlRules[code] ? "rtl" : "ltr"}
            data-active={code === locale}
            onClick={() => setLocale(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function isActivePath(pathname, href) {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle() {
  const [dark, toggle] = useTheme();

  return (
    <button
      id="theme-toggle"
      className="moaddi-theme-toggle"
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

function LocaleToggle() {
  const { setLocale } = useContext(themeContext);
  const locale = useLocale();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="moaddi-lang"
        aria-label="Change language"
      >
        <Languages aria-hidden="true" className="size-4" />
        <span>{current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            lang={code}
            dir={rtlRules[code] ? "rtl" : "ltr"}
            data-active={code === locale}
            onClick={() => setLocale(code)}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScanLink() {
  const t = useTranslations("Header");

  return (
    <Link className="moaddi-scan-btn" href="/machine-scan">
      <ScanQrCode aria-hidden="true" />
      <span className="moaddi-btn-label">{t("scanMachine")}</span>
    </Link>
  );
}

function ProfileAvatar() {
  const { user } = useCart();
  const t = useTranslations("Header");

  if (!user) {
    return (
      <Link className="moaddi-signin-btn" href="/signin">
        <UserRound aria-hidden="true" />
        <span className="moaddi-btn-label">{t("signIn")}</span>
      </Link>
    );
  }

  return (
    <Link className="moaddi-avatar" href="/profile" aria-label="Profile">
      {getInitials(user.name)}
    </Link>
  );
}

function getInitials(name) {
  if (typeof name !== "string" || !name.trim()) return "?";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Logo({ className, src }) {
  const locale = useLocale();

  return (
    <Link href="/" prefetch={false} className={cn("moaddi-brand", className)}>
      <StrapiImage
        src={src || "/images/icon-new.jpg"}
        alt="Moaddi"
        width={42}
        height={42}
      />
      <span>
        Moaddi
        <small>{tagline[locale] ?? tagline.en}</small>
      </span>
    </Link>
  );
}
