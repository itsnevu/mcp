import { describe, expect, it } from "vitest";
import { translations } from "../lib/i18n";
import {
  countryFromHeaders,
  langFromAcceptLanguage,
  langFromCountry,
  resolveLang,
  resolveLangFromHeaders,
} from "../lib/geoLang";

const headers = (entries) => new Headers(entries);

describe("langFromCountry", () => {
  it("serves a visitor the language of the country they are in", () => {
    expect(langFromCountry("KR")).toBe("ko");
    expect(langFromCountry("JP")).toBe("ja");
    expect(langFromCountry("CN")).toBe("zh");
    expect(langFromCountry("TW")).toBe("zh");
    expect(langFromCountry("MX")).toBe("es");
  });

  it("accepts the header's casing and padding as it arrives", () => {
    expect(langFromCountry("kr")).toBe("ko");
    expect(langFromCountry(" jp ")).toBe("ja");
  });

  /* The rule that started this: a country whose language we do not ship gets no
     language, and the caller turns that into English. */
  it("returns nothing for a country we ship no language for", () => {
    for (const country of ["ID", "DE", "FR", "BR", "VN", "TH", "SG"]) {
      expect(langFromCountry(country), country).toBeNull();
    }
  });

  it("never names a language we cannot render", () => {
    const supported = Object.keys(translations);
    for (const country of ["ID", "US", "KR", "JP", "CN", "ES", "ZZ", "", null]) {
      const lang = langFromCountry(country);
      if (lang !== null) expect(supported).toContain(lang);
    }
  });
});

describe("resolveLang", () => {
  it("puts an Indonesian visitor on English rather than a language we lack", () => {
    expect(resolveLang({ country: "ID", acceptLanguage: "id-ID,id;q=0.9" })).toBe("en");
  });

  it("puts a Korean visitor on Korean", () => {
    expect(resolveLang({ country: "KR", acceptLanguage: "ko-KR,ko;q=0.9" })).toBe("ko");
  });

  it("trusts the IP over the browser's language", () => {
    expect(resolveLang({ country: "JP", acceptLanguage: "en-US,en;q=0.9" })).toBe("ja");
  });

  /* A recognised country is an answer in itself — we do not then go hunting
     through Accept-Language for a language the visitor's country did not ask for. */
  it("does not let the browser override an unsupported country", () => {
    expect(resolveLang({ country: "DE", acceptLanguage: "es-ES,es;q=0.9" })).toBe("en");
  });

  it("falls back to the browser when the IP places nobody", () => {
    expect(resolveLang({ acceptLanguage: "es-419,es;q=0.9,en;q=0.8" })).toBe("es");
    expect(resolveLang({ country: null, acceptLanguage: "ko" })).toBe("ko");
  });

  it("lands on English when it knows nothing at all", () => {
    expect(resolveLang()).toBe("en");
    expect(resolveLang({ country: "", acceptLanguage: "" })).toBe("en");
  });
});

describe("langFromAcceptLanguage", () => {
  it("honours quality order, not source order", () => {
    expect(langFromAcceptLanguage("en;q=0.3,ja;q=0.9")).toBe("ja");
  });

  it("matches a regional variant on its base language", () => {
    expect(langFromAcceptLanguage("zh-Hant-TW,zh;q=0.9")).toBe("zh");
  });

  it("skips languages we do not ship to reach one we do", () => {
    expect(langFromAcceptLanguage("id-ID,id;q=0.9,ko;q=0.4")).toBe("ko");
  });

  it("returns nothing when no requested language is one we ship", () => {
    expect(langFromAcceptLanguage("id-ID,id;q=0.9")).toBeNull();
    expect(langFromAcceptLanguage("*")).toBeNull();
    expect(langFromAcceptLanguage("")).toBeNull();
  });

  it("ignores a language the caller explicitly refused (q=0)", () => {
    expect(langFromAcceptLanguage("ja;q=0")).toBeNull();
  });
});

describe("countryFromHeaders", () => {
  it("reads the country the host reports", () => {
    expect(countryFromHeaders(headers({ "x-vercel-ip-country": "KR" }))).toBe("KR");
    expect(countryFromHeaders(headers({ "cf-ipcountry": "jp" }))).toBe("JP");
  });

  it("prefers the platform's header over a proxy's", () => {
    const h = headers({ "x-vercel-ip-country": "JP", "x-geo-country": "US" });
    expect(countryFromHeaders(h)).toBe("JP");
  });

  /* Cloudflare's "cannot place this client" sentinels — treating them as a
     country would strand a Korean visitor on English via the unsupported branch. */
  it("treats an unplaceable client as no country at all", () => {
    expect(countryFromHeaders(headers({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(countryFromHeaders(headers({ "cf-ipcountry": "T1" }))).toBeNull();
    expect(countryFromHeaders(headers({ "x-vercel-ip-country": "" }))).toBeNull();
  });

  it("is nothing when no host reports a country", () => {
    expect(countryFromHeaders(headers({ "accept-language": "ko" }))).toBeNull();
  });
});

describe("resolveLangFromHeaders", () => {
  it("reads a real request end to end", () => {
    const korean = headers({ "x-vercel-ip-country": "KR", "accept-language": "en-US,en;q=0.9" });
    expect(resolveLangFromHeaders(korean)).toBe("ko");

    const indonesian = headers({ "x-vercel-ip-country": "ID", "accept-language": "id-ID,id;q=0.9" });
    expect(resolveLangFromHeaders(indonesian)).toBe("en");
  });

  /* Local dev: no geo header, so the browser's preference is all there is. */
  it("still detects a language with no geo header present", () => {
    expect(resolveLangFromHeaders(headers({ "accept-language": "ja-JP,ja;q=0.9" }))).toBe("ja");
  });

  it("does not fail on a bare request", () => {
    expect(resolveLangFromHeaders(headers({}))).toBe("en");
  });
});
