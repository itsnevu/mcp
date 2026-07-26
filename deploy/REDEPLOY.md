# Redeploy runbook

Deploying the production-hardening commit. Read step 0 before anything else: two values in
`bugglo.service` were chosen without measuring this box, and applying them blind can OOM-kill the
app or take the site off the internet.

Everything below runs from your machine unless it says otherwise.

---

## 0. Pre-flight — three things that can break the site

### 0a. Where does Caddy actually send traffic?

`bugglo.service` now starts the app with `-H 127.0.0.1`. Before this it bound `0.0.0.0`, so Caddy
could reach it on any interface. If Caddy's upstream is anything other than loopback, this change
takes the site down the moment you restart.

```bash
ssh root@37.60.232.191 'grep -rn "reverse_proxy" /etc/caddy/Caddyfile'
```

Expected: `reverse_proxy 127.0.0.1:3100` or `reverse_proxy localhost:3100`. **Anything else** (a
public IP, a container address, a unix socket) means fix the Caddyfile first or drop `-H 127.0.0.1`
from the unit.

### 0b. Does the app actually fit in MemoryMax?

`MemoryMax=1500M` is a guess. The real number is whatever this process plus its six MCP children
use at peak. Measure before you enforce:

```bash
ssh root@37.60.232.191 'systemctl show bugglo -p MemoryCurrent; systemctl status bugglo | head -20'
```

`MemoryCurrent` is in bytes. Divide by 1048576 for MB. **Set `MemoryMax` to roughly 2x that, and
never below it** — a ceiling under the working set means systemd kills the app under normal load,
which is a self-inflicted outage rather than protection.

Same for `TasksMax=256`: six MCP servers, some spawned via npx, plus Node's thread pool.

```bash
ssh root@37.60.232.191 'systemctl show bugglo -p TasksCurrent'
```

If `TasksCurrent` is anywhere near 256, raise the ceiling.

### 0c. Take a rollback copy

The deploy untars over `/srv/bugglo` and then builds **in place on the live server**. A failed
build leaves a half-updated directory serving traffic. There is no rollback without this step.

```bash
ssh root@37.60.232.191 '
  cp -a /srv/bugglo /srv/bugglo.bak.$(date +%F-%H%M) &&
  cp /srv/bugglo/.env.local /root/env.local.bak.$(date +%F-%H%M) &&
  ls -d /srv/bugglo.bak.*'
```

`.env.local` is the only copy of the production model id and engine key. Back it up separately.

---

## 1. Ship the code

`.env.local` is excluded on purpose: the server's copy is the production one.

```bash
cd /path/to/repo
tar czf - --exclude=.git --exclude=node_modules --exclude=.next --exclude=.env.local . \
  | ssh root@37.60.232.191 'tar xzf - -C /srv/bugglo && chown -R bugglo:bugglo /srv/bugglo'
```

## 2. Build, as the app user

```bash
ssh root@37.60.232.191 'su - bugglo -s /bin/bash -c "cd /srv/bugglo && npm ci && npm run build"'
```

Stop here if this fails. The old build is still running and still serving; do not restart.

## 3. Install the systemd unit

The unit file changed, so copying the repo is not enough. It has to be installed and reloaded.

```bash
ssh root@37.60.232.191 '
  cp /srv/bugglo/deploy/bugglo.service /etc/systemd/system/bugglo.service &&
  systemctl daemon-reload &&
  systemctl restart bugglo &&
  sleep 5 &&
  systemctl status bugglo --no-pager | head -20'
```

## 4. Verify

```bash
# every one of these must print a value, not blank
curl -sSI https://bugglo.37.60.232.191.sslip.io/ | grep -iE \
  'content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'

# must print nothing at all
curl -sSI https://bugglo.37.60.232.191.sslip.io/ | grep -i x-powered-by

# tools back up, and paidToolsEnabled must stay false
curl -sS 'https://bugglo.37.60.232.191.sslip.io/api/health?probe=1'

# oversized body must be refused
head -c 11000000 /dev/zero | tr '\0' 'A' > /tmp/big.txt
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  https://bugglo.37.60.232.191.sslip.io/api/chat \
  -H 'content-type: application/json' --data-binary @/tmp/big.txt   # expect 401 or 413, never 200
```

Then open the site in a browser with the console visible and check two flows the CSP could break:

- **Google Sign-In** — the GSI script and its iframe are allowed explicitly. A CSP violation shows
  in the console as a `Refused to load` line naming the blocked directive.
- **Wallet login** — `personal_sign` is a wallet extension call and CSP does not touch it, but the
  page it runs on is now `frame-ancestors 'none'`, so confirm the modal still opens.

If either breaks, the fix is a directive in `next.config.mjs`, not turning CSP off.

## 5. Watch it for a few minutes

```bash
ssh root@37.60.232.191 'journalctl -u bugglo -f'
```

A `MemoryMax` that is too low shows up here as the service being killed and restarted in a loop.
That is step 0b not having been done.

---

## Rollback

```bash
ssh root@37.60.232.191 '
  systemctl stop bugglo &&
  rm -rf /srv/bugglo &&
  mv /srv/bugglo.bak.<TIMESTAMP> /srv/bugglo &&
  cp /srv/bugglo/deploy/bugglo.service /etc/systemd/system/bugglo.service &&
  systemctl daemon-reload && systemctl start bugglo'
```

---

## Env values that live only on the server

`.env.local` is gitignored, so nothing below survives a rebuild from a fresh clone. If you ever
recreate the box, set these by hand — each one is there because its default was wrong in a way
that took a while to see.

```bash
MCP_CONNECT_TIMEOUT_MS=20000     # default 8000, and the code doubles it for the deadline
ENGINE_PRICE_INPUT_PER_MTOK=0.269
ENGINE_PRICE_OUTPUT_PER_MTOK=0.400
```

**`MCP_CONNECT_TIMEOUT_MS`.** Five MCP servers start over stdio via `npx`, all spawned at once.
The 8s default gives a 16s deadline, which is enough on an idle box and not enough right after a
build — CPU and page cache are still busy, every stdio server misses it, and the fleet comes up
at 98 tools instead of 121. That is not self-healing: `mcpState` in `lib/liveAgent.js` is a lazy
singleton that only clears when the fleet fails *completely*, so a partial success is cached for
the life of the process. Restart is the only recovery. 20s (40s deadline) has cleared it every
time; the cost is paid by the health probe rather than a user, because nothing warms the fleet
at boot and the first caller pays the cold start either way.

**`ENGINE_PRICE_*`.** These are what `lib/rateLimit.js` charges against the daily USD caps, and
they are not fetched from anywhere — a wrong number silently moves the cap. They were 0.214 and
0.322 against a real `deepseek/deepseek-v3.2` price of 0.269 and 0.400, so every request was
booked about 20% cheap and `ENGINE_GLOBAL_USD_PER_DAY=5` was really allowing closer to $6.25.
**Re-check these whenever `ROBINX_ENGINE_MODEL` changes** — the caps are only as honest as these
two numbers.

## Still not fixed by this deploy

These need a decision or a purchase, not a restart. Full reasoning is in the audit.

- **A real domain.** `sslip.io` is not in the Public Suffix List, so every `*.sslip.io` host counts
  as same-site: `SameSite=Lax` gives no CSRF protection against them, and any of them can plant a
  `Domain=sslip.io` cookie over the session. No header fixes this.
- **Rotate the root password** that was pasted into a chat transcript, and stop deploying as root.
- **Spend counters live in process memory**, so a restart loop resets the daily USD cap to zero.
- **Nothing calls `/api/health`.** Hitting the global cap is a silent outage until UTC midnight.
- **Caddy** needs a request-body cap of its own and its config committed to git.
- **Tool output is not fenced as untrusted** before reaching a tool-calling model, though attacker
  controlled token names and third-party MCP text pass through it.
- **Do not set `ROBINX_WALLET_KEY`** until the x402 spend path is metered. Production currently
  reports `paidToolsEnabled: false`, which is the safe state.
