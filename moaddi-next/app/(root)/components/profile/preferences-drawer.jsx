"use client";

import { themeContext } from "@/(root)/context/Theme";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/../components/ui/drawer";
import rtlRules from "@/../i18n/rtl";
import { useTheme } from "@/../lib/use-theme";
import { Check, Languages, Moon, Sun, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useContext } from "react";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "zh", label: "中文" },
  { code: "it", label: "Italiano" },
];

export default function PreferencesDrawer({ open, onOpenChange }) {
  const [dark, toggleTheme] = useTheme();
  const { setLocale } = useContext(themeContext);
  const locale = useLocale();
  const t = useTranslations("BottomNavigation");

  const selectTheme = (nextDark) => {
    if (dark !== nextDark) toggleTheme();
  };

  const selectLocale = (code) => {
    if (code === locale) {
      onOpenChange(false);
      return;
    }

    onOpenChange(false);
    setLocale(code);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle
      swipeDirection="down"
    >
      <DrawerContent className="moaddi-settings-sheet">
        <DrawerHeader className="moaddi-settings-sheet-header">
          <div>
            <DrawerTitle className="text-lg font-black">
              {t("settingsTitle")}
            </DrawerTitle>
            <DrawerDescription className="mt-1">
              {t("settingsDescription")}
            </DrawerDescription>
          </div>
          <DrawerClose
            className="moaddi-settings-close"
            aria-label={t("close")}
          >
            <X aria-hidden="true" />
          </DrawerClose>
        </DrawerHeader>

        <div className="moaddi-settings-body">
          <section aria-labelledby="appearance-heading">
            <h3 id="appearance-heading" className="moaddi-settings-label">
              {t("appearance")}
            </h3>
            <div className="moaddi-theme-options">
              <button
                type="button"
                className="moaddi-setting-option"
                data-active={!dark}
                aria-pressed={!dark}
                onClick={() => selectTheme(false)}
              >
                <Sun aria-hidden="true" />
                <span>{t("light")}</span>
                {!dark ? <Check aria-hidden="true" /> : null}
              </button>
              <button
                type="button"
                className="moaddi-setting-option"
                data-active={dark}
                aria-pressed={dark}
                onClick={() => selectTheme(true)}
              >
                <Moon aria-hidden="true" />
                <span>{t("dark")}</span>
                {dark ? <Check aria-hidden="true" /> : null}
              </button>
            </div>
          </section>

          <section aria-labelledby="language-heading">
            <h3 id="language-heading" className="moaddi-settings-label">
              <Languages aria-hidden="true" />
              {t("language")}
            </h3>
            <div className="moaddi-language-options">
              {LOCALES.map(({ code, label }) => {
                const active = code === locale;

                return (
                  <button
                    key={code}
                    type="button"
                    lang={code}
                    dir={rtlRules[code] ? "rtl" : "ltr"}
                    className="moaddi-setting-option"
                    data-active={active}
                    aria-pressed={active}
                    onClick={() => selectLocale(code)}
                  >
                    <span>{label}</span>
                    {active ? <Check aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
