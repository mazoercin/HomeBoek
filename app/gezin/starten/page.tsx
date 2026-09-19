import { redirect } from "next/navigation";
import { requireSessie } from "@/lib/auth/require-role";
import { maakServerClient } from "@/lib/supabase/server";
import { haalUitnodigingToken } from "@/lib/auth/uitnodiging-cookie";
import { logger } from "@/lib/logger.server";

export const dynamic = "force-dynamic";

/**
 * Geen huishouden? Dan wordt er hier automatisch één aangemaakt — geen
 * knop, geen formulier. Een eerdere versie liet de gebruiker hier zelf
 * op "Starten" klikken, maar die stap reageerde op sommige mobiele
 * toestellen niet (client-side form action die niet leek te vuren) en
 * liet mensen vastzitten zonder enige feedback. Aanmaken + doorsturen
 * gebeurt nu volledig server-side, dus er is niets dat kan "niet
 * reageren". De standaardnaam "Ons gezin" kan achteraf gewoon gewijzigd
 * worden via Instellingen → Gezin.
 */
export default async function StartHouseholdPagina() {
  const sessie = await requireSessie();
  const supabase = maakServerClient();

  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", sessie.gebruikerId)
    .limit(1)
    .maybeSingle();

  if (data) {
    redirect("/dashboard");
  }

  // Kwam de gebruiker via een uitnodigingslink (maar landde via een
  // andere weg toch hier)? Dan hoort die eerst afgerond te worden i.p.v.
  // meteen een eigen huishouden te krijgen.
  if (haalUitnodigingToken()) {
    redirect("/uitnodiging");
  }

  const { error } = await supabase.rpc("create_household", { p_name: "Ons gezin" });

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon automatisch huishouden niet aanmaken",
      context: { gebruikerId: sessie.gebruikerId, error: error.message },
    });

    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
        <div className="kaart max-w-sm text-center animate-fade-in-up">
          <p className="font-bold text-tekst-primair mb-2">Kon je gezinsbudget niet aanmaken</p>
          <p className="text-tekst-secundair text-sm mb-4">
            Er ging iets mis. Herlaad deze pagina om het opnieuw te proberen.
          </p>
          <a href="/gezin/starten" className="knop-primair">
            Opnieuw proberen
          </a>
        </div>
      </main>
    );
  }

  redirect("/dashboard");
}
