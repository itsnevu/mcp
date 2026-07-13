import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/lib/pdfText";

/* Builds a structurally valid PDF with a real text layer — the same shape a word processor
   emits — so the extractor is exercised against bytes rather than against a stub of itself. */
function buildPdf(contentStream, { compress = false } = {}) {
  const body = compress
    ? zlib.deflateSync(Buffer.from(contentStream, "latin1"))
    : Buffer.from(contentStream, "latin1");

  const chunks = [];
  const offsets = [];
  let len = 0;

  const push = (buf) => {
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, "latin1");
    chunks.push(b);
    len += b.length;
  };
  const obj = (n, content) => {
    offsets[n] = len;
    push(`${n} 0 obj\n${content}\nendobj\n`);
  };

  push("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>");

  offsets[4] = len;
  push(`4 0 obj\n<< ${compress ? "/Filter /FlateDecode " : ""}/Length ${body.length} >>\nstream\n`);
  push(body);
  push("\nendstream\nendobj\n");

  obj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const xref = len;
  push("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new Blob([Buffer.concat(chunks)], { type: "application/pdf" });
}

const PAGE = `BT
/F1 12 Tf
72 720 Td
(Bugglo Token Audit) Tj
0 -18 Td
(Liquidity is locked for 12 months.) Tj
0 -18 Td
[(Deployer holds ) -250 (4.2% of supply.)] TJ
ET`;

describe("extractPdfText", () => {
  it("reads an uncompressed text layer, kerned TJ arrays included", async () => {
    const result = await extractPdfText(buildPdf(PAGE), { maxChars: 6000 });

    expect(result.ok).toBe(true);
    expect(result.text).toContain("Bugglo Token Audit");
    expect(result.text).toContain("Liquidity is locked for 12 months.");
    // The two operands of the TJ array must come back joined, not as separate fragments.
    expect(result.text).toContain("Deployer holds 4.2% of supply.");
  });

  it("inflates a FlateDecode stream — which is what every real PDF ships", async () => {
    const result = await extractPdfText(buildPdf(PAGE, { compress: true }), { maxChars: 6000 });

    expect(result.ok).toBe(true);
    expect(result.text).toContain("Liquidity is locked for 12 months.");
  });

  it("admits it cannot read a scanned page instead of returning noise", async () => {
    // No text layer at all — just an image XObject. The honest answer is "no", because the
    // alternative is posting garbage to the model and billing the user for it.
    const scan = buildPdf("q 612 0 0 792 0 0 cm /Im0 Do Q", { compress: true });
    expect(await extractPdfText(scan)).toEqual({ ok: false, reason: "empty" });
  });

  it("names an encrypted PDF as encrypted, not as empty", async () => {
    // Its streams inflate to ciphertext, which would otherwise sail past the mojibake check.
    const encrypted = new Blob([Buffer.from("%PDF-1.4\n<< /Encrypt 9 0 R /Size 6 >>\n%%EOF")]);
    expect(await extractPdfText(encrypted)).toEqual({ ok: false, reason: "encrypted" });
  });

  it("truncates rather than blowing the attachment budget", async () => {
    const long = `BT /F1 12 Tf 72 720 Td ${"(Robinhood Chain liquidity report. ) Tj ".repeat(200)} ET`;
    const result = await extractPdfText(buildPdf(long, { compress: true }), { maxChars: 500 });

    expect(result.ok).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(520);
    expect(result.text).toContain("[truncated]");
  });
});
