import type { Config } from "tailwindcss";

// Professioneel dashboard-kleurenpalet, gekoppeld aan CSS-variabelen in
// app/globals.css (licht/donker-varianten daar). Eén bron van waarheid
// zodat elk component dezelfde tokens hergebruikt.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primair: {
          DEFAULT: "#6366F1",
          dark: "#4F46E5",
          light: "#EEF2FF",
        },
        secundair: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          light: "#FFFBEB",
        },
        succes: { DEFAULT: "#10B981", bg: "#ECFDF5" },
        tekort: { DEFAULT: "#F43F5E", bg: "#FFF1F2" },
        goud: { DEFAULT: "#D4AF37", bg: "#FDF8E8" },
        achtergrond: "#F8FAFC",
        kaart: "#FFFFFF",
        "tekst-primair": "#0F172A",
        "tekst-secundair": "#64748B",
        rand: "#E2E8F0",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover": "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
        nav: "0 1px 0 0 rgb(15 23 42 / 0.06), 0 4px 16px -4px rgb(15 23 42 / 0.08)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
      },
      backgroundImage: {
        "gradient-app": "linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)",
        "gradient-primair": "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
        "gradient-secundair": "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
        "gradient-succes": "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
        "gradient-goud": "linear-gradient(135deg, #E8C766 0%, #D4AF37 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
