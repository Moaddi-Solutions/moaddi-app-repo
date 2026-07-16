import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import arTranslation from "./locales/ar.json";
import enTranslation from "./locales/en.json";
import itTranslation from "./locales/it.json";
import zhTranslation from "./locales/zh.json";

export const SUPPORTED_LANGUAGES = ["en", "ar", "zh", "it"];

/** AsyncStorage key: set when the user manually picks a language. */
export const LANGUAGE_KEY = "user-language";

const deviceLanguage = getLocales()[0]?.languageCode;
const defaultLanguage = SUPPORTED_LANGUAGES.includes(deviceLanguage)
  ? deviceLanguage
  : "ar";

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ar: {
        translation: arTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
      it: {
        translation: itTranslation,
      },
    },
    lng: defaultLanguage, // device language when supported, otherwise Arabic
    fallbackLng: "ar", // fallback language
    interpolation: {
      escapeValue: false, // react already escapes by default
    },
  });

// A manually chosen language overrides device detection on later launches.
// Registered after init() so the initial detection itself is not persisted.
i18n.on("languageChanged", (lng) => {
  AsyncStorage.setItem(LANGUAGE_KEY, lng).catch(() => {});
});

AsyncStorage.getItem(LANGUAGE_KEY)
  .then((stored) => {
    if (
      stored &&
      SUPPORTED_LANGUAGES.includes(stored) &&
      stored !== i18n.language
    ) {
      i18n.changeLanguage(stored);
    }
  })
  .catch(() => {});

export default i18n;
