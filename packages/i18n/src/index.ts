import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

// We export the resources so they can be reused or extended
export const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
} as const;

export type TranslationKeys = typeof en;

export type AppLanguage = 'en' | 'es';

const STORAGE_KEY = 'devdeck_lang';

// Lightweight inline language detection (no extra dependency):
// 1. Stored preference in localStorage, else
// 2. navigator.language ('es*' -> 'es', everything else -> 'en').
function detectLanguage(): AppLanguage {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') {
        return stored;
      }
    }
  } catch {
    // localStorage may be unavailable (SSR, privacy mode) — fall through.
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
    }
  } catch {
    // navigator may be unavailable — fall through.
  }

  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already saves from XSS
    },
    react: {
      useSuspense: false,
    },
  });

// Change the active language and persist the choice for next time.
export function setLanguage(lng: AppLanguage): Promise<unknown> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lng);
    }
  } catch {
    // Ignore persistence failures (SSR, privacy mode).
  }
  return i18n.changeLanguage(lng);
}

export default i18n;
export { useTranslation, Trans } from 'react-i18next';
export type { TFunction } from 'i18next';
