"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { maakServerClient, maakServiceClient } from "@/lib/supabase/server";
import { vereisHousehold, vereisHouseholdRol } from "@/lib/auth/household";
import { maakGebruikersProfiel } from "@/lib/auth/gebruiker";
import { valideerGebruikersnaamFormaat } from "@/lib/auth/gebruikersnaam";
import { haalIpHash, magDoor, registreerPoging } from "@/lib/auth/rate-limit";
import { logger } from "@/lib/logger.server";
import type { HouseholdRol, Categorie, InkomenBron, InkomenFrequentie } from "@/types/database";

// ---------- Gezinsaccounts ----------
// De eigenaar maakt logins voor gezinsleden rechtstreeks zelf aan
// (i.p.v. een deelbare link te versturen die de ontvanger zelf moet
// registreren+bevestigen+accepteren) — het account bestaat al mét
// toegang tot dit huishouden vanaf de eerste seconde. Max. 2 extra
// leden per huishouden.

const MAX_EXTRA_LEDEN = 2;

export async function maakGezinsAccount(input: {
  gebruikersnaam: string;
  wachtwoord: string;
  rol: "editor" | "viewer";
  email: string | null;
}): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");
  const ipHash = haalIpHash();

  if (!(await magDoor("aanmaken", ipHash, context.gebruikerId))) {
    return { gelukt: false, foutmelding: "Te veel pogingen, probeer het later opnieuw." };
  }

  const gebruikersnaam = input.gebruikersnaam.trim();
  const formaatFout = valideerGebruikersnaamFormaat(gebruikersnaam);
  if (formaatFout) {
    return { gelukt: false, foutmelding: formaatFout };
  }
  if (input.wachtwoord.length < 8) {
    return { gelukt: false, foutmelding: "Wachtwoord moet minstens 8 tekens lang zijn." };
  }

  const supabase = maakServiceClient();

  const { count } = await supabase
    .from("household_members")
    .select("user_id", { count: "exact", head: true })
    .eq("household_id", context.householdId)
    .neq("role", "owner");
  if ((count ?? 0) >= MAX_EXTRA_LEDEN) {
    return { gelukt: false, foutmelding: `Je kan max. ${MAX_EXTRA_LEDEN} extra gebruikers toevoegen.` };
  }

  const { data: bestaandProfiel } = await supabase
    .from("profiles")
    .select("user_id")
    .ilike("gebruikersnaam", gebruikersnaam)
    .maybeSingle();
  if (bestaandProfiel) {
    return { gelukt: false, foutmelding: "Deze gebruikersnaam is al in gebruik." };
  }

  // Supabase Auth vereist altijd een e-mailadres — vult de eigenaar er
  // zelf geen in, dan gebruiken we een intern, nooit-getoond adres.
  // Enkel de gebruikersnaam wordt gebruikt om in te loggen.
  const email = input.email?.trim() || `${gebruikersnaam.toLowerCase()}.${randomBytes(4).toString("hex")}@leden.homeboek.intern`;

  const { data: nieuweGebruiker, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: input.wachtwoord,
    email_confirm: true,
    user_metadata: { gebruikersnaam },
  });

  await registreerPoging("aanmaken", ipHash, context.gebruikerId, !createError);

  if (createError || !nieuweGebruiker.user) {
    logger.error({
      code: "DB_001",
      message: "Kon gezinsaccount niet aanmaken",
      context: { householdId: context.householdId, error: createError?.message },
    });
    const bestaatAl = createError?.message?.toLowerCase().includes("already been registered");
    return {
      gelukt: false,
      foutmelding: bestaatAl ? "Er bestaat al een account met dit e-mailadres." : "Kon het account niet aanmaken.",
    };
  }

  const profiel = await maakGebruikersProfiel({ id: nieuweGebruiker.user.id, email, gebruikersnaam });
  if (!profiel) {
    await supabase.auth.admin.deleteUser(nieuweGebruiker.user.id);
    return { gelukt: false, foutmelding: "Account aangemaakt, maar profiel opslaan mislukte." };
  }

  const { error: lidError } = await supabase.from("household_members").insert({
    household_id: context.householdId,
    user_id: nieuweGebruiker.user.id,
    role: input.rol,
    display_name: gebruikersnaam,
    invited_by: context.gebruikerId,
  });
  if (lidError) {
    await supabase.auth.admin.deleteUser(nieuweGebruiker.user.id);
    logger.error({
      code: "DB_001",
      message: "Kon nieuw lid niet aan huishouden koppelen",
      context: { householdId: context.householdId, error: lidError.message },
    });
    return { gelukt: false, foutmelding: "Kon dit account niet aan het huishouden koppelen." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true };
}

/** Enkel voor een account dat al bij je eigen huishouden hoort — de eigenaar kan zo op elk moment het wachtwoord van een gezinslid resetten. */
export async function resetLidWachtwoord(
  userId: string,
  nieuwWachtwoord: string
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");

  if (nieuwWachtwoord.length < 8) {
    return { gelukt: false, foutmelding: "Wachtwoord moet minstens 8 tekens lang zijn." };
  }

  const ipHash = haalIpHash();
  if (!(await magDoor("aanmaken", ipHash, context.gebruikerId))) {
    return { gelukt: false, foutmelding: "Te veel pogingen, probeer het later opnieuw." };
  }

  const supabase = maakServiceClient();

  const { data: lid } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", context.householdId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!lid) {
    return { gelukt: false, foutmelding: "Dit account hoort niet bij jouw huishouden." };
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password: nieuwWachtwoord });
  await registreerPoging("aanmaken", ipHash, context.gebruikerId, !error);

  if (error) {
    logger.error({ code: "DB_001", message: "Kon wachtwoord niet resetten", context: { userId, error: error.message } });
    return { gelukt: false, foutmelding: "Kon het wachtwoord niet wijzigen." };
  }

  return { gelukt: true };
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
