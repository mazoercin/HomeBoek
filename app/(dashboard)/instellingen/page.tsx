import { vereisHousehold } from "@/lib/auth/household";
import { leesLogRegels } from "@/lib/logger.server";
import { haalHouseholdOverzicht } from "@/lib/data/household";
import { LogViewer } from "@/components/instellingen/LogViewer";
import { HouseholdNaamKaart } from "@/components/instellingen/HouseholdNaamKaart";
import { GebruikersToevoegenKaart } from "@/components/instellingen/GebruikersToevoegenKaart";
import { LedenBeheer } from "@/components/instellingen/LedenBeheer";
import { wisLogboek } from "./actions";
import {
  zetHouseholdInstellingen,
  maakGezinsAccount,
  resetLidWachtwoord,
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

  const aantalExtraLeden = overzicht.leden.filter((lid) => lid.role !== "owner").length;

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

      {isOwner && <GebruikersToevoegenKaart aantalExtraLeden={aantalExtraLeden} onAanmaken={maakGezinsAccount} />}

      <LedenBeheer
        leden={overzicht.leden}
        huidigeGebruikerId={context.gebruikerId}
        isOwner={isOwner}
        onRolWijzigen={wijzigLidRol}
        onVerwijderen={verwijderLid}
        onEigenaarschapOverdragen={draagEigenaarschapOver}
        onVerlaten={verlaatHousehold}
        onWachtwoordResetten={resetLidWachtwoord}
      />

      {isOwner && <LogViewer regels={regels} onWissen={wisLogboek} />}
    </div>
  );
}
