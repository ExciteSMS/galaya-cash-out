import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "ny" | "bem";

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ny: "Chinyanja", bem: "Chibemba" };

const en = {
  "nav.home": "Home",
  "nav.sale": "Sale",
  "nav.history": "History",
  "nav.wallet": "Wallet",
  "nav.settings": "Settings",
  "auth.terminal": "Payment Terminal",
  "auth.signIn": "Sign In",
  "auth.register": "Register",
  "auth.enterPhone": "Enter Phone Number",
  "auth.continue": "Continue →",
  "auth.enterPin": "Enter PIN",
  "auth.createPin": "Create 4-Digit PIN",
  "auth.forgotPin": "Forgot PIN?",
  "auth.changeNumber": "← Change Number",
  "auth.businessName": "Business Name",
  "auth.processing": "PROCESSING...",
  "settings.title": "Settings",
  "settings.manage": "Manage your POS",
  "settings.language": "Language",
  "settings.signOut": "Sign Out",
} as const;

export type MessageKey = keyof typeof en;
type Dictionary = Partial<Record<MessageKey, string>>;

// Translations should be reviewed by a native speaker; missing keys fall back to English.
const ny: Dictionary = {
  "nav.home": "Kunyumba",
  "nav.sale": "Gulitsa",
  "nav.history": "Mbiri",
  "nav.wallet": "Chikwama",
  "nav.settings": "Zosintha",
  "auth.terminal": "Malo Olipira",
  "auth.signIn": "Lowani",
  "auth.register": "Lembetsani",
  "auth.enterPhone": "Lowetsani Nambala ya Foni",
  "auth.continue": "Pitirizani →",
  "auth.enterPin": "Lowetsani PIN",
  "auth.createPin": "Pangani PIN ya Manambala 4",
  "auth.forgotPin": "Mwayiwala PIN?",
  "auth.changeNumber": "← Sinthani Nambala",
  "auth.businessName": "Dzina la Bizinesi",
  "auth.processing": "ZIKUGWIRA NTCHITO...",
  "settings.title": "Zosintha",
  "settings.manage": "Yendetsani POS yanu",
  "settings.language": "Chilankhulo",
  "settings.signOut": "Tulukani",
};

const bem: Dictionary = {
  "nav.home": "Kumwanda",
  "nav.sale": "Ukushitisha",
  "nav.history": "Ifyaliweo",
  "nav.wallet": "Akasaka",
  "nav.settings": "Ukusalulula",
  "auth.terminal": "Icifulo ca Kubomba",
  "auth.signIn": "Ingila",
  "auth.register": "Lembeshya",
  "auth.enterPhone": "Lemba Inambala ya Funi",
  "auth.continue": "Fwaya →",
  "auth.enterPin": "Lemba PIN",
  "auth.createPin": "Pangeni PIN ya Inambala 4",
  "auth.forgotPin": "Mwaluba PIN?",
  "auth.changeNumber": "← Soka Inambala",
  "auth.businessName": "Ishina lya Bwingi",
  "auth.processing": "ULEBOMBA...",
  "settings.title": "Ukusalulula",
  "settings.manage": "Lolesheni POS yobe",
  "settings.language": "Ululimi",
  "settings.signOut": "Fuma",
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, ny, bem };
const STORAGE_KEY = "galaya_locale";

export function translate(locale: Locale, key: MessageKey): string {
  return DICTIONARIES[locale][key] ?? en[key];
}

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "ny" || value === "bem";
}

interface I18nContextValue { locale: Locale; setLocale: (l: Locale) => void; t: (key: MessageKey) => string }
const I18nContext = createContext<I18nContextValue>({ locale: "en", setLocale: () => {}, t: (k) => en[k] });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return isLocale(saved) ? saved : "en";
  });
  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
  }, []);
  const value = useMemo(() => ({ locale, setLocale, t: (key: MessageKey) => translate(locale, key) }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
