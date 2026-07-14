#!/usr/bin/env node
/* bugglo-mcp — Robinhood Chain (4663), read directly, over stdio.
 *
 * WHAT MAKES THIS DIFFERENT FROM EVERY OTHER CHAIN MCP SERVER.
 *
 * Most of them are thin proxies over a vendor's REST API: they need a base URL, a key, sometimes
 * a funded wallet, and they quietly default to Ethereum. Point one of those at a Robinhood Chain
 * contract and it answers, truthfully and uselessly, that no contract exists there — which a model
 * cannot distinguish from a real finding. That is how a user gets told a real token is a phantom.
 *
 * This server talks to chain 4663 and NOTHING ELSE. It reads the chain itself over a public RPC.
 * No API key, no account, nothing to bill you for. It is the same first-party code that answers
 * inside the Bugglo web app and the CLI — the `bugglo` package — which is why the three of them
 * cannot drift into telling different stories about the same address. There is one rugCheck().
 *
 * This package is a THIN ADAPTER over that core, and deliberately so: the MCP SDK drags in express,
 * hono, ajv and cors, and the CLI must never pay for those to print a report that does not use them.
 * Hence two packages — `bugglo` owns the chain reading, `bugglo-mcp` owns only the MCP surface.
 *
 * And it reports UNKNOWN as a first-class result. Every rug check ships the list of what it could
 * NOT measure, on every result, passed or failed — because a check that did not run is never a
 * check that passed, and a model handed a silence will fill it with confidence.
 *
 * CRITICAL: stdio servers speak JSON-RPC on stdout. NEVER write to stdout. Log to stderr only.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { isAddress, getAddress } from "viem";

import {
  ROBINHOOD_CHAIN_ID,
  RPC_URL,
  UNMEASURABLE,
  rugCheck,
  getContractCode,
  getTokenMetadata,
  getOwnership,
  getProxyStatus,
  getMarket,
  scanPowers,
} from "bugglo/chain";
import { renderRugCheck } from "bugglo/report";

const log = (...args) => console.error("[bugglo-mcp]", ...args); // stderr only. See the header.

/* ── Preflight ────────────────────────────────────────────────────────────────────────────────
 *
 * Ask the RPC which chain it is, once, at boot, and say so out loud on stderr.
 *
 * This exists because of a real failure that costs hours to diagnose and looks like nothing:
 * some ISPs — Indonesia's TrustPositif filter is the one that caught us, and it is not unique —
 * intercept DNS and answer for blocked domains with the address of a block page. The RPC hostname
 * then resolves to a web server that is not an RPC. Every chain read fails, or worse, an HTML
 * block page arrives where JSON was expected. Setting 8.8.8.8 does not help: the interception is
 * on port 53 itself, so the resolver you chose never gets asked.
 *
 * Without this check the operator sees only "CANNOT CHECK" forever, with no hint that the problem
 * is their network rather than the chain, the tool, or the token. The tools stay honest either way
 * (they report UNKNOWN, never a clean result) — but honesty about WHICH thing is broken is worth
 * saying too. So: name the failure, and name the fix.
 *
 * Never fatal. A degraded server that tells the truth beats a server that refuses to start. */
const CHAIN_ID_HEX = `0x${ROBINHOOD_CHAIN_ID.toString(16)}`;

async function preflight() {
  let response;
  try {
    response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    log(`WARNING — cannot reach the Robinhood Chain RPC at ${RPC_URL}`);
    log(`  ${error?.message || error}`);
    log(`  Every chain read will honestly report UNKNOWN until this is fixed. It is not a finding about any token.`);
    log(`  If your ISP filters DNS (Indonesia's TrustPositif, and similar systems elsewhere, redirect blocked`);
    log(`  domains to a block page), the hostname will not resolve to the real RPC. Setting 8.8.8.8 may not be`);
    log(`  enough — port 53 itself can be intercepted. Try DNS-over-HTTPS, or point ROBINX_RPC_URL at an RPC`);
    log(`  you can reach.`);
    return;
  }

  const body = await response.text();
  let chainId;
  try {
    chainId = JSON.parse(body)?.result;
  } catch {
    /* Something answered, and it was not JSON. That is the block-page signature: a captive portal
       or filter returning HTML where an RPC should be. Worth calling out by name, because it looks
       nothing like a network outage from the inside. */
    log(`WARNING — ${RPC_URL} answered, but not with JSON.`);
    log(`  First bytes: ${body.slice(0, 120).replace(/\s+/g, " ")}`);
    log(`  Something is intercepting this hostname — a DNS filter or captive portal, not the chain.`);
    log(`  Point ROBINX_RPC_URL at an RPC you can actually reach.`);
    return;
  }

  if (chainId !== CHAIN_ID_HEX) {
    /* The most dangerous outcome of all, and the one this whole project exists to prevent: a live,
       healthy RPC that is answering about A DIFFERENT CHAIN. Every check would run, every check
       would pass, and every answer would be about the wrong chain's idea of this address. */
    log(`FATAL-ISH — ${RPC_URL} is not Robinhood Chain.`);
    log(`  It reports chain ${chainId} (expected ${CHAIN_ID_HEX} = ${ROBINHOOD_CHAIN_ID}).`);
    log(`  Refusing to pretend otherwise: answers from the wrong chain are worse than no answers.`);
    log(`  Fix ROBINX_RPC_URL.`);
    return;
  }

  log(`RPC ok — chain ${ROBINHOOD_CHAIN_ID} confirmed at ${RPC_URL}`);
}

const ADDRESS_ARG = {
  address: z
    .string()
    .describe("Contract address on Robinhood Chain (0x + 40 hex characters). NOT an Ethereum address."),
};

/* One gate for every tool, because the failure it prevents is the one that started this project:
   an address that is not an address, handed to the chain, producing an error the model renders as
   a finding. A bad address is a bad address — say so in words, do not return an empty result that
   reads like "nothing wrong here". */
function parseAddress(raw) {
  const value = String(raw || "").trim();
  if (!isAddress(value)) {
    return {
      error:
        `"${value}" is not a valid EVM address (expected 0x followed by 40 hex characters). ` +
        `Nothing was checked. This is not a finding about the token — it is a malformed input.`,
    };
  }
  return { address: getAddress(value) };
}

const asText = (text) => ({ content: [{ type: "text", text }] });
const asError = (text) => ({ isError: true, content: [{ type: "text", text }] });
const asJson = (value) => asText(JSON.stringify(value, null, 2));

/* Every tool funnels through this. A thrown error must come back as an MCP error the model can
   read, never as a crash that kills the transport and takes the whole server down mid-conversation. */
function tool(name, config, handler) {
  server.registerTool(name, config, async (args) => {
    try {
      return await handler(args || {});
    } catch (error) {
      log(`${name} failed:`, error?.message || error);
      return asError(
        `bugglo: ${name} failed — ${error?.message || error}. ` +
          `Nothing was measured, so treat this as UNKNOWN, not as a clean result.`
      );
    }
  });
}

const server = new McpServer({ name: "bugglo", version: "0.1.0" });

/* ── The flagship ─────────────────────────────────────────────────────────────────────────── */

tool(
  "bugglo_rug_check",
  {
    title: "Rug check a Robinhood Chain token",
    description:
      "Full contract-safety disclosure for a token on Robinhood Chain (chain 4663): does the contract " +
      "exist, does it speak ERC-20, who still owns it, can the code be swapped out (EIP-1967 proxy), " +
      "which privileged functions (mint / pause / blacklist) are present in the bytecode, and how deep " +
      "the DEX liquidity actually is. Reports PASS / WARN / FAIL / UNKNOWN per check, and ALWAYS lists " +
      "the checks it could not run. It returns no numeric risk score on purpose. Use this for any " +
      "Robinhood Chain address — general-purpose chain tools default to Ethereum and will wrongly " +
      "report that these contracts do not exist.",
    inputSchema: ADDRESS_ARG,
  },
  async ({ address }) => {
    const parsed = parseAddress(address);
    if (parsed.error) return asError(parsed.error);

    const result = await rugCheck(parsed.address);
    if (result.ok === false) return asError(result.error);

    /* The prose leads and the JSON follows. See report.js for why: a model handed only the object
       summarises the "unmeasured" key away, and the summary reads "no red flags found". */
    return asText(`${renderRugCheck(result, { full: true })}\n\n---\nStructured result:\n${JSON.stringify(result, null, 2)}`);
  }
);

/* ── The individual reads, for agents that want to compose their own analysis ──────────────── */

tool(
  "bugglo_token_info",
  {
    title: "Token metadata on Robinhood Chain",
    description:
      "Name, symbol, decimals, total supply and bytecode size for a contract on Robinhood Chain (4663). " +
      "Each field is read independently: an older token with a bytes32 symbol reverts on symbol() but is " +
      "still a real token, so one failed field does not condemn the read. Tells you plainly if the address " +
      "is a wallet (EOA) with no code at all.",
    inputSchema: ADDRESS_ARG,
  },
  async ({ address }) => {
    const parsed = parseAddress(address);
    if (parsed.error) return asError(parsed.error);

    const [code, metadata] = await Promise.all([
      getContractCode(parsed.address),
      getTokenMetadata(parsed.address),
    ]);

    if (!code.ok) {
      return asError(`Could not reach Robinhood Chain: ${code.error}. Nothing was measured — this is UNKNOWN, not clean.`);
    }
    if (!code.value.isContract) {
      return asJson({
        address: parsed.address,
        chainId: ROBINHOOD_CHAIN_ID,
        isContract: false,
        note: "No code at this address on Robinhood Chain — it is a wallet (EOA), not a token. If you expected a token, the address may belong to a different chain.",
      });
    }

    return asJson({
      address: parsed.address,
      chainId: ROBINHOOD_CHAIN_ID,
      isContract: true,
      bytecodeSize: code.value.size,
      ...metadata,
    });
  }
);

tool(
  "bugglo_ownership",
  {
    title: "Who owns this contract",
    description:
      "Reads owner() on Robinhood Chain and reports one of THREE genuinely different states: 'renounced' " +
      "(owner is 0x0/0xdead — the owner-only functions can no longer be called), 'owned' (a live address " +
      "still holds them), or 'no-owner-fn' (owner() reverts). Note the third: no owner() function is NOT " +
      "the same as renounced — the contract may use AccessControl roles or an embedded admin that cannot " +
      "be seen from here. Collapsing those two states is a lie, so this tool refuses to.",
    inputSchema: ADDRESS_ARG,
  },
  async ({ address }) => {
    const parsed = parseAddress(address);
    if (parsed.error) return asError(parsed.error);
    return asJson({ address: parsed.address, chainId: ROBINHOOD_CHAIN_ID, ...(await getOwnership(parsed.address)) });
  }
);

tool(
  "bugglo_proxy_status",
  {
    title: "Can this contract's code be replaced?",
    description:
      "Checks the EIP-1967 implementation slot on Robinhood Chain. If the contract is an upgradeable proxy, " +
      "then every other finding about its code describes only TODAY's code — the admin can swap it tomorrow. " +
      "Being a proxy is not itself a scam, but it is a fact a holder must be told.",
    inputSchema: ADDRESS_ARG,
  },
  async ({ address }) => {
    const parsed = parseAddress(address);
    if (parsed.error) return asError(parsed.error);
    return asJson({ address: parsed.address, chainId: ROBINHOOD_CHAIN_ID, ...(await getProxyStatus(parsed.address)) });
  }
);

tool(
  "bugglo_powers_scan",
  {
    title: "Which privileged functions exist in the bytecode",
    description:
      "Scans the deployed bytecode on Robinhood Chain for privileged function selectors — mint, pause, " +
      "blacklist, transferOwnership, enableTrading, removeLimits and friends. It scans rather than calls, " +
      "because calling proves nothing (a mint() that reverts for you still mints for the owner) and a " +
      "scanned selector cannot be faked away. THIS IS A DISCLOSURE OF POWERS, NOT A VERDICT: plenty of " +
      "honest tokens are mintable or pausable. It tells you which powers exist; who holds them is " +
      "bugglo_ownership's question.",
    inputSchema: ADDRESS_ARG,
  },
  async ({ address }) => {
    const parsed = parseAddress(address);
    if (parsed.error) return asError(parsed.error);

    const code = await getContractCode(parsed.address);
    if (!code.ok) {
      return asError(`Could not reach Robinhood Chain: ${code.error}. Nothing was scanned — UNKNOWN, not clean.`);
    }
    if (!code.value.isContract) {
      return asJson({
        address: parsed.address,
        isContract: false,
        powers: null,
        note: "No code at this address — nothing to scan.",
      });
    }

    const powers = scanPowers(code.value.bytecode);
    return asJson({
      address: parsed.address,
      chainId: ROBINHOOD_CHAIN_ID,
      isContract: true,
      bytecodeSize: code.value.size,
      powers,
      note:
        powers.length === 0
          ? "No common privileged selectors found. This is not proof the contract has no privileged behaviour — it means none of the known selectors are present."
          : "These powers EXIST in the code. Whether they can be used depends on who holds the keys — check bugglo_ownership.",
    });
  }
);

tool(
  "bugglo_market",
  {
    title: "Liquidity, volume and the sell side",
    description:
      "DEX market data for a Robinhood Chain token: deepest pool liquidity in USD, FDV, 24h volume, buy/sell " +
      "counts, pool age, and the two ratios that matter (volume-to-liquidity, the wash-trading fingerprint; " +
      "FDV-to-liquidity, the exit that cannot be taken at that price). On the honeypot question it is " +
      "deliberately careful: it reports 'nobody has sold', never 'you cannot sell'. Only a sell simulation " +
      "proves the latter, and this cannot run one.",
    inputSchema: ADDRESS_ARG,
  },
  async ({ address }) => {
    const parsed = parseAddress(address);
    if (parsed.error) return asError(parsed.error);

    const market = await getMarket(parsed.address);
    if (!market.ok) {
      return asError(
        `Could not reach the DEX data source: ${market.error}. This means liquidity, volume and the sell side are all UNKNOWN — not that they are fine.`
      );
    }
    return asJson({ address: parsed.address, chainId: ROBINHOOD_CHAIN_ID, ...market });
  }
);

/* ── The tool that makes the rest trustworthy ─────────────────────────────────────────────── */

tool(
  "bugglo_limits",
  {
    title: "What Bugglo CANNOT see (read this before concluding anything)",
    description:
      "Returns the checks Bugglo cannot perform on Robinhood Chain, and exactly why. Holder concentration, " +
      "LP-lock status and honeypot simulation are the three things users most want and none of them are " +
      "obtainable from a bare RPC at chat latency on this chain. Call this before telling a user a token " +
      "'looks safe': a clean bugglo_rug_check means no red flags in what COULD be checked, which is a " +
      "different sentence. An honest 'I can't see this' is worth more than a confident fabrication.",
    inputSchema: {},
  },
  async () =>
    asJson({
      chain: "Robinhood Chain",
      chainId: ROBINHOOD_CHAIN_ID,
      cannotMeasure: Object.entries(UNMEASURABLE).map(([key, why]) => ({ key, why })),
      rule: "A check that did not run is never a check that passed. UNKNOWN is not PASS.",
      noRiskScore:
        "Bugglo deliberately returns no numeric risk score. A score computed from four measured signals and three unknowns is a number that launders ignorance into false confidence.",
    })
);

const transport = new StdioServerTransport();
await server.connect(transport);
log(`ready — 7 tools, Robinhood Chain ${ROBINHOOD_CHAIN_ID}, no API key required`);

/* Deliberately NOT awaited: the MCP handshake must not wait on an 8-second network probe. The
   client gets its tool list immediately; the RPC verdict lands on stderr a moment later. */
preflight().catch((error) => log(`preflight failed: ${error?.message || error}`));
