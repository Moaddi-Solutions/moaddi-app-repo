"use client";
import theme from "@/(root)/theme";
import rtlRules from "@/../i18n/rtl";
import { setUserLocale } from "@/../services/locale";
import { ThemeProvider } from "@mui/material/styles";
import { DirectionProvider } from "@radix-ui/react-direction";
import Cookies from "js-cookie";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createContext } from "react";
const themeContext = createContext();
function ThemeContextProvider({ children }) {
  const locale = useLocale();
  const router = useRouter();
  // const [rtl, setRtl] = useState(rtlRules[locale]);
  const setLocale = (locale) => {
    // startTransition(() => {
    Cookies.set("NEXT_LOCALE", locale);
    setUserLocale(locale).then(() => router.push("/"));
    // });
  };
  return (
    <themeContext.Provider value={{ rtl: rtlRules[locale], setLocale }}>
      <DirectionProvider dir={rtlRules[locale] ? "rtl" : "ltr"}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </DirectionProvider>
    </themeContext.Provider>
  );
}

export { themeContext, ThemeContextProvider };
