import Link from "next/link";
import { CircleAlert } from "lucide-react";

/**
 * Landingsplek voor elke mislukte auth-callback: ontbrekende, verlopen of
 * al gebruikte code. Statisch en zonder eigen data-ophaling, dus dit
 * kan nooit zelf ook weer stuklopen — de vervanger van de vroegere lege
 * pagina.
 */
export default function FoutieveLinkPagina() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="kaart shadow-card-hover text-center py-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-tekort-bg mb-3">
            <CircleAlert size={24} color="#F43F5E" strokeWidth={2.25} />
          </div>
          <p className="font-bold text-tekst-primair text-lg">Deze link werkt niet meer</p>
          <p className="text-sm text-tekst-secundair mt-1.5">
            De link is verlopen, al gebruikt, of onvolledig geopend. Vraag gerust een nieuwe aan.
          </p>

          <div className="flex flex-col gap-2 mt-6">
            <Link href="/wachtwoord-vergeten" className="knop-primair w-full">
              Vraag een nieuwe link aan
            </Link>
            <Link href="/login" className="knop-secundair w-full">
              Naar inloggen
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
