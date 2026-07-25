/* Turning a rugCheck() result into something a reader — human or model — cannot misread.
 *
 * WHY THIS IS NOT JUST JSON.stringify.
 *
 * The whole point of chain.js is that it reports UNKNOWN as a first-class outcome and ships the
 * list of what it could NOT measure on every single result. Hand a model raw JSON and that list
 * is just another key it is free to summarise away — and the summary that comes out the other
 * side is "no red flags found", which is the exact sentence this project exists to prevent.
 *
 * A rendered report survives the trip. "NOT CHECKED — these are not passes" sitting in the
 * model's context as a heading is far harder to launder into false confidence than
 * `"unmeasured": [...]` buried in an object. The structured data still ships alongside, for
 * callers that want to compute on it — but the prose is the primary output, on purpose.
 *
 * Shared deliberately: the MCP server and the CLI must never drift into telling two different
 * stories about the same address.
 */

/* The UNMEASURABLE keys are camelCase because they are object keys. Nobody reads camelCase. */
const UNMEASURED_LABELS = {
  holderConcentration: "holder concentration",
  liquidityLock: "liquidity lock",
  honeypotSimulation: "honeypot / sell simulation",
};

/* Painting is injected rather than baked in: the MCP server needs plain text (its output lands
   in a model's context, where ANSI escapes are noise), and the CLI wants colour. One renderer,
   two skins — because two renderers is how the terminal and the agent start disagreeing. */
export const PLAIN = {
  bold: (s) => s,
  dim: (s) => s,
  pass: (s) => s,
  warn: (s) => s,
  fail: (s) => s,
  unknown: (s) => s,
  heading: (s) => s,
};

const STATUS_ORDER = { FAIL: 0, WARN: 1, UNKNOWN: 2, PASS: 3 };

function paintStatus(status, paint) {
  switch (status) {
    case "PASS":
      return paint.pass(status.padEnd(7));
    case "WARN":
      return paint.warn(status.padEnd(7));
    case "FAIL":
      return paint.fail(status.padEnd(7));
    default:
      return paint.unknown(String(status).padEnd(7));
  }
}

/* Hard-wrap on words. A detail line that runs off the right edge of an 80-column terminal is a
   detail line that does not get read, and these details are the entire product. */
function wrap(text, width, indent) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);

  return lines.map((l) => indent + l).join("\n");
}

function shortAddress(address) {
  return address && address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/**
 * @param {object} result  a rugCheck() return value
 * @param {{ paint?: object, width?: number, full?: boolean }} opts
 *   paint — a skin (PLAIN, or an ANSI one from the CLI)
 *   width — terminal width to wrap to
 *   full  — print the full 42-char address rather than the elided form
 * @returns {string}
 */
export function renderRugCheck(result, { paint = PLAIN, width = 80, full = false } = {}) {
  if (!result || result.ok === false) {
    return `BUGGLO — cannot check\n\n${result?.error || "Unknown error."}`;
  }

  const out = [];
  const address = full ? result.address : shortAddress(result.address);

  out.push(paint.bold("BUGGLO — rug check"));
  out.push(paint.dim(`${result.chain}${result.chainId ? ` (chain ${result.chainId})` : ""}`));
  out.push(address);

  if (result.token?.symbol || result.token?.name) {
    const t = result.token;
    out.push(paint.dim(`${t.name || "?"} (${t.symbol || "?"})${t.decimals != null ? `, ${t.decimals} decimals` : ""}`));
  }

  out.push("");
  out.push(`${paint.bold("VERDICT")}  ${paint.bold(result.verdict)}`);

  if (result.summary) {
    out.push("");
    out.push(wrap(result.summary, width - 2, "  "));
  }

  /* Worst first. A reader who stops after three lines must have read the three lines that could
     cost them money, not three PASSes that happened to sort first. */
  const signals = [...(result.signals || [])].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  );

  if (signals.length) {
    out.push("");
    for (const signal of signals) {
      out.push(`  ${paintStatus(signal.status, paint)} ${paint.bold(signal.label)}`);
      out.push(paint.dim(wrap(signal.detail, width - 12, "          ")));
    }
  }

  /* The section that must never be cut for brevity. Its heading says what it means, because
     "unmeasured" is a word a tired reader rounds down to "fine". */
  if (result.unmeasured?.length) {
    out.push("");
    out.push(paint.heading("NOT CHECKED — these are not passes"));
    for (const item of result.unmeasured) {
      out.push(`  ${paint.unknown((UNMEASURED_LABELS[item.key] || item.key).padEnd(28))}`);
      out.push(paint.dim(wrap(item.why, width - 6, "    ")));
    }
  }

  if (result.errors?.length) {
    out.push("");
    out.push(paint.dim("Errors encountered while checking:"));
    for (const error of result.errors) out.push(paint.dim(`  - ${error}`));
  }

  return out.join("\n");
}

/**
 * The one-line version, for a feed or a list. Carries the verdict AND the fact that the verdict
 * is partial — a summary that drops the second half is how "INSUFFICIENT DATA" becomes "fine".
 */
export function renderOneLine(result) {
  if (!result || result.ok === false) return `${result?.error || "cannot check"}`;
  const unknowns = (result.signals || []).filter((s) => s.status === "UNKNOWN").length;
  const warns = (result.signals || []).filter((s) => s.status === "WARN").length;
  const bits = [`${shortAddress(result.address)}  ${result.verdict}`];
  if (warns) bits.push(`${warns} warning${warns > 1 ? "s" : ""}`);
  if (unknowns) bits.push(`${unknowns} unknown${unknowns > 1 ? "s" : ""}`);
  bits.push(`${(result.unmeasured || []).length} checks not run`);
  return bits.join("  ·  ");
}
