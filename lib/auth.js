import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { APP_NAME } from "./chatContract";

export const AUTH_COOKIE = "hoodscope_session";
export const WALLET_NONCE_COOKIE = "hoodscope_wallet_nonce";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
/* Guests get a day, not a week. The cookie is free to mint, so it is not an identity —
   it only exists so a visitor's turns reach the live engine at all. What actually bounds
   a guest is the IP-pinned budget in lib/rateLimit.js, never this. */
export const GUEST_SESSION_MAX_AGE = 60 * 60 * 24;
const NONCE_MAX_AGE = 60 * 5;

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function authSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  // Fail closed. The dev fallback is a PUBLIC constant in this repo — anyone could forge a
  // session cookie for any identity with it. It is therefore only allowed when NODE_ENV is
  // *explicitly* "development" or "test"; an unset or unexpected NODE_ENV on a live host must
  // throw, not silently sign real sessions with a known secret.
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
    throw new Error("AUTH_SECRET is required (dev fallback only runs with NODE_ENV=development|test)");
  }
  return "dev-only-hoodscope-auth-secret-change-before-deploy";
}

function sign(value) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSignedToken(payload, maxAge = SESSION_MAX_AGE) {
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + maxAge,
    })
  );
  return `${body}.${sign(body)}`;
}

export function verifySignedToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;

  try {
    const payload = JSON.parse(fromBase64url(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header) {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf("=");
      if (index > -1) acc[part.slice(0, index)] = decodeURIComponent(part.slice(index + 1));
      return acc;
    }, {});
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.get("cookie"));
  const session = verifySignedToken(cookies[AUTH_COOKIE]);
  if (!session || !session.sub || !session.provider) return null;
  return {
    sub: session.sub,
    provider: session.provider,
    name: session.name || "",
    email: session.email || "",
    picture: session.picture || "",
    address: session.address || "",
  };
}

export function cookieHeader(name, value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function sessionCookie(user) {
  return cookieHeader(AUTH_COOKIE, createSignedToken(user), SESSION_MAX_AGE);
}

export function guestSessionCookie(user) {
  return cookieHeader(
    AUTH_COOKIE,
    createSignedToken(user, GUEST_SESSION_MAX_AGE),
    GUEST_SESSION_MAX_AGE
  );
}

export function isGuestSession(session) {
  return session?.provider === "guest";
}

export function clearCookie(name) {
  return cookieHeader(name, "", 0);
}

export function unauthorizedResponse() {
  return Response.json({ error: "authentication required" }, { status: 401 });
}

export function randomNonce() {
  return randomBytes(18).toString("base64url");
}

export function isValidEvmAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(address || ""));
}

export function walletNonceCookie({ address, nonce }) {
  return cookieHeader(
    WALLET_NONCE_COOKIE,
    createSignedToken({ address: address.toLowerCase(), nonce }, NONCE_MAX_AGE),
    NONCE_MAX_AGE
  );
}

export function getWalletNonceFromRequest(req) {
  const cookies = parseCookies(req.headers.get("cookie"));
  return verifySignedToken(cookies[WALLET_NONCE_COOKIE]);
}

export function walletLoginMessage({ address, nonce, origin }) {
  return [
    `${APP_NAME} wants you to sign in with your MetaMask, Phantom, or EVM-compatible wallet.`,
    "",
    `Address: ${address}`,
    `Origin: ${origin || "unknown"}`,
    `Nonce: ${nonce}`,
    "",
    "This signature only proves wallet ownership. It does not trigger a transaction or spend funds.",
  ].join("\n");
}
