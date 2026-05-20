import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// We export the resources so they can be reused or extended
export const resources = {
  en: {
    translation: en,
  },
} as const;

export type TranslationKeys = typeof en;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
export { useTranslation, Trans } from 'react-i18next';
