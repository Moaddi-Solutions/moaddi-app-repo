"use client";
import rtlRules from "@/../i18n/rtl";
import { setUserLocale } from "@/../services/locale";
import { DirectionProvider } from "@radix-ui/react-direction";
import Cookies from "js-cookie";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createContext, useTransition } from "react";
const themeContext = createContext();
function ThemeContextProvider({ children }) {
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  // const [rtl, setRtl] = useState(rtlRules[locale]);
  const setLocale = (locale) => {
    Cookies.set("NEXT_LOCALE", locale, { path: "/" });
    startTransition(() => {
      setUserLocale(locale).then(() => router.refresh());
    });
  };
  return (
    <themeContext.Provider value={{ rtl: rtlRules[locale], setLocale }}>
      <DirectionProvider dir={rtlRules[locale] ? "rtl" : "ltr"}>
        {children}
      </DirectionProvider>
    </themeContext.Provider>
  );
}

export { themeContext, ThemeContextProvider };
