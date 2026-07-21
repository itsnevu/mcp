import { APP_NAME } from "@/lib/chatContract";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";

export default function manifest() {
  return {
    /* Sourced from the same constants as the page metadata: the install prompt and
       the search result should not be able to describe the app differently. */
    name: SITE_TITLE,
    short_name: APP_NAME,
    description: SITE_DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    background_color: "#ffffff",
    theme_color: "#013EF5",
    orientation: "portrait-primary",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Chat",
        short_name: "Chat",
        description: "Open BUGGLO chat",
        url: "/",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Developer Docs",
        short_name: "Docs",
        description: "Open API and integration documentation",
        url: "/docs",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
