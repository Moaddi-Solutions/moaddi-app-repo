// import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import arTranslation from "./locales/ar.json";
import enTranslation from "./locales/en.json";

// const languageDetector = {
//   type: "languageDetector",
//   async: true, // flags below detection to be async
//   detect: (callback) => {
//     return callback(getLocales()[0].languageCode);
//     // return /*'en'; */ getLocales().then(({ locale }) => {
//     //   callback(locale);
//     // });
//   },
//   init: () => {},
//   cacheUserLanguage: () => {},
// };

i18n
  //   .use(languageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ar: {
        translation: arTranslation,
      },
    },
    lng: "ar", // default language
    fallbackLng: "ar", // fallback language
    interpolation: {
      escapeValue: false, // react already escapes by default
    },
  });

export default i18n;
