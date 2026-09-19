/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Deze dashboard-pagina's zijn al force-dynamic (altijd verse data
    // uit Supabase), maar Next.js bewaart client-side toch nog even een
    // kopie van elke bezochte dynamische pagina (standaard 30s) — dat
    // gaf net-geregistreerde maanden die soms nog als "niet
    // geregistreerd" verschenen. Op 0 gezet zodat elke navigatie
    // ernaartoe altijd echt vers ophaalt.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
