import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { APP_NAME } from "@/lib/chatContract";

export const metadata = {
  applicationName: APP_NAME,
  title: `${APP_NAME} — Robinhood Chain intelligence`,
  description:
    "AI-assisted Robinhood Chain intelligence for token risk, deployer reputation, wallet analysis, and market moves.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#cbda1b",
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{var t=localStorage.getItem("hoodscope.theme")||localStorage.getItem("ranger.theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
