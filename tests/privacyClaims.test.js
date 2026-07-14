import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicIncognitoCopy = [
  "app/learn/page.js",
  "app/learn/opengraph-image.js",
  "app/(marketing)/faq/page.js",
  "components/SettingsModal.jsx",
  "lib/locales/en.js",
  "lib/locales/es.js",
  "lib/locales/ja.js",
  "lib/locales/ko.js",
  "lib/locales/zh.js",
];

const unsupportedClaims = [
  /\bno model training\b/i,
  /\bnot used\b[^.]{0,120}\btrain/i,
  /\bno ai training\b/i,
  /\bopt[- ]?out\b[^.]{0,120}\btraining/i,
  /\bno server logs\b/i,
  /\bstorage disabled\b/i,
];

describe("public incognito privacy claims", () => {
  it("does not promise provider behavior the app cannot enforce", () => {
    const offenders = [];

    for (const file of publicIncognitoCopy) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      for (const claim of unsupportedClaims) {
        if (claim.test(source)) offenders.push(`${file}: ${claim}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
