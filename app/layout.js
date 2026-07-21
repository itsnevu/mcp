import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import JsonLd from "@/components/JsonLd";
import { APP_NAME } from "@/lib/chatContract";
import {
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  organizationLd,
  webSiteLd,
} from "@/lib/seo";

export const metadata = {
  /* Anchors every relative URL in the metadata tree — og:image, canonicals, the
     alternates below. Without it Next emits a relative og:image path, which every
     social crawler drops on the floor. */
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    template: `%s | ${APP_NAME}`,
    /* The bare brand, by product decision — this string is the browser tab AND the
       blue headline in a search result, and the tab was to read "Bugglo".
       The keyword-carrying variant survives in og:title below, which is a separate
       tag: the social card keeps it, the tab does not have to. */
    default: APP_NAME,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: APP_NAME, url: SITE_URL }],
  creator: APP_NAME,
  publisher: APP_NAME,
  category: "finance",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  /* Spelled out rather than left to the crawler's defaults: max-image-preview
     large is what lets the Open Graph card appear in the result itself, and an
     unlimited snippet is the difference between a rich result and a truncated one. */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo-128.png", sizes: "128x128", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/logo-128.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  /* Emitted only once the console codes are actually in the environment. An empty
     verification tag is worse than none: it reads as claimed but verifies nothing. */
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION
      ? { yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION }
      : {}),
  },
};

export const viewport = {
  themeColor: "#013EF5",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{var t=localStorage.getItem("hoodscope.theme")||localStorage.getItem("ranger.theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

import { I18nProvider } from "@/lib/I18nContext";

export default function RootLayout({ children }) {
  return (
    /* Stays "en" whatever interface language the visitor picked: the markup a
       crawler receives is the English one — the translations are applied on the
       client and a crawler sends no language cookie — so any other value here
       would be a claim about the document that the document does not honour. */
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Warms DNS and TLS for the Google Identity script before the auth gate
            gets around to asking for it. */}
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Declared once at the root; every page's structured data then references
            these two nodes by @id instead of restating the publisher per route. */}
        <JsonLd data={[organizationLd(), webSiteLd()]} />
        <I18nProvider>
          <PwaRegister />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
