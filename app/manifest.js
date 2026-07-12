import { APP_NAME } from "@/lib/chatContract";

export default function manifest() {
  return {
    name: `${APP_NAME} — Robinhood Chain intelligence`,
    short_name: APP_NAME,
    description:
      "AI-assisted Robinhood Chain intelligence for token risk, deployer reputation, wallet analysis, and market moves.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    background_color: "#0a0a0a",
    theme_color: "#cbda1b",
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
        description: "Open HoodScope chat",
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
