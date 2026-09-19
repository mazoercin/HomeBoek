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
  async headers() {
    return [
      {
        // De uitnodigingstoken zit enkel in het URL-fragment (nooit
        // verstuurd naar de server), maar deze header voorkomt ook dat
        // de volledige pagina-URL zelf via de Referer-header lekt naar
        // een externe link vanaf deze pagina.
        source: "/uitnodiging",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
