import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HuisBalans, je digitale huishoudboekje",
  description:
    "Weet elke maand wat er overblijft. Beheer inkomen, vaste kosten, facturen en spaardoelen van je gezin. Zonder bankkoppeling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
