import { DEFAULT_LANG, isLang } from "./i18n";

/* Written by middleware.js from the request's geo headers, read by I18nProvider.
   Deliberately NOT the same key as the user's saved choice (LS_LANG): this is a
   guess, and a guess must never overwrite something the user picked by hand. */
export const GEO_LANG_COOKIE = "hoodscope.geo-lang";

/* Header each host puts the caller's ISO-3166-1 alpha-2 country in. Checked in
   order, so the platform running us wins over anything a proxy tacked on. */
const COUNTRY_HEADERS = [
  "x-vercel-ip-country", // Vercel
  "cf-ipcountry", // Cloudflare
  "x-nf-client-connection-country", // Netlify
  "fastly-geo-country",
  "x-appengine-country", // Google Cloud
  "x-geo-country", // generic reverse proxies
];

/* Country → the language we actually ship for it. A country is listed ONLY when
   one of LANGUAGES is the language its people read; every other country — ID, DE,
   FR, BR… — is absent on purpose and resolves to English. Serving a visitor a
   language we do not have is not an option, and serving them a *neighbouring*
   language (Portuguese speakers Spanish, say) is worse than serving English. */
const COUNTRY_LANG = {
  // 中文
  CN: "zh",
  TW: "zh",
  HK: "zh",
  MO: "zh",

  // 日本語
  JP: "ja",

  // 한국어
  KR: "ko",
  KP: "ko",

  // Español — Spain plus the Spanish-speaking Americas. Excludes BR (Portuguese)
  // and BZ (English), which border them but do not read Spanish.
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  BO: "es",
  PY: "es",
  UY: "es",
  CR: "es",
  CU: "es",
  DO: "es",
  SV: "es",
  GT: "es",
  HN: "es",
  NI: "es",
  PA: "es",
  PR: "es",
  GQ: "es",
};

/* SG is intentionally not mapped to zh: English is its working language, and a
   Singaporean visitor is better served in English than in Chinese. */

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function countryFromHeaders(headers) {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name);
    if (typeof value !== "string") continue;
    const code = value.trim().toUpperCase();
    /* Cloudflare sends "XX" for clients it cannot place (and "T1" for Tor). */
    if (/^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") return code;
  }
  return null;
}

/* Returns the language for a country, or null when we ship nothing for it —
   null means "fall through", not "English", so the caller can still consult the
   browser's own preference before giving up. */
export function langFromCountry(country) {
  if (typeof country !== "string") return null;
  const code = country.trim().toUpperCase();
  return has(COUNTRY_LANG, code) ? COUNTRY_LANG[code] : null;
}

/* Accept-Language, best-supported-tag-first. "zh-Hant-TW;q=0.9" matches zh on its
   primary subtag, so regional variants of a language we ship still land on it. */
export function langFromAcceptLanguage(header) {
  if (typeof header !== "string" || !header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (tag === "*") continue;
    const base = tag.split("-")[0];
    if (isLang(base)) return base;
  }
  return null;
}

/* The whole policy in one place: where the IP says they are, else what the
   browser asks for, else English. Never returns a language we cannot render. */
export function resolveLang({ country, acceptLanguage } = {}) {
  const byCountry = langFromCountry(country);
  if (byCountry) return byCountry;

  /* A country we recognise but do not have a language for (ID, DE, BR…) is an
     answer, not a gap — English, without second-guessing it via the browser. */
  if (country) return DEFAULT_LANG;

  return langFromAcceptLanguage(acceptLanguage) || DEFAULT_LANG;
}

export function resolveLangFromHeaders(headers) {
  return resolveLang({
    country: countryFromHeaders(headers),
    acceptLanguage: headers.get("accept-language"),
  });
}
