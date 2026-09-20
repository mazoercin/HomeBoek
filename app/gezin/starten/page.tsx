import { redirect } from "next/navigation";
import { requireSessie } from "@/lib/auth/require-role";
import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { verwijderMijnAccount } from "@/app/gezin/actions";
import { VerwijderAccountFormulier } from "@/components/instellingen/VerwijderAccountFormulier";

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
 *
 * Uitzondering: ?account_verwijderen=1. Dit is het herstelpad voor een
 * account dat géén household_members-rij (meer) heeft, niet omdat het
 * een nieuwe gebruiker is, maar omdat een eerdere "account verwijderen"
 * strandde ná het weghalen van het huishouden maar vóór de laatste stap
 * (het eigen account). Zonder deze gate zou zo iemand hier gewoon een
 * nieuw, leeg huishouden krijgen in plaats van de kans om de
 * verwijdering af te maken. Deze query-parameter wijzigt niets aan het
 * standaardpad hierboven.
 */
export default async function StartHouseholdPagina({
  searchParams,
}: {
  searchParams: { account_verwijderen?: string };
}) {
  const sessie = await requireSessie();

  if (searchParams.account_verwijderen === "1") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
        <div className="kaart max-w-sm w-full animate-fade-in-up space-y-3">
          <p className="font-bold text-tekst-primair">Account verwijderen</p>
          <p className="text-sm text-tekst-secundair">
            Er is geen huishouden meer aan dit account gekoppeld — waarschijnlijk omdat een eerdere poging om
            je account te verwijderen niet volledig afrondde. Rond dit hier af.
          </p>
          <VerwijderAccountFormulier onVerwijderen={verwijderMijnAccount} />
        </div>
      </main>
    );
  }

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
