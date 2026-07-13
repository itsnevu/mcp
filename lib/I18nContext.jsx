"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { APP_NAME, CHAIN_NAME } from "./chatContract";
import { DEFAULT_LANG, LANGUAGES, getTranslation, isLang, normalizeLang } from "./i18n";
import { GEO_LANG_COOKIE, langFromAcceptLanguage } from "./geoLang";

const LS_LANG = "hoodscope.lang";

/* The language middleware inferred from the caller's IP. Absent when middleware
   did not run (a cached/offline document, cookies blocked), which is why the
   browser's own preference is still checked after it. */
function geoLangFromCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${GEO_LANG_COOKIE}=([^;]*)`));
  if (!match) return null;
  const code = decodeURIComponent(match[1]);
  return isLang(code) ? code : null;
}

/* navigator.languages is the browser's Accept-Language, so the same parser reads
   both — and both are only consulted for a language we actually ship. */
function browserLang() {
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langFromAcceptLanguage(preferred.filter(Boolean).join(","));
}

/* A language the user picked outranks anything we inferred; an IP outranks a
   browser setting, because the IP is where they are and the browser setting is
   often just whatever the machine shipped with. Nothing found → English. */
function detectLang() {
  try {
    const stored = localStorage.getItem(LS_LANG);
    if (stored !== null) return { code: normalizeLang(stored), stored };
  } catch {}

  try {
    const geo = geoLangFromCookie();
    if (geo) return { code: geo, stored: null };
  } catch {}

  try {
    const browser = browserLang();
    if (browser) return { code: browser, stored: null };
  } catch {}

  return { code: DEFAULT_LANG, stored: null };
}

const I18nContext = createContext(null);

export function useI18n() {
  return useContext(I18nContext);
}

/* Brand tokens every string can reference without the caller passing them. */
const BRAND = { app: APP_NAME, chain: CHAIN_NAME };

export function I18nProvider({ children }) {
  /* Server and first client render both use DEFAULT_LANG so the markup matches;
     the stored language is applied in the effect below. Rendering null until
     hydration (as this used to) would ship an empty <body> for every route. */
  const [activeLang, setActiveLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    const { code, stored } = detectLang();
    /* Rewrite legacy values ("English", "Indonesian", …) to their code so the
       migration runs once rather than on every load. An inferred language is NOT
       written back: leaving it unsaved is what lets a later visit from another
       country (or a new browser locale) be re-detected instead of frozen. */
    if (stored !== null && code !== stored) {
      try {
        localStorage.setItem(LS_LANG, code);
      } catch {}
    }
    setActiveLangState(code);
  }, []);

  /* Keeps <html lang> honest — screen readers and the browser's translate
     prompt read this; app/layout.js only carries the static document default. */
  useEffect(() => {
    document.documentElement.lang = activeLang;
  }, [activeLang]);

  const setActiveLang = useCallback((value) => {
    const code = normalizeLang(value);
    setActiveLangState(code);
    try {
      localStorage.setItem(LS_LANG, code);
    } catch {}
  }, []);

  const t = useCallback(
    (key, vars) => getTranslation(activeLang, key, vars ? { ...BRAND, ...vars } : BRAND),
    [activeLang]
  );

  /* Same as t(), but for strings whose {tokens} resolve to React elements — a
     <Link>, an <em>. Splitting the translated template (rather than concatenating
     fragments in JSX) is what lets a locale put the link wherever its grammar
     wants it. Returns an array of children. */
  const tRich = useCallback(
    (key, nodes) => {
      const template = getTranslation(activeLang, key, BRAND);
      return template.split(/(\{\w+\})/).map((part, i) => {
        const name = part.startsWith("{") && part.endsWith("}") ? part.slice(1, -1) : null;
        const node = name && nodes ? nodes[name] : undefined;
        return <Fragment key={i}>{node === undefined ? part : node}</Fragment>;
      });
    },
    [activeLang]
  );

  const value = useMemo(
    () => ({ activeLang, setActiveLang, t, tRich, languages: LANGUAGES }),
    [activeLang, setActiveLang, t, tRich]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
