import type { Config } from "tailwindcss";

// Kleurenpalet als Tailwind-tokens, gekoppeld aan CSS-variabelen in
// app/globals.css. Zo blijft het palet op één plek gedefinieerd en
// consistent herbruikbaar in alle componenten.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primair: "#4F8EF7",
        secundair: "#FF7A59",
        succes: "#22C55E",
        "succes-bg": "#E6F9EE",
        tekort: "#EF4444",
        "tekort-bg": "#FDEAEA",
        goud: "#D4AF37",
        "goud-bg": "#FDF6E3",
        achtergrond: "#FFF8F0",
        kaart: "#FFFFFF",
        "tekst-primair": "#1E293B",
        "tekst-secundair": "#64748B",
        rand: "#F1F5F9",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
