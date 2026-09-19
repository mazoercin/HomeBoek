import { requireRole } from "@/lib/auth/require-role";
import { leesLogRegels } from "@/lib/logger.server";
import { haalFamilienaam } from "@/lib/data/instellingen";
import { lijstGebruikers } from "@/lib/auth/gebruiker";
import { LogViewer } from "@/components/instellingen/LogViewer";
import { FamilienaamKaart } from "@/components/instellingen/FamilienaamKaart";
import { GebruikersBeheer } from "@/components/instellingen/GebruikersBeheer";
import {
  wisLogboek,
  zetFamilienaam,
  verwijderGebruiker,
  stuurWachtwoordResetLink,
  veranderWachtwoordVoorGebruiker,
} from "./actions";
import { uitloggen } from "../logout-action";

export const dynamic = "force-dynamic";

export default async function InstellingenPagina() {
  const sessie = requireRole("admin");
  const [regels, familienaam, gebruikers] = await Promise.all([
    leesLogRegels(200),
    haalFamilienaam(),
    lijstGebruikers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Instellingen</h1>
        <form action={uitloggen}>
          <button type="submit" className="knop-secundair min-h-[40px] px-4 text-sm">
            Uitloggen
          </button>
        </form>
      </div>

      <FamilienaamKaart huidigeNaam={familienaam} onOpslaan={zetFamilienaam} />

      <GebruikersBeheer
        gebruikers={gebruikers}
        huidigeGebruikerId={sessie.gebruikerId}
        onVerwijderen={verwijderGebruiker}
        onResetLinkSturen={stuurWachtwoordResetLink}
        onWachtwoordWijzigen={veranderWachtwoordVoorGebruiker}
      />

      <LogViewer regels={regels} onWissen={wisLogboek} />
    </div>
  );
}
