import en from "./locales/en";
import zh from "./locales/zh";
import es from "./locales/es";
import ja from "./locales/ja";
import ko from "./locales/ko";

export const DEFAULT_LANG = "en";

/* Languages are identified by BCP-47 code, never by their label — the label is
   display text and would otherwise become a de facto key that breaks the moment
   it is reworded. `label` is intentionally endonymic (the language's own name). */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

export const translations = { en, zh, es, ja, ko };

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isLang(code) {
  return typeof code === "string" && has(translations, code);
}

/* Values written by earlier builds (which keyed locales by display name, and
   shipped an Indonesian dictionary that no longer exists). Anything unrecognized
   — including "Indonesian" — falls back to English rather than wedging the UI. */
const LEGACY_LANG = {
  English: "en",
  "中文 (Chinese)": "zh",
  Español: "es",
  "日本語 (Japanese)": "ja",
  "한국어 (Korean)": "ko",
};

export function normalizeLang(value) {
  if (isLang(value)) return value;
  if (typeof value === "string" && has(LEGACY_LANG, value)) return LEGACY_LANG[value];
  return DEFAULT_LANG;
}

/* Replaces {token} with vars.token. Tokens the caller did not supply are left
   as-is so a typo surfaces visibly instead of silently rendering "undefined". */
export function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (has(vars, name) ? String(vars[name]) : match));
}

export function getTranslation(lang, key, vars) {
  const dictionary = isLang(lang) ? translations[lang] : en;
  const template = has(dictionary, key) ? dictionary[key] : has(en, key) ? en[key] : key;
  return interpolate(template, vars);
}
