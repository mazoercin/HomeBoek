import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saldo — HuisBoek",
  description: "Gezinsfinanciën overzichtelijk beheren",
};

const THEMA_SCRIPT = `
try {
  var opgeslagen = localStorage.getItem("saldo_thema");
  var donker = opgeslagen ? opgeslagen === "donker" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", donker);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEMA_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
