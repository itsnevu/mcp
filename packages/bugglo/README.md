# bugglo

[![npm](https://img.shields.io/npm/v/bugglo)](https://www.npmjs.com/package/bugglo)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/itsnevu/mcp/blob/main/LICENSE)

**Robinhood Chain (4663), read straight from the chain. No API key, no account, no backend.**

`bugglo` is a terminal and library for asking the questions a holder asks before touching a token:

- Does code exist at this address on Robinhood Chain, not Ethereum by accident?
- Does it look like an ERC-20?
- Is ownership renounced, active, or simply not visible through `owner()`?
- Is it an EIP-1967 upgradeable proxy?
- Which common privileged selectors are present in bytecode?
- Is there DEX liquidity, real sell flow, and enough depth to matter?
- Which checks could **not** run, and why?

It deliberately reports `UNKNOWN` as a first-class result. A check that did not run is never a check
that passed.

## Quick start

```bash
npx bugglo 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
```

Machine-readable output:

```bash
npx bugglo --json 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
```

Use your own RPC:

```bash
npx bugglo --rpc https://your-robinhood-chain-rpc.example 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
```

Use fallback RPCs:

```bash
npx bugglo --rpc-list https://rpc.one,https://rpc.two 0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1
```

## Commands

| Command | Output |
|---|---|
| `bugglo <address>` | Full rug-check report. |
| `bugglo rug <address>` | Same as above. |
| `bugglo info <address>` | ERC-20 metadata, bytecode size, and per-field metadata errors. |
| `bugglo ownership <address>` | `renounced`, `owned`, or `no-owner-fn`. |
| `bugglo proxy <address>` | EIP-1967 implementation slot status. |
| `bugglo powers <address>` | Common privileged function selectors found in deployed bytecode. |
| `bugglo market <address>` | DexScreener liquidity, FDV, volume, buy/sell counts, pool age, and ratios. |
| `bugglo limits` | Checks this package cannot perform from bare RPC + public DEX data. |

## The firewall

An AI agent with a wallet is the softest target in DeFi: it will act on instructions injected into
whatever it reads, and it cannot see a chain it never read. So the safety check belongs *outside*
the model, as a gate the agent has to pass before it swaps — advisor becomes enforcer.

| Command | Output |
|---|---|
| `bugglo gate <address>` | `ALLOW` / `BLOCK` / `UNKNOWN`, with every reason sorted worst-first. |
| `bugglo sim <address>` | The read-only sell simulation on its own. |
| `bugglo registry <address>` | `OFFICIAL`, `IMPOSTOR-SUSPECT`, or `NOT-IN-REGISTRY` against the pinned official stock-token list. |

**The exit code is the point.** `bugglo gate` exits `0` only on `ALLOW`, so a script can gate on it:

```bash
npx bugglo gate 0xYourTokenAddress || echo "not trading"
```

`BLOCK` and `UNKNOWN` both exit `1`, deliberately. A firewall that fails open is not a firewall, so
an address whose safety could not be *proven* is treated exactly like one that was proven dangerous.
And `ALLOW` never means "safe" — it means no blocker was proven, which is a different sentence, and
the output says so every time rather than leaving it to a footnote.

Options:

```bash
--json                 Print JSON where supported
--full                 Print the full address in the rug-check report
--side <buy|sell>      Which side the trade is on (gate only; default buy)
--rpc <url>            Override the Robinhood Chain RPC
--rpc-list <urls>      Comma-separated fallback RPC URLs; first healthy chain 4663 endpoint wins
--timeout <ms>         Chain RPC timeout
--dex-timeout <ms>     DexScreener timeout
--no-color             Disable ANSI colour
--help                 Show help
--version              Show version
```

## What a report contains

Every signal is rendered as one of four words, and the report always closes with the checks that
did **not** run:

| Word | Meaning |
|---|---|
| `PASS` | The check ran and found nothing wrong. |
| `WARN` | The check ran and found something you should look at. |
| `FAIL` | The check ran and found a blocker. |
| `UNKNOWN` | The check could **not** run. This is never a pass. |

The verdict is intentionally wordy, and there is no numeric score — a number computed from four
measured signals and three unknowns launders ignorance into false confidence. Rounding a report up
to "safe" is the bug this package exists to avoid.

No sample output is reproduced here on purpose. A pasted report is a reading that was true at most
on the day it was pasted, and this package exists to argue that a stale reading is worse than none.
Run it against an address yourself and the output will be current by construction.

## Library API

```js
import { rugCheck, ROBINHOOD_CHAIN_ID } from "bugglo";
import { renderRugCheck } from "bugglo/report";

const result = await rugCheck("0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1");
console.log(ROBINHOOD_CHAIN_ID);
console.log(renderRugCheck(result));
```

Available exports:

```js
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
} from "bugglo";

import { renderRugCheck, renderOneLine } from "bugglo/report";
```

## Network and reliability

By default, `bugglo` talks to:

| Host | Used for |
|---|---|
| `rpc.mainnet.chain.robinhood.com` | Bytecode, `owner()`, ERC-20 metadata, storage slots. |
| `api.dexscreener.com` | Liquidity, volume, FDV, buys, sells, pool age. |

The public Robinhood Chain RPC is free and convenient, but public RPCs can be rate-limited, blocked
by some ISPs, or unavailable from some networks. For bots, CI, trading desks, and public services,
use a dedicated provider endpoint:

```bash
ROBINX_RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY npx bugglo <address>
```

Or pass several endpoints:

```bash
BUGGLO_RPC_URLS=https://rpc.one,https://rpc.two npx bugglo <address>
```

### DNS-blocked networks (e.g. Indonesia's Trust Positif filter)

The chain RPC lives on a `robinhood.com` subdomain, and some ISPs block that domain at the DNS
level — Indonesian networks running the government Trust Positif filter answer the lookup with the
filter's server instead of the chain. The endpoint is not geo-blocked; only its name is poisoned.

`bugglo` handles this **automatically**. When a direct connection fails, it re-resolves the host over
DNS-over-HTTPS (which the ISP resolver cannot poison) and connects to the real IP, with TLS SNI and
certificate validation still pinned to the true hostname. No VPN, no DNS change, no flag, no API key.
If the DoH resolvers are themselves blocked, fall back to `--rpc`/`ROBINX_RPC_URL` on an unblocked
domain, or a VPN.

If every path fails, Bugglo reports `CANNOT CHECK` / `UNKNOWN`. It does not turn an outage into a
clean verdict.

## What it will not fake

These checks are always disclosed as not measured:

| Check | Why |
|---|---|
| Holder concentration | Needs an indexer. Reconstructing balances from all `Transfer` logs is not viable at CLI latency on a public RPC. |
| Liquidity lock | Needs a known locker registry for this chain. |
| Honeypot sell simulation | Needs a sell simulation from a holder through the router. Bugglo does not run that read today. |

No numeric risk score is emitted. A score made from partial data launders ignorance into confidence.

## MCP

For agents, use the companion package:

```json
{
  "mcpServers": {
    "bugglo": {
      "command": "npx",
      "args": ["-y", "bugglo-mcp"]
    }
  }
}
```

`bugglo-mcp` is only an adapter. The chain logic lives here, in `bugglo`, so CLI, library, and MCP
answers cannot drift.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Command completed. The result may still contain `WARN` or `UNKNOWN`; read it. |
| `1` | The requested check could not complete, or the RPC proved wrong/unusable. |
| `2` | Bad CLI usage, malformed address, or invalid option. |

## License

MIT.
