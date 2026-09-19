import { vereisHousehold } from "@/lib/auth/household";
import { leesLogRegels } from "@/lib/logger.server";
import { haalHouseholdOverzicht } from "@/lib/data/household";
import { LogViewer } from "@/components/instellingen/LogViewer";
import { HouseholdNaamKaart } from "@/components/instellingen/HouseholdNaamKaart";
import { UitnodigenKaart } from "@/components/instellingen/UitnodigenKaart";
import { LedenBeheer } from "@/components/instellingen/LedenBeheer";
import { wisLogboek } from "./actions";
import {
  zetHouseholdInstellingen,
  maakUitnodiging,
  trekUitnodigingIn,
  wijzigLidRol,
  verwijderLid,
  draagEigenaarschapOver,
  verlaatHousehold,
} from "@/app/gezin/actions";
import { uitloggen } from "../logout-action";

export const dynamic = "force-dynamic";

export default async function InstellingenPagina() {
  const context = await vereisHousehold();
  const isOwner = context.rol === "owner";

  const [overzicht, regels] = await Promise.all([
    haalHouseholdOverzicht(context.householdId),
    isOwner ? leesLogRegels(200) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Gezin</h1>
        <form action={uitloggen}>
          <button type="submit" className="knop-secundair min-h-[40px] px-4 text-sm">
            Uitloggen
          </button>
        </form>
      </div>

      <HouseholdNaamKaart
        huidigeNaam={context.householdNaam}
        huidigeCurrency={context.currency}
        kanBewerken={isOwner}
        onOpslaan={zetHouseholdInstellingen}
      />

      {isOwner && (
        <UitnodigenKaart
          openstaandeUitnodigingen={overzicht.openstaandeUitnodigingen}
          onAanmaken={maakUitnodiging}
          onIntrekken={trekUitnodigingIn}
        />
      )}

      <LedenBeheer
        leden={overzicht.leden}
        huidigeGebruikerId={context.gebruikerId}
        isOwner={isOwner}
        onRolWijzigen={wijzigLidRol}
        onVerwijderen={verwijderLid}
        onEigenaarschapOverdragen={draagEigenaarschapOver}
        onVerlaten={verlaatHousehold}
      />

      {isOwner && <LogViewer regels={regels} onWissen={wisLogboek} />}
    </div>
  );
}
