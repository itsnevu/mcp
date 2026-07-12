import { describe, expect, it } from "vitest";
import en from "../lib/locales/en";
import { LANGUAGES, getTranslation, interpolate, normalizeLang, translations } from "../lib/i18n";

const enKeys = Object.keys(en);
const locales = Object.entries(translations).filter(([code]) => code !== "en");

function tokensOf(value) {
  return (value.match(/\{\w+\}/g) || []).sort();
}

describe("locale registry", () => {
  it("offers every language it can actually render", () => {
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual(Object.keys(translations).sort());
  });

  it("does not ship an Indonesian locale", () => {
    expect(Object.keys(translations)).not.toContain("id");
    expect(LANGUAGES.some((l) => /indonesia/i.test(l.label))).toBe(false);
  });
});

describe.each(locales)("%s locale", (code, dict) => {
  it("defines every English key", () => {
    expect(Object.keys(dict).sort()).toEqual([...enKeys].sort());
  });

  it("preserves the {tokens} of every string", () => {
    for (const key of enKeys) {
      expect(tokensOf(dict[key]), `${code} → ${key}`).toEqual(tokensOf(en[key]));
    }
  });

  it("leaves no value untranslated-by-omission", () => {
    for (const key of enKeys) {
      expect(dict[key], `${code} → ${key}`).toBeTruthy();
    }
  });
});

describe("normalizeLang", () => {
  it("keeps known codes", () => {
    expect(normalizeLang("ja")).toBe("ja");
  });

  it("migrates legacy display-name values", () => {
    expect(normalizeLang("English")).toBe("en");
    expect(normalizeLang("中文 (Chinese)")).toBe("zh");
  });

  /* A returning user's browser still holds "Indonesian" from the old build. */
  it("falls back to English for the retired Indonesian locale", () => {
    expect(normalizeLang("Indonesian")).toBe("en");
    expect(normalizeLang("Bahasa Indonesia")).toBe("en");
  });

  it("falls back to English for junk and prototype keys", () => {
    expect(normalizeLang("constructor")).toBe("en");
    expect(normalizeLang("toString")).toBe("en");
    expect(normalizeLang(null)).toBe("en");
  });
});

describe("getTranslation", () => {
  it("falls back to English when a locale lacks a key", () => {
    expect(getTranslation("zh", "__missing__")).toBe("__missing__");
  });

  it("substitutes tokens", () => {
    expect(interpolate("Top {chain} tokens", { chain: "Robinhood Chain" })).toBe("Top Robinhood Chain tokens");
  });

  it("leaves unsupplied tokens visible rather than rendering undefined", () => {
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
  });
});
