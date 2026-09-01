"use client";

import PreferencesDrawer from "@/(root)/components/profile/preferences-drawer";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Mobile/tablet counterpart to <Header>, which is hidden below 1024px in
// favour of the bottom dock. Reuses the profile settings drawer for the
// language picker so both surfaces stay in sync.
export default function MobileHeader() {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const t = useTranslations("BottomNavigation");

  return (
    <>
      <header className="moaddi-mobile-head">
        <button
          type="button"
          className="moaddi-mobile-lang-btn"
          aria-label={t("language")}
          aria-haspopup="dialog"
          aria-expanded={prefsOpen}
          onClick={() => setPrefsOpen(true)}
        >
          <Globe aria-hidden="true" />
        </button>
      </header>
      <PreferencesDrawer open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  );
}
