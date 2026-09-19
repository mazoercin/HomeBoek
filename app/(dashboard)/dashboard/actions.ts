"use server";

import { revalidatePath } from "next/cache";
import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { requireSessie, requireRole } from "@/lib/auth/require-role";
import type { Categorie, InkomenBron, InkomenFrequentie } from "@/types/database";

function opnieuwValideren() {
  revalidatePath("/dashboard");
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

// ---------- Betaald-status ----------

export async function zetVasteKostBetaald(vasteKostId: string, maand: string, betaald: boolean) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon betaald-status van vaste kost niet bijwerken",
    { vasteKostId, maand },
    () => supabase.rpc("zet_vaste_kost_betaald", { p_vaste_kost_id: vasteKostId, p_maand: maand, p_betaald: betaald })
  );
}

export async function zetFactuurBetaald(factuurId: string, maand: string, betaald: boolean) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon betaald-status van factuur niet bijwerken",
    { factuurId, maand },
    () => supabase.rpc("zet_factuur_betaald", { p_factuur_id: factuurId, p_maand: maand, p_betaald: betaald })
  );
}

// ---------- Skip extra uitgave (wat-als toepassen) ----------

export async function pasWatAlsToe(extraUitgaveIds: string[], maand: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon wat-als-keuze niet opslaan", { extraUitgaveIds, maand }, async () => {
    for (const id of extraUitgaveIds) {
      const { error } = await supabase.rpc("zet_extra_uitgave_geskipt", {
        p_extra_uitgave_id: id,
        p_maand: maand,
        p_geskipt: true,
      });
      if (error) return { error };
    }
    return { error: null };
  });
}

export async function zetUitgaveNietGeskipt(extraUitgaveId: string, maand: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon skip van extra uitgave niet ongedaan maken",
    { extraUitgaveId, maand },
    () =>
      supabase.rpc("zet_extra_uitgave_geskipt", {
        p_extra_uitgave_id: extraUitgaveId,
        p_maand: maand,
        p_geskipt: false,
      })
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

export async function voegVasteKostToe(data: KostInvoer) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon vaste kost niet toevoegen", { data }, () =>
    supabase.from("vaste_kosten").insert(data)
  );
}

export async function verwijderVasteKost(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon vaste kost niet verwijderen", { id }, () =>
    supabase.from("vaste_kosten").delete().eq("id", id)
  );
}

export async function voegFactuurToe(data: KostInvoer) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon factuur niet toevoegen", { data }, () =>
    supabase.from("facturen").insert(data)
  );
}

export async function verwijderFactuur(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon factuur niet verwijderen", { id }, () =>
    supabase.from("facturen").delete().eq("id", id)
  );
}

// ---------- Extra uitgaven CRUD ----------

export async function voegExtraUitgaveToe(data: { label: string; bedrag: number; overslaanbaar: boolean }) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon extra uitgave niet toevoegen", { data }, () =>
    supabase.from("extra_uitgaven").insert(data)
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

export async function voegInkomenToe(data: {
  bron: InkomenBron;
  label: string;
  bedrag: number;
  frequentie: InkomenFrequentie;
}) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon inkomen niet toevoegen", { data }, () =>
    supabase.from("inkomen").insert(data)
  );
}

export async function verwijderInkomen(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon inkomen niet verwijderen", { id }, () =>
    supabase.from("inkomen").delete().eq("id", id)
  );
}

// ---------- Gevarenzone ----------

/**
 * Wist alle financiële data (inkomen, kosten, facturen, extra uitgaven,
 * doelen, goud) in één atomische databasetransactie. Enkel toegankelijk
 * voor de admin-rol — dit is bewust zwaarder afgeschermd dan de gewone
 * dashboard-mutaties, gezien de onomkeerbare impact.
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
