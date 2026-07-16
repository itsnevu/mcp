/* Censorship-resistant JSON-RPC networking. Zero dependencies — node: builtins only.
 *
 * WHY THIS EXISTS — read before changing anything.
 *
 * Robinhood Chain's public RPC lives on a robinhood.com subdomain. Several ISPs block the
 * robinhood.com domain wholesale — most notably Indonesian networks running the government
 * "Trust Positif" DNS filter, which answers a lookup of rpc.mainnet.chain.robinhood.com with the
 * filter's own server instead of the chain. From those networks, a plain connection never reaches
 * the chain, and bugglo — correctly refusing to guess — reports CANNOT CHECK. For the crypto
 * communities most exposed to fresh-chain rugs, the tool was dead on arrival.
 *
 * The endpoint itself is not geo-blocked. Only its NAME is poisoned: it sits behind Cloudflare on
 * IPs that are perfectly reachable. So when a direct connection fails, we resolve the host over
 * DNS-over-HTTPS — which the ISP's DNS cannot poison — and dial the real IP directly, keeping the
 * TLS SNI and the Host header set to the original hostname so the certificate still matches.
 *
 * The same endpoint, reached around a DNS block. No new dependency, no third-party RPC, no API key,
 * no VPN. If DoH is ALSO blocked, we fail honestly (the caller reports CANNOT CHECK). We never
 * answer about a different host than the one asked for — that is the one thing this whole project
 * exists to refuse.
 *
 * The direct path is tried FIRST and unchanged, so every network that is not blocked pays nothing:
 * no DoH lookup, no IP pinning, identical behaviour. Only a genuine connection failure opens the
 * bypass, and only a connection failure — a valid JSON-RPC error response (a revert, a rate limit)
 * is a real answer and is returned as-is, never mistaken for a block.
 */

import https from "node:https";
import http from "node:http";

/* Public DoH resolvers, tried in order. Cloudflare first: in the networks this targets, its own
   domain is reachable while the chain RPC's is not. Google is a fallback for networks where the
   reverse is true. Both speak the same JSON API (RFC 8484 application/dns-json). */
const DOH_ENDPOINTS = [
  "https://cloudflare-dns.com/dns-query",
  "https://dns.google/resolve",
];

const DOH_TIMEOUT_MS = 6_000;

/* host -> Promise<string[]> of A records. Resolved once per process; a block does not change
   mid-run, and re-asking DoH on every RPC call would be wasteful. */
const dohCache = new Map();

/* host -> ip, set once a DoH-resolved IP is proven to answer. Later calls to the same blocked host
   skip straight to it instead of re-failing the direct path. Also lets chain.js drop the doomed
   direct transport arm entirely once we know this network blocks the name. */
const pinned = new Map();

/** Has a DoH bypass already been proven for this host in this process? */
export function isPinned(host) {
  return pinned.has(host);
}

async function resolveViaDoh(host) {
  if (dohCache.has(host)) return dohCache.get(host);
  const task = (async () => {
    for (const endpoint of DOH_ENDPOINTS) {
      try {
        const res = await fetch(`${endpoint}?name=${encodeURIComponent(host)}&type=A`, {
          headers: { accept: "application/dns-json" },
          signal: AbortSignal.timeout(DOH_TIMEOUT_MS),
        });
        if (!res.ok) continue;
        const json = await res.json();
        // type 1 === A record. The answer set may also carry CNAME (type 5) hops; ignore those and
        // keep the addresses they resolve to.
        const ips = (json?.Answer || [])
          .filter((a) => a?.type === 1 && typeof a.data === "string")
          .map((a) => a.data.trim())
          .filter(Boolean);
        if (ips.length) return ips;
      } catch {
        // try the next resolver
      }
    }
    return [];
  })();
  dohCache.set(host, task);
  return task;
}

/* One JSON-RPC POST over node:http(s). When `ip` is given we dial that address but leave every
   name-based check — SNI, the Host header, certificate validation — pinned to the real hostname,
   so a Cloudflare-fronted endpoint still terminates TLS and routes correctly.
   Resolves for ANY HTTP response (including 4xx/5xx and JSON-RPC errors); rejects ONLY on a
   transport-level failure (DNS, connect, TLS, timeout) — that distinction is what decides whether
   the DoH bypass is worth trying. */
function postJsonRpc(urlObj, body, { ip, timeout }) {
  return new Promise((resolve, reject) => {
    const secure = urlObj.protocol === "https:";
    const lib = secure ? https : http;
    const options = {
      method: "POST",
      // Dial the pinned IP when we have one, else let the OS resolve the name. Either way SNI, the
      // Host header, and certificate validation stay pinned to the real hostname below — so a
      // Cloudflare-fronted endpoint still terminates TLS and routes correctly, and the cert is
      // checked against the name we asked for, never against a bare IP.
      host: ip || urlObj.hostname,
      port: urlObj.port || (secure ? 443 : 80),
      path: `${urlObj.pathname}${urlObj.search}`,
      servername: urlObj.hostname, // SNI = the real hostname even when host is a bare IP
      headers: {
        host: urlObj.hostname, // Host header = the real hostname even when dialing an IP
        "content-type": "application/json",
        accept: "application/json",
        "content-length": Buffer.byteLength(body),
      },
    };

    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      fn(arg);
    };
    /* A hard overall deadline, not a socket-inactivity timeout: this bounds DNS + connect + a
       server that slow-drips the body, none of which req.setTimeout alone would cover. Without it
       a hostile or degraded endpoint could stall a rug check well past `timeout`. */
    const deadline = setTimeout(() => {
      req.destroy(new Error(`request timed out after ${timeout}ms`));
    }, timeout);

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("error", (err) => finish(reject, err)); // a socket reset mid-body must not go unhandled
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          // leave json null; unwrap() decides what a non-JSON body means
        }
        finish(resolve, { status: res.statusCode, json, text });
      });
    });
    req.on("error", (err) => finish(reject, err));
    req.end(body);
  });
}

function unwrap({ status, json, text }) {
  if (!json) {
    throw new Error(`non-JSON response (HTTP ${status ?? "?"}): ${text.slice(0, 120).replace(/\s+/g, " ")}`);
  }
  if (json.error) {
    const err = new Error(json.error.message || "RPC error");
    if (typeof json.error.code === "number") err.code = json.error.code;
    if (json.error.data !== undefined) err.data = json.error.data;
    throw err;
  }
  return json.result;
}

/**
 * A single JSON-RPC call that routes around DNS-level blocking.
 *
 * Direct connection first (system DNS, unchanged). On a transport-level failure only, resolve the
 * host via DoH and retry against each returned IP with the hostname pinned for SNI/Host/cert. A
 * valid response that happens to carry a JSON-RPC error is returned to unwrap() untouched — it is
 * an answer, not a block, and must not trip the bypass.
 *
 * @returns the JSON-RPC `result`. Throws on RPC error or when every path fails.
 */
export async function rpcRequest(url, method, params = [], { timeout = 10_000 } = {}) {
  const urlObj = new URL(url);
  const host = urlObj.hostname;
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });

  // Known-blocked host: go straight to the proven IP.
  const pin = pinned.get(host);
  if (pin) return unwrap(await postJsonRpc(urlObj, body, { ip: pin, timeout }));

  let response;
  try {
    response = await postJsonRpc(urlObj, body, { timeout });
  } catch (directError) {
    // Transport-level failure. This is the shape of a DNS block — try to reach the real IP.
    const ips = await resolveViaDoh(host);
    for (const ip of ips) {
      try {
        response = await postJsonRpc(urlObj, body, { ip, timeout });
        pinned.set(host, ip); // this network blocks the name; remember the way around it
        break;
      } catch {
        response = undefined; // try the next IP
      }
    }
    if (!response) throw directError; // surface the original failure, not a DoH artefact
  }

  return unwrap(response);
}
