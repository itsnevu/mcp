# bugglo

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

Options:

```bash
--json                 Print JSON where supported
--full                 Print the full address in the rug-check report
--rpc <url>            Override the Robinhood Chain RPC
--rpc-list <urls>      Comma-separated fallback RPC URLs; first healthy chain 4663 endpoint wins
--timeout <ms>         Chain RPC timeout
--dex-timeout <ms>     DexScreener timeout
--no-color             Disable ANSI colour
--help                 Show help
--version              Show version
```

## Example report

```text
BUGGLO — rug check
Robinhood Chain (chain 4663)
0x2103...9bf1
Robin Hood (FOX), 18 decimals

VERDICT  NO RED FLAGS IN WHAT I COULD CHECK

  UNKNOWN Ownership unclear
          There is no standard owner() function. That does NOT mean ownership is
          renounced — the contract may use roles or an embedded admin that I cannot see.
  PASS    Contract exists
          4,830 bytes of bytecode on Robinhood Chain (chain 4663).
  PASS    Sells are going through
          People are getting out, so it is not a hard honeypot.

NOT CHECKED — these are not passes
  holder concentration
  liquidity lock
  honeypot / sell simulation
```

The verdict is intentionally wordy. Rounding it up to "safe" is the bug this package exists to
avoid.

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

If every chain read fails, Bugglo reports `CANNOT CHECK` / `UNKNOWN`. It does not turn an outage into
a clean verdict.

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
