"use client";

import { useCart } from "@/(root)/context/cart-provider";
import ContactChatButton from "@/(root)/components/chat/ContactChatButton";
import { Dock, DockIcon } from "@/../components/ui/dock";
import { cn } from "@/../lib/utils";
import { House, ScanQrCode, Store, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { key: "home", href: "/", icon: House },
  { key: "shops", href: "/shops", icon: Store },
  { key: "scan", href: "/machine-scan", icon: ScanQrCode, featured: true },
  { key: "profile", href: "/profile", icon: UserRound },
];

export default function BottomNavigation() {
  const { user } = useCart();
  const pathname = usePathname();
  const t = useTranslations("BottomNavigation");
  const profileHref = user ? "/profile" : "/signin";
  const magnificationEnabled = useDockMagnification();
  const profileActive = isActivePath(pathname, "profile", user);

  return (
    <div className="moaddi-bottom-nav">
      <nav aria-label={t("navLabel")}>
        <Dock
          className="moaddi-bottom-dock"
          iconSize={54}
          iconMagnification={66}
          iconDistance={90}
          disableMagnification={!magnificationEnabled}
          direction="bottom"
        >
          {NAV_ITEMS.map(({ key, href, icon: Icon, featured }) => {
            const active = isActivePath(pathname, key, user);

            return (
              <DockIcon
                key={key}
                className={cn(
                  "moaddi-dock-slot",
                  featured && "moaddi-dock-slot-scan",
                )}
                data-active={active}
              >
                <Link
                  href={href}
                  className="moaddi-dock-link"
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon aria-hidden="true" />
                  <span>{t(key)}</span>
                </Link>
              </DockIcon>
            );
          })}

          <DockIcon
            className="moaddi-dock-slot"
            data-active={isActivePath(pathname, "contact", user)}
          >
            <ContactChatButton surface="dock" />
          </DockIcon>


        </Dock>
      </nav>
    </div>
  );
}

function useDockMagnification() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const sync = () => setEnabled(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return enabled;
}

function isActivePath(pathname, key, user) {
  if (key === "home") return pathname === "/" || pathname === "";
  if (key === "shops") {
    return pathname === "/shops" || pathname.startsWith("/shop/");
  }
  if (key === "scan") {
    return (
      pathname === "/machine-scan" ||
      pathname.startsWith("/machine-products") ||
      pathname.startsWith("/group-products")
    );
  }
  if (key === "contact") {
    return pathname.startsWith("/conversations");
  }
  if (key === "profile") {
    if (pathname.startsWith("/profile")) return true;
    return (
      !user &&
      (pathname.startsWith("/signin") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/otp"))
    );
  }
  return false;
}
