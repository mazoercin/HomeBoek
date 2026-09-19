"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { maakServerClient } from "@/lib/supabase/server";
import { requireSessie } from "@/lib/auth/require-role";
import { haalSessie } from "@/lib/auth/session";
import { vereisHousehold, vereisHouseholdRol } from "@/lib/auth/household";
import { genereerUitnodigingsToken, hashUitnodigingsToken } from "@/lib/auth/uitnodiging";
import { haalIpHash, magDoor, registreerPoging } from "@/lib/auth/rate-limit";
import { wisUitnodigingToken } from "@/lib/auth/uitnodiging-cookie";
import { logger } from "@/lib/logger.server";
import type { HouseholdRol, Categorie, InkomenBron, InkomenFrequentie } from "@/types/database";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://home-boek.vercel.app";
}

// ---------- Uitnodigingen ----------

export async function maakUitnodiging(input: {
  rol: "editor" | "viewer";
  email: string | null;
  geldigheidUren: number;
  maxGebruik: number;
}): Promise<{ gelukt: boolean; foutmelding?: string; link?: string }> {
  const context = await vereisHouseholdRol("owner");
  const ipHash = haalIpHash();

  if (!(await magDoor("aanmaken", ipHash, context.gebruikerId))) {
    return { gelukt: false, foutmelding: "Te veel pogingen, probeer het later opnieuw." };
  }

  const token = genereerUitnodigingsToken();
  const tokenHash = hashUitnodigingsToken(token);
  const supabase = maakServerClient();

  const { error } = await supabase.from("household_invites").insert({
    household_id: context.householdId,
    token_hash: tokenHash,
    role: input.rol,
    email: input.email,
    created_by: context.gebruikerId,
    expires_at: new Date(Date.now() + input.geldigheidUren * 60 * 60 * 1000).toISOString(),
    max_uses: input.maxGebruik,
  });

  await registreerPoging("aanmaken", ipHash, context.gebruikerId, !error);

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon uitnodiging niet aanmaken",
      context: { householdId: context.householdId, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon de uitnodiging niet aanmaken." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true, link: `${siteUrl()}/uitnodiging#${token}` };
}

export async function trekUitnodigingIn(id: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");
  const supabase = maakServerClient();

  const { error } = await supabase
    .from("household_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("household_id", context.householdId);

  if (error) {
    logger.error({ code: "DB_001", message: "Kon uitnodiging niet intrekken", context: { id, error: error.message } });
    return { gelukt: false, foutmelding: "Kon de uitnodiging niet intrekken." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true };
}

const FOUT_TEKSTEN: Record<string, string> = {
  ongeldig: "Deze link is ongeldig.",
  ingetrokken: "Deze uitnodiging is ingetrokken.",
  verlopen: "Deze uitnodiging is verlopen.",
  opgebruikt: "Deze uitnodiging is al gebruikt.",
  email_niet_bevestigd: "Bevestig eerst je e-mailadres voor je deze uitnodiging aanvaardt.",
  ander_emailadres: "Deze uitnodiging is voor een ander e-mailadres.",
  al_lid: "Je bent al lid van dit gezin.",
  niet_ingelogd: "Log eerst in.",
};

interface UitnodigingLookup {
  household_naam: string | null;
  uitgenodigd_door: string | null;
  rol: string | null;
  geldig: boolean;
  reden: string | null;
}

/**
 * Enkel voor een publieke, veilige weergave (naam huishouden, uitnodiger, rol) — nooit budgetdata.
 *
 * Is de bezoeker al ingelogd én al lid van een ánder huishouden (bv. het
 * eigen huishouden dat automatisch werd aangemaakt bij registratie), dan
 * geven we ook diens huidige huishoudnaam mee — zodat het uitnodigings-
 * scherm expliciet kan waarschuwen dat toetreden hun huidige dashboard
 * vervangt, in plaats van dat dat stilzwijgend gebeurt.
 */
export async function bekijkUitnodiging(
  token: string
): Promise<{
  geldig: boolean;
  householdNaam?: string;
  uitgenodigdDoor?: string;
  rol?: string;
  foutmelding?: string;
  huidigHouseholdNaam?: string;
}> {
  const tokenHash = hashUitnodigingsToken(token);
  const supabase = maakServerClient();
  const { data, error } = await supabase
    .rpc("find_invite_by_token", { p_token_hash: tokenHash })
    .single<UitnodigingLookup>();

  if (error || !data) {
    return { geldig: false, foutmelding: "Deze link is ongeldig." };
  }
  if (!data.geldig) {
    return { geldig: false, foutmelding: FOUT_TEKSTEN[data.reden ?? ""] ?? "Deze link is niet meer geldig." };
  }

  let huidigHouseholdNaam: string | undefined;
  const sessie = haalSessie();
  if (sessie) {
    const { data: eigenLid } = await supabase
      .from("household_members")
      .select("households(name)")
      .eq("user_id", sessie.gebruikerId)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const eigenHousehold = eigenLid
      ? Array.isArray(eigenLid.households)
        ? eigenLid.households[0]
        : eigenLid.households
      : null;
    if (eigenHousehold?.name && eigenHousehold.name !== data.household_naam) {
      huidigHouseholdNaam = eigenHousehold.name;
    }
  }

  return {
    geldig: true,
    householdNaam: data.household_naam ?? undefined,
    uitgenodigdDoor: data.uitgenodigd_door ?? undefined,
    rol: data.rol ?? undefined,
    huidigHouseholdNaam,
  };
}

export async function accepteerUitnodiging(
  token: string
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const sessie = await requireSessie();
  const ipHash = haalIpHash();

  if (!(await magDoor("accept", ipHash, sessie.gebruikerId))) {
    return { gelukt: false, foutmelding: "Te veel pogingen, probeer het later opnieuw." };
  }

  const tokenHash = hashUitnodigingsToken(token);
  const supabase = maakServerClient();
  const { data, error } = await supabase
    .rpc("accept_invite", { p_token_hash: tokenHash })
    .single<{ household_id: string | null; ok: boolean; reden: string | null }>();

  await registreerPoging("accept", ipHash, sessie.gebruikerId, !error && !!data?.ok);

  if (error || !data) {
    logger.error({
      code: "DB_001",
      message: "Kon uitnodiging niet accepteren",
      context: { gebruikerId: sessie.gebruikerId, error: error?.message },
    });
    return { gelukt: false, foutmelding: "Er ging iets mis." };
  }
  if (!data.ok) {
    return { gelukt: false, foutmelding: FOUT_TEKSTEN[data.reden ?? ""] ?? "Kon de uitnodiging niet verwerken." };
  }

  wisUitnodigingToken();
  revalidatePath("/dashboard/[maand]", "page");
  redirect("/dashboard");
}

// ---------- Ledenbeheer ----------

export async function wijzigLidRol(userId: string, rol: HouseholdRol): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");
  if (rol === "owner") {
    return { gelukt: false, foutmelding: "Gebruik 'Eigenaarschap overdragen' om dit te wijzigen." };
  }

  const supabase = maakServerClient();
  const { error } = await supabase
    .from("household_members")
    .update({ role: rol })
    .eq("household_id", context.householdId)
    .eq("user_id", userId);

  if (error) {
    logger.error({ code: "DB_001", message: "Kon rol niet wijzigen", context: { userId, rol, error: error.message } });
    return { gelukt: false, foutmelding: "Kon de rol niet wijzigen." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true };
}

export async function verwijderLid(userId: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");
  const supabase = maakServerClient();

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", context.householdId)
    .eq("user_id", userId);

  if (error) {
    logger.error({ code: "DB_001", message: "Kon lid niet verwijderen", context: { userId, error: error.message } });
    return { gelukt: false, foutmelding: "Kon dit lid niet verwijderen." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true };
}

export async function verlaatHousehold(): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHousehold();
  const supabase = maakServerClient();

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", context.householdId)
    .eq("user_id", context.gebruikerId);

  if (error) {
    return {
      gelukt: false,
      foutmelding: "Kon het gezin niet verlaten. Ben je de enige eigenaar? Draag eerst over, of verwijder het gezin.",
    };
  }

  redirect("/gezin/starten");
}

export async function draagEigenaarschapOver(nieuweOwnerId: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");
  const supabase = maakServerClient();

  const { error } = await supabase.rpc("transfer_household_ownership", {
    p_household_id: context.householdId,
    p_nieuwe_owner_id: nieuweOwnerId,
  });

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon eigenaarschap niet overdragen",
      context: { nieuweOwnerId, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon het eigenaarschap niet overdragen." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true };
}

export async function zetHouseholdInstellingen(naam: string, currency: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");
  const naamGetrimd = naam.trim();
  if (!naamGetrimd) return { gelukt: false, foutmelding: "Vul een naam in." };

  const supabase = maakServerClient();
  const { error } = await supabase
    .from("households")
    .update({ name: naamGetrimd, currency })
    .eq("id", context.householdId);

  if (error) {
    logger.error({ code: "DB_001", message: "Kon huishoudinstellingen niet opslaan", context: { error: error.message } });
    return { gelukt: false, foutmelding: "Kon niet opslaan." };
  }

  revalidatePath("/instellingen");
  revalidatePath("/dashboard/[maand]", "page");
  return { gelukt: true };
}

/** Wist alle budgetdata van dit huishouden (niet de leden zelf). Enkel de eigenaar. */
export async function wisHouseholdData(): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");
  const supabase = maakServerClient();

  const { error } = await supabase.rpc("wis_household_data", { p_household_id: context.householdId });

  if (error) {
    logger.error({ code: "DB_001", message: "Kon huishouddata niet wissen", context: { error: error.message } });
    return { gelukt: false, foutmelding: "Kon de data niet wissen, probeer opnieuw." };
  }

  revalidatePath("/dashboard/[maand]", "page");
  revalidatePath("/overzicht");
  return { gelukt: true };
}

// ---------- Gast-data importeren ----------

export interface GastImportPayload {
  maanden: Record<
    string,
    {
      inkomen: { bron: InkomenBron; label: string; bedrag: number; frequentie: InkomenFrequentie }[];
      vasteKosten: {
        label: string;
        bedrag: number;
        categorie: Categorie;
        icoon: string;
        vervaldag: number | null;
        eind_datum: string | null;
        betaald: boolean;
      }[];
      facturen: {
        label: string;
        bedrag: number;
        categorie: Categorie;
        icoon: string;
        vervaldag: number | null;
        eind_datum: string | null;
        betaald: boolean;
      }[];
      extraUitgaven: { label: string; bedrag: number; overslaanbaar: boolean; geskipt: boolean }[];
    }
  >;
  doelen: { id: string; naam: string; target_bedrag: number; maandelijks_bedrag: number; prioriteit: number; gepauzeerd: boolean }[];
  doelBijdragen: { doel_id: string; bedrag: number; datum: string; notitie: string | null; aftrekken_van_inkomen: boolean }[];
  investeringen: { id: string; naam: string }[];
  investeringTransacties: { investering_id: string; bedrag: number; datum: string; notitie: string | null }[];
}

/**
 * Zet gast-data (lokaal in de browser opgebouwd, zonder account) om naar
 * échte rijen in het zonet aangemaakte huishouden van de nieuwe eigenaar.
 * Doelen/investeringen krijgen hier een nieuw, database-gegenereerd id —
 * hun oude (client-side) id diende enkel om doel_bijdragen/investering_
 * transacties aan het juiste doel/investering te blijven koppelen.
 * Best-effort: mislukt dit, dan blijft het huishouden gewoon leeg (de
 * gebruiker verliest zijn account niet) — de aanroeper wist de lokale
 * gast-data pas als dit `gelukt: true` teruggeeft.
 */
export async function importeerGastData(payload: GastImportPayload): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHousehold();
  const supabase = maakServerClient();

  try {
    const maanden = Object.keys(payload.maanden);
    if (maanden.length > 0) {
      const { error } = await supabase
        .from("dashboard_maanden")
        .upsert(
          maanden.map((maand) => ({ household_id: context.householdId, maand })),
          { onConflict: "household_id,maand" }
        );
      if (error) throw error;
    }

    for (const [maand, m] of Object.entries(payload.maanden)) {
      if (m.inkomen.length > 0) {
        const { error } = await supabase
          .from("inkomen")
          .insert(m.inkomen.map((i) => ({ ...i, maand, household_id: context.householdId })));
        if (error) throw error;
      }
      if (m.vasteKosten.length > 0) {
        const { error } = await supabase
          .from("vaste_kosten")
          .insert(m.vasteKosten.map((k) => ({ ...k, maand, household_id: context.householdId })));
        if (error) throw error;
      }
      if (m.facturen.length > 0) {
        const { error } = await supabase
          .from("facturen")
          .insert(m.facturen.map((f) => ({ ...f, maand, household_id: context.householdId })));
        if (error) throw error;
      }
      if (m.extraUitgaven.length > 0) {
        const { error } = await supabase
          .from("extra_uitgaven")
          .insert(m.extraUitgaven.map((u) => ({ ...u, maand, household_id: context.householdId })));
        if (error) throw error;
      }
    }

    const doelIdMap = new Map<string, string>();
    for (const doel of payload.doelen) {
      const { data, error } = await supabase
        .from("doelen")
        .insert({
          naam: doel.naam,
          target_bedrag: doel.target_bedrag,
          maandelijks_bedrag: doel.maandelijks_bedrag,
          prioriteit: doel.prioriteit,
          gepauzeerd: doel.gepauzeerd,
          household_id: context.householdId,
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Geen id teruggekregen bij het aanmaken van een doel.");
      doelIdMap.set(doel.id, data.id as string);
    }
    for (const bijdrage of payload.doelBijdragen) {
      const nieuwDoelId = doelIdMap.get(bijdrage.doel_id);
      if (!nieuwDoelId) continue;
      const { error } = await supabase.from("doel_bijdragen").insert({
        doel_id: nieuwDoelId,
        bedrag: bijdrage.bedrag,
        datum: bijdrage.datum,
        notitie: bijdrage.notitie,
        aftrekken_van_inkomen: bijdrage.aftrekken_van_inkomen,
        household_id: context.householdId,
      });
      if (error) throw error;
    }

    const investeringIdMap = new Map<string, string>();
    for (const investering of payload.investeringen) {
      const { data, error } = await supabase
        .from("investeringen")
        .insert({ naam: investering.naam, household_id: context.householdId })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Geen id teruggekregen bij het aanmaken van een investering.");
      investeringIdMap.set(investering.id, data.id as string);
    }
    for (const transactie of payload.investeringTransacties) {
      const nieuwInvesteringId = investeringIdMap.get(transactie.investering_id);
      if (!nieuwInvesteringId) continue;
      const { error } = await supabase.from("investering_transacties").insert({
        investering_id: nieuwInvesteringId,
        bedrag: transactie.bedrag,
        datum: transactie.datum,
        notitie: transactie.notitie,
        household_id: context.householdId,
      });
      if (error) throw error;
    }

    revalidatePath("/dashboard/[maand]", "page");
    return { gelukt: true };
  } catch (error) {
    logger.error({
      code: "DB_001",
      message: "Kon gast-data niet importeren naar nieuw huishouden",
      context: { householdId: context.householdId, error: error instanceof Error ? error.message : String(error) },
    });
    return { gelukt: false, foutmelding: "Kon je gegevens niet overzetten." };
  }
}
