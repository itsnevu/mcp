import { absoluteUrl } from "@/lib/seo";

/* Every indexable route, and only those — /offline and the API are excluded here
   for the same reason robots.js disallows them. A sitemap that lists a page we
   also tell crawlers not to index is a contradiction they report as an error.

   `priority` is relative within this list: the app itself outranks the pages that
   exist to explain it, and the legal pages rank last. */
const routes = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/intro", changeFrequency: "weekly", priority: 0.9 },
  { path: "/docs", changeFrequency: "weekly", priority: 0.8 },
  { path: "/docs/robinx-mcp", changeFrequency: "weekly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/learn", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap() {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
