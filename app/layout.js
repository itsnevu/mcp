import "./globals.css";

export const metadata = {
  title: "Ranger — What's moving on Robinhood Chain?",
  description:
    "Agentic AI scout for Robinhood Chain — X sentiment, rug checks, wallet analysis, and market moves.",
};

// Applies the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{var t=localStorage.getItem("ranger.theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
