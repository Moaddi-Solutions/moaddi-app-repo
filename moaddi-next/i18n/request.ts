import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers as getHeaders } from "next/headers";
import ar from "../messages/ar.json";
import en from "../messages/en.json";
import it from "../messages/it.json";
import zh from "../messages/zh.json";

const locales = ["en", "ar", "zh", "it"] as const;
type AppLocale = (typeof locales)[number];
const defaultLocale: AppLocale = "en";

const messagesByLocale: Record<AppLocale, typeof en> = { en, ar, zh, it };

const getLocale: () => Promise<string> = async () => {
  let locale: string | undefined;
  const cookieStore = await cookies();
  if ((locale = cookieStore.get("NEXT_LOCALE")?.value)) return locale;
  const headers = Object.fromEntries((await getHeaders()).entries());
  const languages = new Negotiator({ headers }).languages([...locales]);
  return match(languages, [...locales], defaultLocale);
};
export default getRequestConfig(async () => {
  const resolved = await getLocale();
  const locale: AppLocale = locales.includes(resolved as AppLocale)
    ? (resolved as AppLocale)
    : defaultLocale;
  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
