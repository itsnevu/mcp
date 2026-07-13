# Deploy — what is actually running

Live: **https://bugglo.37.60.232.191.sslip.io**

Deployed to a VPS (Ubuntu 24.04, `37.60.232.191`) that **already hosts other projects** —
SpacetimeDB, a WILDER auth server, and three Mythreach game servers. Everything below was
chosen to sit beside them without touching them.

| | |
|---|---|
| App dir | `/srv/bugglo` |
| Runs as | `bugglo` (unprivileged system user, not root) |
| Port | **3100** — `3000` is already SpacetimeDB's |
| Service | `bugglo.service` (systemd) |
| Proxy | **Caddy**, not nginx. It already owns :80/:443 for the other sites. |
| TLS | Real Let's Encrypt, via sslip.io wildcard DNS. No domain purchase, no DNS records. |
| Secrets | `/srv/bugglo/.env.local`, `chmod 600`, owned by `bugglo` |

## Three things that will silently break if changed

**Run ONE process.** The spend guard (`lib/rateLimit.js`) holds its counters in this
process's memory, so the caps are per-process by construction. A cluster of four workers
turns `ENGINE_GLOBAL_USD_PER_DAY=5` into a $20/day ceiling — the exact bill the cap exists
to prevent. Move the guard to Redis *before* adding a second worker, not after.

**`ENGINE_TRUSTED_PROXIES=1`.** Caddy is the only proxy in front of the app and it appends
the real client IP to `X-Forwarded-For`, so counting one hop in from the right yields the
true client. Set this wrong and every user on earth collapses into a single IP bucket, and
the per-IP cap (10/min) locks the whole app out for everyone. Verified in production: the
guard logs the real client IP, not Caddy's.

**Caddy needs a long read timeout.** An agentic answer is several model turns with MCP tool
calls between them — a real on-chain question measured 38s, and the app's own hard deadline
is 75s. A proxy that gives up first throws away a reply the tokens were already paid for.

## Redeploy

```bash
# from the repo root, on your machine
tar czf - --exclude=.git --exclude=node_modules --exclude=.next --exclude=.env.local . \
  | ssh root@37.60.232.191 'tar xzf - -C /srv/bugglo && chown -R bugglo:bugglo /srv/bugglo'

ssh root@37.60.232.191 '
  su - bugglo -s /bin/bash -c "cd /srv/bugglo && npm ci && npm run build" &&
  systemctl restart bugglo'
```

`.env.local` is deliberately excluded — the server's copy is the production one and holds
the only place in the whole deployment that names the engine's model.

## Watch it

```bash
systemctl status bugglo
journalctl -u bugglo -f                       # live
journalctl -u bugglo | grep "over limit"      # who is being throttled, and by which cap
```

## MCP fleet, as of deploy

Six servers come up (**121 tools**): `robinx` (6), `boo-crypto` (9), `dexscreener` (8),
`boar-basic` (46), `boar-advanced` (19), `fuse` (33).

Three do not, and none of them is a code fault:
`etherscan` needs `ETHERSCAN_API_KEY`; `blockscout` answers *"no server found"*;
`hooddomains` times out on stdio. The agent runs without them — a dead server is one we do
without, never a dead chat endpoint.

## Still to do (needs you, not the server)

- **Google login is not live yet.** Add `https://bugglo.37.60.232.191.sslip.io` to the
  Authorized JavaScript origins of the OAuth client in Google Cloud Console. Until then,
  wallet login works and Google login will not.
- **Rotate the root password.** It was pasted into a chat transcript.
