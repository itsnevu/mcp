import { APP_NAME, CHAIN_NAME } from "./chatContract";

/* The canonical origin every absolute URL we emit is built from — canonical links,
   og:image, sitemap entries, JSON-LD @ids. This is not cosmetic: a canonical that
   points at localhost tells Google the real page is one it cannot crawl, and the
   site drops out of the index. Set NEXT_PUBLIC_SITE_URL in production. The Vercel
   variable covers the default deploy; localhost is only ever right in dev. */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = APP_NAME;

/* "Agentic AI" is the term this product is actually searched for and the one it
   genuinely is — it plans, calls tools, and acts — so it leads the title, which is
   the strongest on-page signal there is. It stays out in front of the chain name
   because the category is what a cold searcher types; the brand is what they type
   once they already know us. */
export const SITE_TITLE = `${APP_NAME} | Agentic AI for ${CHAIN_NAME}`;
export const SITE_DESCRIPTION = `${APP_NAME} is an agentic AI terminal for ${CHAIN_NAME}. The AI agent plans, calls live on-chain tools, and answers with evidence — token risk checks, rug checks, deployer reputation, wallet analysis, and market moves, all in plain language.`;

/* Only real, defensible terms. Search engines ignore the keywords meta outright,
   but other surfaces (some crawlers, AI answer engines) still read it, and a page
   claiming terms its copy does not support reads as spam to every one of them —
   which is why this is a list of things the product does, not a wish list. */
export const SITE_KEYWORDS = [
  APP_NAME,
  "agentic AI",
  "agentic AI agent",
  "autonomous AI agent",
  "agentic AI for crypto",
  "agentic blockchain AI",
  "AI agent for on-chain analysis",
  CHAIN_NAME,
  `agentic AI ${CHAIN_NAME}`,
  "Robinhood Chain explorer",
  "on-chain intelligence",
  "crypto AI assistant",
  "rug check",
  "token risk analysis",
  "honeypot detection",
  "deployer reputation",
  "wallet analysis",
  "smart contract audit",
  "Model Context Protocol",
  "RobinX MCP",
  "bugglo CLI",
  "npx bugglo",
  "rug check CLI",
  "bugglo-mcp",
  "blockchain analytics",
];

export function absoluteUrl(path = "/") {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/* One factory for every page's metadata, so canonical/Open Graph/Twitter can never
   drift apart or be silently forgotten on a new route. Pass the path and the copy;
   the social tags are derived from them. */
export function pageMetadata({
  title,
  /* Opts the page out of the root `%s | Bugglo` template. Use when the title
     already carries the brand, so it does not render as "Introducing Bugglo | Bugglo". */
  absoluteTitle,
  description,
  path = "/",
  keywords,
  type = "website",
  robots,
  publishedTime,
  modifiedTime,
}) {
  const url = absoluteUrl(path);
  /* metadata.title runs through the root layout's title template, but og:title
     does not — it has to arrive already complete. */
  const socialTitle = absoluteTitle || (title ? `${title} | ${APP_NAME}` : SITE_TITLE);

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: APP_NAME,
      title: socialTitle,
      description,
      locale: "en_US",
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
    ...(robots ? { robots } : {}),
  };
}

/* Pages that exist for the app, not for readers. A search result landing on the
   offline shell or the 404 is a bad result for everyone. */
export const NOINDEX = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

/* ── JSON-LD ────────────────────────────────────────────────────────────────
   Stable @ids let the graph reference nodes across pages instead of restating
   them — the Organization declared once on the home page is the same entity the
   docs page's publisher points at. */

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: APP_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo-512.png"),
      width: 512,
      height: 512,
    },
    description: SITE_DESCRIPTION,
  };
}

export function webSiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: APP_NAME,
    /* The names people actually search us by. alternateName is how a knowledge
       graph learns that "agentic AI for Robinhood Chain" and "Bugglo" are the
       same entity. */
    alternateName: [
      SITE_TITLE,
      `${APP_NAME} agentic AI`,
      `Agentic AI for ${CHAIN_NAME}`,
    ],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

/* The product itself. `price: "0"` is the honest reading of a free research
   preview — omitting Offer entirely makes the entry ineligible for rich results,
   and inventing a price would be worse. */
export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: APP_NAME,
    alternateName: `${APP_NAME} — agentic AI for ${CHAIN_NAME}`,
    url: SITE_URL,
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "Agentic AI for blockchain analytics",
    operatingSystem: "Web browser",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    description: SITE_DESCRIPTION,
    softwareVersion: "1.0.0",
    publisher: { "@id": ORG_ID },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    /* Written as capabilities of an agent, because that is what the product is and
       what an answer engine quoting this list should say about it. */
    featureList: [
      "Agentic AI that plans a query, calls on-chain tools, and answers with evidence",
      "Conversational token rug checks and honeypot detection",
      "Deployer reputation and wallet forensics",
      "Autonomous tool use over live on-chain data via the RobinX Model Context Protocol",
      "Trending tokens and market sentiment",
      "Structured result widgets with on-chain evidence",
      "Installable as an offline-capable progressive web app",
      /* The same rug-check engine, shipped as the `bugglo` CLI and the `bugglo-mcp`
         server. It stays on this entity's feature list rather than becoming a second
         SoftwareApplication: it is the same capability, reached through another door.
         `operatingSystem` above still says "Web browser" because this @id is the app. */
      "Terminal rug checks and an MCP server for agents, via the bugglo and bugglo-mcp npm packages",
    ],
  };
}

export function breadcrumbLd(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/* Google renders FAQ rich results only when the structured answers are the same
   answers a visitor sees, so `items` must come from whatever the page renders —
   never a hand-kept parallel copy. */
export function faqPageLd(items, path) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteUrl(path)}/#faq`,
    inLanguage: "en",
    isPartOf: { "@id": SITE_ID },
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function techArticleLd({ title, description, path, sections }) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${absoluteUrl(path)}/#article`,
    headline: title,
    description,
    url: absoluteUrl(path),
    inLanguage: "en",
    isPartOf: { "@id": SITE_ID },
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    ...(sections?.length ? { articleSection: sections } : {}),
  };
}

export function webPageLd({ title, description, path, type = "WebPage" }) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${absoluteUrl(path)}/#webpage`,
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: "en",
    isPartOf: { "@id": SITE_ID },
    publisher: { "@id": ORG_ID },
  };
}
