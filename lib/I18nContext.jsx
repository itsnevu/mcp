"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getTranslation, translations } from "./i18n";

const I18nContext = createContext(null);

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }) {
  const [activeLang, setActiveLangState] = useState("English");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const l = localStorage.getItem("hoodscope.lang");
      if (l && translations[l]) {
        setActiveLangState(l);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const setActiveLang = useCallback((lang) => {
    setActiveLangState(lang);
    try {
      localStorage.setItem("hoodscope.lang", lang);
    } catch {}
  }, []);

  const t = useCallback((key) => {
    return getTranslation(activeLang, key);
  }, [activeLang]);

  if (!hydrated) return null; // Avoid hydration mismatch on initial render

  return (
    <I18nContext.Provider value={{ activeLang, setActiveLang, t, languages: Object.keys(translations) }}>
      {children}
    </I18nContext.Provider>
  );
}
