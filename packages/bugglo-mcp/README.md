# bugglo-mcp

**Robinhood Chain (4663), read straight from the chain. No API key, no account, no payment.**

Point a general-purpose chain tool at a Robinhood Chain contract and it will tell you — truthfully,
and uselessly — that no contract exists there. It is not lying. It is looking at Ethereum.

A model cannot tell that answer apart from a real finding. So it reports a live token, with bytecode,
supply and liquidity, as a phantom. That is not a hypothetical: it is the bug this package was written
to kill.

`bugglo-mcp` talks to **chain 4663 and nothing else**.

```bash
npx bugglo-mcp
```

It reads the chain itself, over a public RPC, in your process. There is no account to make and nothing
to bill you for.

### What this is not

It is **not** the only MCP server covering Robinhood Chain — [`robinx-mcp`](https://www.npmjs.com/package/robinx-mcp)
also does, and it answers questions this one cannot: deployer reputation and insider-distribution
history, which need an indexer behind them. If you want a deployer's rap sheet, use that. Its stronger
tools are paid (x402, USDC on Base) and it reaches them through a hosted API.

This one is the other trade. It reads the chain directly, so it needs nothing from anybody: no key, no
wallet, no vendor in the path. And it will not hand you a single composite verdict, because the data to
justify one does not exist on this chain yet — see [what it cannot see](#the-part-other-tools-leave-out).

Different tools. Run both.

---

## Install

Add it to any MCP client — Claude Desktop, Claude Code, Cursor, Windsurf, or your own agent:

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

That's the whole config. There is no second step.

---

## Tools

| Tool | What it answers |
|---|---|
| `bugglo_rug_check` | The full disclosure. Every check below, in one report, with a verdict — and the list of what it could not check. |
| `bugglo_token_info` | Name, symbol, decimals, supply, bytecode size. Tells you plainly when an address is a wallet, not a token. |
| `bugglo_ownership` | Renounced, owned, or **no owner() at all** — three different answers, never collapsed into two. |
| `bugglo_proxy_status` | Is this an upgradeable proxy? If so, today's bytecode is not a promise about tomorrow's. |
| `bugglo_powers_scan` | Which privileged functions (mint / pause / blacklist / …) are present in the bytecode. |
| `bugglo_market` | Liquidity, FDV, 24h volume, buy/sell counts, pool age, and the two ratios that matter. |
| `bugglo_limits` | **What Bugglo cannot see.** Call this before telling anyone a token looks safe. |

---

## The part other tools leave out

Every result ships the list of checks that **did not run**, and why. On every result — passed or failed.

```
VERDICT  NO RED FLAGS IN WHAT I COULD CHECK

  PASS    Not an upgradeable proxy
          No EIP-1967 implementation slot — the code cannot be swapped out from under you.
  PASS    Sells are going through
          276 sells against 419 buys in 24h — people are getting out, so it is not a hard honeypot.
  UNKNOWN Ownership unclear
          There is no standard owner() function. That does NOT mean ownership is renounced — the
          contract may use roles or an embedded admin that I cannot see from here.

NOT CHECKED — these are not passes
  holder concentration        Needs an indexer. No indexer covers this chain yet.
  liquidity lock              Needs a locker registry. This chain has none, so a locked pool and an
                              unlocked one look identical from here.
  honeypot / sell simulation  Not run. A passing market check is not proof that you can exit.
```

Three rules this server will not break:

**UNKNOWN is not PASS.** A check that could not run is never a check that passed. There is no code
path here that turns a failed read into a clean result.

**No numeric risk score.** A score computed from four measured signals and three unknowns is a number
that launders ignorance into false confidence. So there isn't one.

**Powers are disclosed, not judged.** Mintable is not a rug. Pausable is not a rug. Plenty of honest
tokens are both. This tells you which powers exist in the bytecode and who still holds the keys; what
you are comfortable with is yours to decide.

The verdict `NO RED FLAGS IN WHAT I COULD CHECK` is deliberately that long. It is the honest ceiling,
and rounding it up to "safe" is the whole failure mode this exists to prevent.

---

## Exactly what it talks to

Two hosts, and no others. Named here because a tool that will not name its own dependencies has no
business lecturing you about disclosure.

| Host | What for | If it is down |
|---|---|---|
| `rpc.mainnet.chain.robinhood.com` | Everything read from the chain itself: bytecode, `owner()`, the EIP-1967 proxy slot, ERC-20 metadata. | Every contract check reports UNKNOWN. Never a clean result. |
| `api.dexscreener.com` | **Market data only** — liquidity, FDV, volume, buy/sell counts, pool age. This does **not** come from the chain. It is a third party, and `bugglo_market` is exactly as good as they are. | The market check reports UNKNOWN. The contract checks still run. |

No telemetry. No analytics. Nothing is sent anywhere about what you looked up.

## Configuration

Everything is optional.

| Variable | Default | Why you would set it |
|---|---|---|
| `ROBINX_RPC_URL` | `https://rpc.mainnet.chain.robinhood.com` | A public RPC is a single point of failure. Repoint it without redeploying. |
| `CHAIN_RPC_TIMEOUT_MS` | `10000` | |
| `CHAIN_DEX_TIMEOUT_MS` | `8000` | |

The server checks at startup that its RPC really is chain 4663, and says so on stderr. If it is not —
because the endpoint is wrong, unreachable, or intercepted — it says **that**, loudly, instead of
answering about the wrong chain.

### If the RPC will not resolve

Some ISPs intercept DNS and redirect blocked domains to a filter page — Indonesia's TrustPositif is
one, and it is not the only one. The RPC hostname then resolves to a web server that is not an RPC,
and every read fails for reasons that have nothing to do with the chain.

Setting `8.8.8.8` may not be enough: the interception can sit on port 53 itself, so the resolver you
picked never gets asked. Use DNS-over-HTTPS, or point `ROBINX_RPC_URL` at an RPC you can reach.

The startup check will tell you if this is happening to you.

---

## Also

The same engine answers in [Bugglo](https://github.com/itsnevu/mcp) — the chat UI for Robinhood Chain.
Same code, same answers, different door. It cannot drift, because there is only one implementation.

MIT.
