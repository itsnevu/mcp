import { SITE_URL, absoluteUrl } from "@/lib/seo";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /* /api answers callers, not readers, and /offline is the service worker's
           fallback shell — a searcher who lands on it has been given a dead page.
           Nothing else is blocked: crawlers need /_next to render the app, and
           blocking the assets they render with is how a site scores as broken. */
        disallow: ["/api/", "/offline"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
