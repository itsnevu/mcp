import { describe, expect, it } from "vitest";
import { chunkForSpeech, speechLangTag, toSpeech } from "@/lib/speech";

describe("toSpeech", () => {
  it("turns a written answer into a spoken one", () => {
    const { text } = toSpeech(
      "**Verdict:** high risk.\n\n- Deployer funded by `0x7a3f10b2c9d4e5f60718293a4b5c6d7e8f901234`\n- See https://example.com/report\n\n```js\nconst x = 1;\n```"
    );

    expect(text).not.toContain("**");
    expect(text).not.toContain("`");
    expect(text).not.toContain("0x7a3f10b2");
    expect(text).not.toContain("https://");
    expect(text).toContain("(link)");
    expect(text).toContain("(code block)");
    // The tail of an address is the part a human actually quotes back.
    expect(text).toContain("1 2 3 4");
  });

  it("strips the box-drawing header the system prompt mandates", () => {
    const { text } = toSpeech("╔═══════════╗\n║ BUGGLO ║\n╚═══════════╝\nAll clear.");
    expect(text).toBe("BUGGLO All clear.");
    expect(text).not.toMatch(/[╔═╗║╚╝]/);
  });

  it("cuts long answers on a sentence, never mid-word", () => {
    const long = "This sentence is about tokens. ".repeat(60); // ~1800 chars
    const { text, truncated } = toSpeech(long, { maxChars: 200 });

    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(200);
    expect(text.endsWith("tokens.")).toBe(true);
  });

  it("leaves a short answer alone", () => {
    const { text, truncated } = toSpeech("Liquidity is locked for 12 months.");
    expect(truncated).toBe(false);
    expect(text).toBe("Liquidity is locked for 12 months.");
  });
});

describe("chunkForSpeech", () => {
  it("packs sentences up to the cap and breaks only between them", () => {
    // Packing keeps the utterance count down; splitting keeps the first one short enough to
    // start speaking immediately. Both matter, so it does both.
    expect(chunkForSpeech("One. Two. Three.", { max: 10 })).toEqual(["One. Two.", "Three."]);
    expect(chunkForSpeech("One. Two. Three.", { max: 4 })).toEqual(["One.", "Two.", "Three."]);
  });

  it("breaks a sentence longer than the cap without losing a word", () => {
    const sentence = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
    const chunks = chunkForSpeech(sentence, { max: 20 });

    expect(chunks.every((c) => c.length <= 20)).toBe(true);
    expect(chunks.join(" ").split(/\s+/)).toEqual(sentence.split(" "));
  });

  it("never emits an empty utterance", () => {
    // speechSynthesis.speak("") fires no `end` event in Chrome — one of these would hang the queue.
    expect(chunkForSpeech("")).toEqual([]);
    expect(chunkForSpeech("   \n\n  ")).toEqual([]);
    expect(chunkForSpeech("Hi.   \n\n   ").every((c) => c.trim())).toBe(true);
  });
});

describe("speechLangTag", () => {
  it("maps every UI locale to a tag the speech engines accept", () => {
    // A recognizer left on en-US transcribes Japanese as English-sounding nonsense.
    expect(speechLangTag("ja")).toBe("ja-JP");
    expect(speechLangTag("ko")).toBe("ko-KR");
    expect(speechLangTag("zh")).toBe("zh-CN");
    expect(speechLangTag("es")).toBe("es-ES");
    expect(speechLangTag("en")).toBe("en-US");
    expect(speechLangTag("xx")).toBe("en-US");
  });
});
