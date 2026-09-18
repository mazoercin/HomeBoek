"use server";

import { revalidatePath } from "next/cache";
import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";
import { requireSessie } from "@/lib/auth/require-role";
import type { Categorie, InkomenBron } from "@/types/database";

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
    () =>
      supabase
        .from("vaste_kosten_betaald")
        .upsert({ vaste_kost_id: vasteKostId, maand, betaald }, { onConflict: "vaste_kost_id,maand" })
  );
}

export async function zetFactuurBetaald(factuurId: string, maand: string, betaald: boolean) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon betaald-status van factuur niet bijwerken",
    { factuurId, maand },
    () =>
      supabase
        .from("facturen_betaald")
        .upsert({ factuur_id: factuurId, maand, betaald }, { onConflict: "factuur_id,maand" })
  );
}

// ---------- Skip extra uitgave (wat-als toepassen) ----------

export async function pasWatAlsToe(extraUitgaveIds: string[], maand: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon wat-als-keuze niet opslaan",
    { extraUitgaveIds, maand },
    () =>
      supabase
        .from("geskipte_uitgaven")
        .upsert(
          extraUitgaveIds.map((id) => ({ extra_uitgave_id: id, maand })),
          { onConflict: "extra_uitgave_id,maand" }
        )
  );
}

export async function zetUitgaveNietGeskipt(extraUitgaveId: string, maand: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon skip van extra uitgave niet ongedaan maken",
    { extraUitgaveId, maand },
    () =>
      supabase
        .from("geskipte_uitgaven")
        .delete()
        .eq("extra_uitgave_id", extraUitgaveId)
        .eq("maand", maand)
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

export async function verplaatsDoelPrioriteit(id: string, nieuwePrioriteit: number) {
  const supabase = maakServiceClient();
  return veiligUitvoeren(
    "DB_001",
    "Kon prioriteit van doel niet bijwerken",
    { id, nieuwePrioriteit },
    () => supabase.from("doelen").update({ prioriteit: nieuwePrioriteit }).eq("id", id)
  );
}

export async function voegGoudTransactieToe(data: { bedrag: number; datum: string; notitie: string | null }) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon goud-transactie niet toevoegen", { data }, () =>
    supabase.from("goud_transacties").insert(data)
  );
}

// ---------- Inkomen ----------

export async function voegVastInkomenToe(data: { bron: InkomenBron; label: string; bedrag: number }) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon vast inkomen niet toevoegen", { data }, () =>
    supabase.from("vast_inkomen").insert(data)
  );
}

export async function verwijderVastInkomen(id: string) {
  const supabase = maakServiceClient();
  return veiligUitvoeren("DB_001", "Kon vast inkomen niet verwijderen", { id }, () =>
    supabase.from("vast_inkomen").delete().eq("id", id)
  );
}
