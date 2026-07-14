#!/usr/bin/env node
/* bugglo CLI.
 *
 * This file is intentionally a thin shell over chain.js. The web app, MCP server, and terminal
 * command must not grow separate ideas of what "rug check" means.
 */

const VERSION = "0.1.1";
const DEFAULT_RPC = "https://rpc.mainnet.chain.robinhood.com";
const ROBINHOOD_CHAIN_ID = 4663;
const CHAIN_ID_HEX = `0x${ROBINHOOD_CHAIN_ID.toString(16)}`;

const COMMANDS = new Set(["rug", "rug-check", "check", "info", "token", "ownership", "owner", "proxy", "powers", "market", "limits"]);

function usage() {
  return `bugglo ${VERSION}

Read Robinhood Chain (4663) directly. No API key, no account, no backend.

Usage
  bugglo <address>                 Full rug-check report
  bugglo rug <address>             Same as above
  bugglo info <address>            ERC-20 metadata and bytecode size
  bugglo ownership <address>       owner() state: renounced, owned, or no owner()
  bugglo proxy <address>           EIP-1967 upgradeable-proxy check
  bugglo powers <address>          Privileged function selectors in bytecode
  bugglo market <address>          DexScreener liquidity and trading data
  bugglo limits                    Checks Bugglo cannot measure

Options
  --json                           Print machine-readable JSON
  --full                           Print the full address in reports
  --rpc <url>                      Override the Robinhood Chain RPC
  --rpc-list <urls>                Comma-separated RPC fallbacks, first healthy chain 4663 wins
  --timeout <ms>                   Override chain RPC timeout
  --dex-timeout <ms>               Override DexScreener timeout
  --no-color                       Disable ANSI colour
  -h, --help                       Show help
  -v, --version                    Show version

Examples
  npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
  npx bugglo --json market 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
  npx bugglo --rpc https://your-rpc.example rug 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
  npx bugglo --rpc-list https://rpc.one,https://rpc.two 0x...

Rule
  UNKNOWN is not PASS. A check that did not run is never a check that passed.`;
}

function fail(message, code = 1) {
  console.error(`bugglo: ${message}`);
  process.exitCode = code;
}

function parseArgs(argv) {
  const opts = {
    command: "rug",
    positional: [],
    json: false,
    full: false,
    color: process.stdout.isTTY && !process.env.NO_COLOR,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg === "-v" || arg === "--version") opts.version = true;
    else if (arg === "--json") opts.json = true;
    else if (arg === "--full") opts.full = true;
    else if (arg === "--no-color") opts.color = false;
    else if (arg === "--rpc") {
      const value = argv[++i];
      if (!value) return { error: "--rpc needs a URL" };
      opts.rpc = value;
    } else if (arg.startsWith("--rpc=")) {
      opts.rpc = arg.slice("--rpc=".length);
    } else if (arg === "--rpc-list") {
      const value = argv[++i];
      if (!value) return { error: "--rpc-list needs one or more comma-separated URLs" };
      opts.rpcList = value;
    } else if (arg.startsWith("--rpc-list=")) {
      opts.rpcList = arg.slice("--rpc-list=".length);
    } else if (arg === "--timeout") {
      const value = argv[++i];
      if (!value) return { error: "--timeout needs milliseconds" };
      opts.timeout = value;
    } else if (arg.startsWith("--timeout=")) {
      opts.timeout = arg.slice("--timeout=".length);
    } else if (arg === "--dex-timeout") {
      const value = argv[++i];
      if (!value) return { error: "--dex-timeout needs milliseconds" };
      opts.dexTimeout = value;
    } else if (arg.startsWith("--dex-timeout=")) {
      opts.dexTimeout = arg.slice("--dex-timeout=".length);
    } else if (arg.startsWith("-")) {
      return { error: `unknown option ${arg}` };
    } else {
      opts.positional.push(arg);
    }
  }

  if (opts.positional.length && COMMANDS.has(opts.positional[0])) {
    opts.command = opts.positional.shift();
  }

  if (opts.command === "rug-check" || opts.command === "check") opts.command = "rug";
  if (opts.command === "token") opts.command = "info";
  if (opts.command === "owner") opts.command = "ownership";

  return opts;
}

function rpcCandidates(opts) {
  const fromCli = opts.rpcList || opts.rpc;
  const fromEnv = process.env.BUGGLO_RPC_URLS || process.env.ROBINX_RPC_URL;
  const raw = fromCli || fromEnv || DEFAULT_RPC;
  const urls = String(raw)
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return [...new Set(urls)];
}

function numericEnv(name, value) {
  if (value == null) return true;
  if (!/^\d+$/.test(String(value)) || Number(value) <= 0) {
    fail(`${name} must be a positive integer`, 2);
    return false;
  }
  process.env[name] = String(value);
  return true;
}

function parseAddress(raw, isAddress, getAddress) {
  const value = String(raw || "").trim();
  if (!value) return { error: "missing address" };
  if (!isAddress(value)) return { error: `"${value}" is not a valid EVM address (0x + 40 hex characters)` };
  return { address: getAddress(value) };
}

const ansi = {
  bold: ["\x1b[1m", "\x1b[22m"],
  dim: ["\x1b[2m", "\x1b[22m"],
  green: ["\x1b[32m", "\x1b[39m"],
  yellow: ["\x1b[33m", "\x1b[39m"],
  red: ["\x1b[31m", "\x1b[39m"],
  cyan: ["\x1b[36m", "\x1b[39m"],
};

const wrapAnsi = ([open, close]) => (text) => `${open}${text}${close}`;
function paint(enabled) {
  if (!enabled) return undefined;
  return {
    bold: wrapAnsi(ansi.bold),
    dim: wrapAnsi(ansi.dim),
    pass: wrapAnsi(ansi.green),
    warn: wrapAnsi(ansi.yellow),
    fail: wrapAnsi(ansi.red),
    unknown: wrapAnsi(ansi.cyan),
    heading: (text) => wrapAnsi(ansi.bold)(wrapAnsi(ansi.cyan)(text)),
  };
}

async function rpcPreflight(rpcUrl) {
  let response;
  try {
    response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    return { ok: null, warning: `cannot reach RPC ${rpcUrl}: ${error?.message || error}` };
  }

  const body = await response.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    return {
      ok: false,
      error:
        `${rpcUrl} answered with non-JSON, not JSON-RPC. First bytes: ` +
        body.slice(0, 120).replace(/\s+/g, " "),
    };
  }

  if (json?.result !== CHAIN_ID_HEX) {
    return {
      ok: false,
      error: `${rpcUrl} reports chain ${json?.result || "unknown"}; expected ${CHAIN_ID_HEX} (Robinhood Chain ${ROBINHOOD_CHAIN_ID})`,
    };
  }

  return { ok: true };
}

async function chooseRpc(candidates) {
  const failures = [];

  for (const url of candidates) {
    const preflight = await rpcPreflight(url);
    if (preflight.ok === true) return { url, failures };
    failures.push({ url, preflight });
    if (preflight.ok === false) break; // wrong-chain or captive-portal: do not silently try past it.
  }

  return { url: candidates[0], failures };
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.error) {
    fail(opts.error, 2);
    console.error("\n" + usage());
    return;
  }
  if (opts.help) {
    console.log(usage());
    return;
  }
  if (opts.version) {
    console.log(VERSION);
    return;
  }

  if (!numericEnv("CHAIN_RPC_TIMEOUT_MS", opts.timeout)) return;
  if (!numericEnv("CHAIN_DEX_TIMEOUT_MS", opts.dexTimeout)) return;

  if (opts.command === "limits") {
    const chain = await import("./chain.js");
    const limits = {
      chain: "Robinhood Chain",
      chainId: chain.ROBINHOOD_CHAIN_ID,
      cannotMeasure: Object.entries(chain.UNMEASURABLE).map(([key, why]) => ({ key, why })),
      rule: "A check that did not run is never a check that passed. UNKNOWN is not PASS.",
      noRiskScore:
        "Bugglo deliberately returns no numeric risk score. A score computed from measured signals and unknowns launders ignorance into false confidence.",
    };
    if (opts.json) printJson(limits);
    else {
      console.log("BUGGLO — limits\n");
      for (const item of limits.cannotMeasure) console.log(`${item.key}\n  ${item.why}\n`);
      console.log(limits.rule);
      console.log(limits.noRiskScore);
    }
    return;
  }

  const { isAddress, getAddress } = await import("viem");
  const parsed = parseAddress(opts.positional[0], isAddress, getAddress);
  if (parsed.error) {
    fail(parsed.error, 2);
    console.error("\n" + usage());
    return;
  }

  if (opts.command !== "market") {
    const selected = await chooseRpc(rpcCandidates(opts));
    process.env.ROBINX_RPC_URL = selected.url;
    for (const failure of selected.failures) {
      if (failure.preflight.ok === false) {
        fail(failure.preflight.error, 1);
        return;
      }
      console.error(`bugglo: WARNING — ${failure.preflight.warning}`);
    }
    if (selected.failures.length) {
      console.error(`bugglo: using ${selected.url}; chain reads may report UNKNOWN if it is unreachable from this network.`);
      console.error("bugglo: set ROBINX_RPC_URL, BUGGLO_RPC_URLS, or --rpc to a provider endpoint if this keeps happening.");
    }
  }

  const [chain, report] = await Promise.all([import("./chain.js"), import("./report.js")]);
  const address = parsed.address;
  const common = { address, chainId: chain.ROBINHOOD_CHAIN_ID };
  const outputPaint = paint(opts.color);

  if (opts.command === "rug") {
    const result = await chain.rugCheck(address);
    if (opts.json) printJson(result);
    else console.log(report.renderRugCheck(result, { full: opts.full, paint: outputPaint }));
    if (result.ok === false || result.verdict === "CANNOT CHECK") process.exitCode = 1;
    return;
  }

  if (opts.command === "info") {
    const [code, metadata] = await Promise.all([chain.getContractCode(address), chain.getTokenMetadata(address)]);
    const result = !code.ok
      ? { ok: false, error: code.error, ...common }
      : { ok: true, ...common, isContract: code.value.isContract, bytecodeSize: code.value.size, ...metadata };
    if (opts.json) printJson(result);
    else printJson(result);
    if (result.ok === false) process.exitCode = 1;
    return;
  }

  if (opts.command === "ownership") {
    const result = { ok: true, ...common, ...(await chain.getOwnership(address)) };
    printJson(result);
    return;
  }

  if (opts.command === "proxy") {
    const result = { ok: true, ...common, ...(await chain.getProxyStatus(address)) };
    printJson(result);
    return;
  }

  if (opts.command === "powers") {
    const code = await chain.getContractCode(address);
    const result = !code.ok
      ? { ok: false, error: code.error, ...common }
      : code.value.isContract
        ? {
            ok: true,
            ...common,
            isContract: true,
            bytecodeSize: code.value.size,
            powers: chain.scanPowers(code.value.bytecode),
          }
        : { ok: true, ...common, isContract: false, powers: null, note: "No code at this address — nothing to scan." };
    printJson(result);
    if (result.ok === false) process.exitCode = 1;
    return;
  }

  if (opts.command === "market") {
    const market = await chain.getMarket(address);
    const result = market.ok ? { ...common, ...market } : { ok: false, error: market.error, ...common };
    printJson(result);
    if (result.ok === false) process.exitCode = 1;
    return;
  }

  fail(`unknown command ${opts.command}`, 2);
}

main().catch((error) => {
  fail(error?.stack || error?.message || error, 1);
});
