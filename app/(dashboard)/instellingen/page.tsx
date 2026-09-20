import { vereisHousehold } from "@/lib/auth/household";
import { leesLogRegels } from "@/lib/logger.server";
import { haalHouseholdOverzicht } from "@/lib/data/household";
import { isNepEmail } from "@/lib/auth/nep-email";
import { LogViewer } from "@/components/instellingen/LogViewer";
import { HouseholdNaamKaart } from "@/components/instellingen/HouseholdNaamKaart";
import { GebruikersToevoegenKaart } from "@/components/instellingen/GebruikersToevoegenKaart";
import { HerstelEmailKaart } from "@/components/instellingen/HerstelEmailKaart";
import { LedenBeheer } from "@/components/instellingen/LedenBeheer";
import { JouwGegevensKaart } from "@/components/instellingen/JouwGegevensKaart";
import { wisLogboek } from "./actions";
import {
  zetHouseholdInstellingen,
  maakGezinsAccount,
  resetLidWachtwoord,
  zetEigenEmail,
  wijzigLidRol,
  verwijderLid,
  draagEigenaarschapOver,
  verlaatHousehold,
  downloadMijnGegevens,
  verwijderMijnAccount,
} from "@/app/gezin/actions";
import { bepaalVerwijderScope } from "@/lib/auth/account-verwijderen";
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
  const eigenEmail = overzicht.leden.find((lid) => lid.user_id === context.gebruikerId)?.profiel?.email ?? "";
  const aantalEigenaren = overzicht.leden.filter((lid) => lid.role === "owner").length;
  const verwijderScope = bepaalVerwijderScope(context.rol, aantalEigenaren);
  const gezinsledenNamen = overzicht.leden
    .filter((lid) => lid.user_id !== context.gebruikerId)
    .map((lid) => lid.profiel?.gebruikersnaam ?? lid.display_name ?? "Onbekend lid");

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

      {isOwner && <HerstelEmailKaart huidigeEmail={eigenEmail} isNepAdres={isNepEmail(eigenEmail)} onOpslaan={zetEigenEmail} />}

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

      <JouwGegevensKaart
        scope={verwijderScope}
        gezinsledenNamen={gezinsledenNamen}
        onDownloaden={downloadMijnGegevens}
        onVerwijderen={verwijderMijnAccount}
      />

      {isOwner && <LogViewer regels={regels} onWissen={wisLogboek} />}
    </div>
  );
}
