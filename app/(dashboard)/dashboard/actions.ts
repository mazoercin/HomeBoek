"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { requireSessie, requireRole } from "@/lib/auth/require-role";
import type { Categorie, InkomenBron, InkomenFrequentie } from "@/types/database";

function opnieuwValideren() {
  revalidatePath("/dashboard/[maand]", "page");
  revalidatePath("/overzicht");
}

async function veiligUitvoeren(
  code: string,
  bericht: string,
  context: Record<string, unknown>,
  actie: () => PromiseLike<{ error: { message: string } | null }>
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  requireSessie();
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

// ---------- Betaald/geskipt-status (nu gewoon een kolom op de rij zelf) ----------

export async function zetVasteKostBetaald(id: string, betaald: boolean) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon betaald-status van vaste kost niet bijwerken", { id, betaald }, () =>
    supabase.from("vaste_kosten").update({ betaald }).eq("id", id)
  );
}

export async function zetFactuurBetaald(id: string, betaald: boolean) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon betaald-status van factuur niet bijwerken", { id, betaald }, () =>
    supabase.from("facturen").update({ betaald }).eq("id", id)
  );
}

export async function zetExtraUitgaveGeskipt(id: string, geskipt: boolean) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon skip-status van extra uitgave niet bijwerken", { id, geskipt }, () =>
    supabase.from("extra_uitgaven").update({ geskipt }).eq("id", id)
  );
}

/** "Wat als?"-toepassen: meerdere extra uitgaven in één keer op geskipt zetten. */
export async function pasWatAlsToe(extraUitgaveIds: string[]) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon wat-als-keuze niet opslaan", { extraUitgaveIds }, () =>
    supabase.from("extra_uitgaven").update({ geskipt: true }).in("id", extraUitgaveIds)
  );
}

// ---------- Vaste kosten / facturen CRUD ----------

interface KostInvoer {
  label: string;
  bedrag: number;
  categorie: Categorie;
  icoon: string;
  vervaldag: number | null;
  eind_datum: string | null;
}

export async function voegVasteKostToe(data: KostInvoer, maand: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon vaste kost niet toevoegen", { data, maand }, () =>
    supabase.from("vaste_kosten").insert({ ...data, maand })
  );
}

export async function verwijderVasteKost(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon vaste kost niet verwijderen", { id }, () =>
    supabase.from("vaste_kosten").delete().eq("id", id)
  );
}

export async function voegFactuurToe(data: KostInvoer, maand: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon factuur niet toevoegen", { data, maand }, () =>
    supabase.from("facturen").insert({ ...data, maand })
  );
}

export async function verwijderFactuur(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon factuur niet verwijderen", { id }, () =>
    supabase.from("facturen").delete().eq("id", id)
  );
}

// ---------- Extra uitgaven CRUD ----------

export async function voegExtraUitgaveToe(
  data: { label: string; bedrag: number; overslaanbaar: boolean },
  maand: string
) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon extra uitgave niet toevoegen", { data, maand }, () =>
    supabase.from("extra_uitgaven").insert({ ...data, maand })
  );
}

export async function verwijderExtraUitgave(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon extra uitgave niet verwijderen", { id }, () =>
    supabase.from("extra_uitgaven").delete().eq("id", id)
  );
}

// ---------- Doelen ----------

export async function voegDoelToe(data: {
  naam: string;
  target_bedrag: number;
  maandelijks_bedrag: number;
  prioriteit: number;
}) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon doel niet toevoegen", { data }, () =>
    supabase.from("doelen").insert(data)
  );
}

export async function verwijderDoel(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon doel niet verwijderen", { id }, () =>
    supabase.from("doelen").delete().eq("id", id)
  );
}

export async function zetDoelGepauzeerd(id: string, gepauzeerd: boolean) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon doel niet pauzeren/hervatten", { id, gepauzeerd }, () =>
    supabase.from("doelen").update({ gepauzeerd }).eq("id", id)
  );
}

/** Herschrijft de prioriteit van alle doelen in één keer op basis van hun nieuwe volgorde (sleep-en-neerzet). */
export async function herschikDoelen(doelIdsInNieuweVolgorde: string[]) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon doelen niet herschikken",
    { doelIdsInNieuweVolgorde },
    () => supabase.rpc("herschik_doelen", { p_doel_ids: doelIdsInNieuweVolgorde })
  );
}

// ---------- Investeringen ----------

export async function voegInvesteringToe(naam: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon investering niet toevoegen", { naam }, () =>
    supabase.from("investeringen").insert({ naam })
  );
}

export async function voegInvesteringTransactieToe(data: {
  investering_id: string;
  bedrag: number;
  datum: string;
  notitie: string | null;
}) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon investering-transactie niet toevoegen", { data }, () =>
    supabase.from("investering_transacties").insert(data)
  );
}

export async function hernoemInvestering(id: string, naam: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon investering niet hernoemen", { id, naam }, () =>
    supabase.from("investeringen").update({ naam }).eq("id", id)
  );
}

export async function verwijderInvestering(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon investering niet verwijderen", { id }, () =>
    supabase.from("investeringen").delete().eq("id", id)
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
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon doel-bijdrage niet toevoegen", { data }, () =>
    supabase.from("doel_bijdragen").insert(data)
  );
}

// ---------- Inkomen ----------

export async function voegInkomenToe(
  data: { bron: InkomenBron; label: string; bedrag: number; frequentie: InkomenFrequentie },
  maand: string
) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon inkomen niet toevoegen", { data, maand }, () =>
    supabase.from("inkomen").insert({ ...data, maand })
  );
}

export async function verwijderInkomen(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon inkomen niet verwijderen", { id }, () =>
    supabase.from("inkomen").delete().eq("id", id)
  );
}

// ---------- Maanden ----------

/**
 * Registreert een nieuwe maand — leeg, of gekopieerd van een bestaande
 * maand (alles opnieuw op onbetaald/niet-geskipt) — en stuurt meteen
 * door naar het dashboard van die nieuwe maand.
 */
export async function registreerNieuweMaand(nieuweMaand: string, kopieerVan: string | null) {
  requireSessie();
  const supabase = maakServiceClient();

  try {
    const { error } = kopieerVan
      ? await supabase.rpc("kopieer_maand", { p_van_maand: kopieerVan, p_naar_maand: nieuweMaand })
      : await supabase.rpc("registreer_maand", { p_maand: nieuweMaand });

    if (error) {
      logger.error({
        code: "DB_001",
        message: "Kon nieuwe maand niet registreren",
        context: { nieuweMaand, kopieerVan, error: error.message },
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
  redirect(`/dashboard/${nieuweMaand}`);
}

// ---------- Gevarenzone ----------

/**
 * Wist alle financiële data (inkomen, kosten, facturen, extra uitgaven,
 * doelen, investeringen, geregistreerde maanden) in één atomische
 * databasetransactie. Enkel toegankelijk voor de admin-rol — dit is
 * bewust zwaarder afgeschermd dan de gewone dashboard-mutaties, gezien
 * de onomkeerbare impact.
 */
export async function wisAlleData(): Promise<{ gelukt: boolean; foutmelding?: string }> {
  requireRole("admin");
  const supabase = maakServiceClient();

  try {
    const { error } = await supabase.rpc("wis_alle_data");
    if (error) {
      logger.error({
        code: "DB_001",
        message: "Kon alle data niet wissen",
        context: { query: "wis_alle_data", error: error.message },
      });
      return { gelukt: false, foutmelding: "Kon de data niet wissen, probeer opnieuw." };
    }
    opnieuwValideren();
    return { gelukt: true };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Onverwachte fout bij wissen van alle data",
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return { gelukt: false, foutmelding: "Kon de data niet wissen, probeer opnieuw." };
  }
}
