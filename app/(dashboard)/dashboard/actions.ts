"use server";

import { revalidatePath } from "next/cache";
import { maakServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { vereisHousehold } from "@/lib/auth/household";
import type { InkomenBron, InkomenFrequentie } from "@/types/database";
import type { KostInvoer } from "@/types/dashboard-acties";

function opnieuwValideren() {
  revalidatePath("/dashboard/[maand]", "page");
  revalidatePath("/overzicht");
}

/**
 * Voert een mutatie uit en geeft een nette foutmelding terug i.p.v. te
 * crashen. De ECHTE toegangscontrole gebeurt in de database (RLS:
 * is_member/can_edit) — probeert een viewer hier iets te schrijven, dan
 * faalt de query met een Postgres-foutmelding die hier gewoon als
 * "kon niet opslaan" naar de gebruiker terugkomt.
 */
async function veiligUitvoeren(
  code: string,
  bericht: string,
  context: Record<string, unknown>,
  actie: () => PromiseLike<{ error: { message: string } | null }>
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  try {
    const { error } = await actie();
    if (error) {
      logger.error({ code, message: bericht, context: { ...context, error: error.message } });
      return { gelukt: false, foutmelding: "Kon je gegevens niet opslaan, probeer opnieuw." };
    }
    opnieuwValideren();
    return { gelukt: true };
  } catch (error) {
    logger.error({
      code,
      message: bericht,
      context: { ...context, error: error instanceof Error ? error.message : String(error) },
    });
    return { gelukt: false, foutmelding: "Kon je gegevens niet opslaan, probeer opnieuw." };
  }
}

// ---------- Betaald/geskipt-status (gewoon een kolom op de rij zelf) ----------

export async function zetVasteKostBetaald(id: string, betaald: boolean) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon betaald-status van vaste kost niet bijwerken", { id, betaald }, () =>
    supabase.from("vaste_kosten").update({ betaald }).eq("id", id).eq("household_id", context.householdId)
  );
}

export async function zetFactuurBetaald(id: string, betaald: boolean) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon betaald-status van factuur niet bijwerken", { id, betaald }, () =>
    supabase.from("facturen").update({ betaald }).eq("id", id).eq("household_id", context.householdId)
  );
}

export async function zetExtraUitgaveGeskipt(id: string, geskipt: boolean) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon skip-status van extra uitgave niet bijwerken", { id, geskipt }, () =>
    supabase.from("extra_uitgaven").update({ geskipt }).eq("id", id).eq("household_id", context.householdId)
  );
}

/** "Wat als?"-toepassen: meerdere extra uitgaven in één keer op geskipt zetten. */
export async function pasWatAlsToe(extraUitgaveIds: string[]) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon wat-als-keuze niet opslaan", { extraUitgaveIds }, () =>
    supabase.from("extra_uitgaven").update({ geskipt: true }).in("id", extraUitgaveIds).eq("household_id", context.householdId)
  );
}

// ---------- Vaste kosten / facturen CRUD ----------

export async function voegVasteKostToe(data: KostInvoer, maand: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon vaste kost niet toevoegen", { data, maand }, () =>
    supabase.from("vaste_kosten").insert({ ...data, maand, household_id: context.householdId })
  );
}

export async function verwijderVasteKost(id: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon vaste kost niet verwijderen", { id }, () =>
    supabase.from("vaste_kosten").delete().eq("id", id).eq("household_id", context.householdId)
  );
}

export async function voegFactuurToe(data: KostInvoer, maand: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon factuur niet toevoegen", { data, maand }, () =>
    supabase.from("facturen").insert({ ...data, maand, household_id: context.householdId })
  );
}

export async function verwijderFactuur(id: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon factuur niet verwijderen", { id }, () =>
    supabase.from("facturen").delete().eq("id", id).eq("household_id", context.householdId)
  );
}

// ---------- Extra uitgaven CRUD ----------

/**
 * `id` is optioneel client-gegenereerd (zie de snel-toevoegen-FAB): geeft
 * de gebruiker die zelf mee, dan is deze aanroep idempotent — een
 * dubbele verzending (dubbelklik, trage verbinding + retry) met exact
 * dezelfde id botst op de primary key en wordt hier stil als succes
 * behandeld i.p.v. een tweede rij aan te maken.
 */
export async function voegExtraUitgaveToe(
  data: { id?: string; label: string; bedrag: number; overslaanbaar: boolean },
  maand: string
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHousehold();
  const supabase = maakServerClient();

  try {
    const { error } = await supabase
      .from("extra_uitgaven")
      .insert({ ...data, maand, household_id: context.householdId });

    if (error) {
      if (error.code === "23505") {
        // unique_violation op de id — deze extra kost staat al opgeslagen
        // (dubbele verzending met dezelfde client-UUID), geen echte fout.
        return { gelukt: true };
      }
      logger.error({
        code: "DB_001",
        message: "Kon extra uitgave niet toevoegen",
        context: { data, maand, error: error.message },
      });
      return { gelukt: false, foutmelding: "Kon je gegevens niet opslaan, probeer opnieuw." };
    }

    opnieuwValideren();
    return { gelukt: true };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Kon extra uitgave niet toevoegen",
      context: { data, maand, error: error instanceof Error ? error.message : String(error) },
    });
    return { gelukt: false, foutmelding: "Kon je gegevens niet opslaan, probeer opnieuw." };
  }
}

export async function verwijderExtraUitgave(id: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon extra uitgave niet verwijderen", { id }, () =>
    supabase.from("extra_uitgaven").delete().eq("id", id).eq("household_id", context.householdId)
  );
}

// ---------- Doelen ----------

export async function voegDoelToe(data: {
  naam: string;
  target_bedrag: number;
  maandelijks_bedrag: number;
  prioriteit: number;
}) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon doel niet toevoegen", { data }, () =>
    supabase.from("doelen").insert({ ...data, household_id: context.householdId })
  );
}

export async function verwijderDoel(id: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon doel niet verwijderen", { id }, () =>
    supabase.from("doelen").delete().eq("id", id).eq("household_id", context.householdId)
  );
}

export async function zetDoelGepauzeerd(id: string, gepauzeerd: boolean) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon doel niet pauzeren/hervatten", { id, gepauzeerd }, () =>
    supabase.from("doelen").update({ gepauzeerd }).eq("id", id).eq("household_id", context.householdId)
  );
}

/** Herschrijft de prioriteit van alle doelen in één keer op basis van hun nieuwe volgorde (sleep-en-neerzet). */
export async function herschikDoelen(doelIdsInNieuweVolgorde: string[]) {
  await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon doelen niet herschikken",
    { doelIdsInNieuweVolgorde },
    () => supabase.rpc("herschik_doelen", { p_doel_ids: doelIdsInNieuweVolgorde })
  );
}

// ---------- Investeringen ----------

export async function voegInvesteringToe(naam: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon investering niet toevoegen", { naam }, () =>
    supabase.from("investeringen").insert({ naam, household_id: context.householdId })
  );
}

export async function voegInvesteringTransactieToe(data: {
  investering_id: string;
  bedrag: number;
  datum: string;
  notitie: string | null;
}) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon investering-transactie niet toevoegen", { data }, () =>
    supabase.from("investering_transacties").insert({ ...data, household_id: context.householdId })
  );
}

export async function hernoemInvestering(id: string, naam: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon investering niet hernoemen", { id, naam }, () =>
    supabase.from("investeringen").update({ naam }).eq("id", id).eq("household_id", context.householdId)
  );
}

export async function verwijderInvestering(id: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon investering niet verwijderen", { id }, () =>
    supabase.from("investeringen").delete().eq("id", id).eq("household_id", context.householdId)
  );
}

// ---------- Doel-bijdragen ----------

export async function voegDoelBijdrageToe(data: {
  doel_id: string;
  bedrag: number;
  datum: string;
  notitie: string | null;
  aftrekken_van_inkomen: boolean;
}) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon doel-bijdrage niet toevoegen", { data }, () =>
    supabase.from("doel_bijdragen").insert({ ...data, household_id: context.householdId })
  );
}

// ---------- Inkomen ----------

export async function voegInkomenToe(
  data: { bron: InkomenBron; label: string; bedrag: number; frequentie: InkomenFrequentie },
  maand: string
) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon inkomen niet toevoegen", { data, maand }, () =>
    supabase.from("inkomen").insert({ ...data, maand, household_id: context.householdId })
  );
}

export async function verwijderInkomen(id: string) {
  const context = await vereisHousehold();
  const supabase = maakServerClient();
  return veiligUitvoeren("DB_001", "Kon inkomen niet verwijderen", { id }, () =>
    supabase.from("inkomen").delete().eq("id", id).eq("household_id", context.householdId)
  );
}

// ---------- Maanden ----------

/**
 * Registreert een nieuwe maand — leeg, of gekopieerd van een bestaande
 * maand (alles opnieuw op onbetaald/niet-geskipt). Stuurt bewust NIET
 * zelf door: Next.js' client-side navigatie-cache bleek na een
 * redirect() vanuit een Server Action soms nog een verouderde versie
 * van de doelpagina te tonen. De aanroeper doet daarom zelf een
 * volledige page-navigatie zodra dit `gelukt: true` teruggeeft.
 */
export async function registreerNieuweMaand(
  nieuweMaand: string,
  kopieerVan: string | null
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHousehold();
  const supabase = maakServerClient();

  try {
    const { error } = kopieerVan
      ? await supabase.rpc("kopieer_maand", {
          p_household_id: context.householdId,
          p_van_maand: kopieerVan,
          p_naar_maand: nieuweMaand,
        })
      : await supabase.rpc("registreer_maand", { p_household_id: context.householdId, p_maand: nieuweMaand });

    if (error) {
      logger.error({
        code: "DB_001",
        message: "Kon nieuwe maand niet registreren",
        context: { householdId: context.householdId, nieuweMaand, kopieerVan, error: error.message },
      });
      return { gelukt: false, foutmelding: "Kon de nieuwe maand niet aanmaken." };
    }
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij registreren van nieuwe maand",
      context: { nieuweMaand, kopieerVan, error: error instanceof Error ? error.message : String(error) },
    });
    return { gelukt: false, foutmelding: "Kon de nieuwe maand niet aanmaken." };
  }

  opnieuwValideren();
  return { gelukt: true };
}
