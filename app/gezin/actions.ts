"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { maakServerClient } from "@/lib/supabase/server";
import { requireSessie } from "@/lib/auth/require-role";
import { vereisHousehold, vereisHouseholdRol } from "@/lib/auth/household";
import { genereerUitnodigingsToken, hashUitnodigingsToken } from "@/lib/auth/uitnodiging";
import { haalIpHash, magDoor, registreerPoging } from "@/lib/auth/rate-limit";
import { wisUitnodigingToken } from "@/lib/auth/uitnodiging-cookie";
import { logger } from "@/lib/logger.server";
import type { HouseholdRol } from "@/types/database";

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

/** Enkel voor een publieke, veilige weergave (naam huishouden, uitnodiger, rol) — nooit budgetdata. */
export async function bekijkUitnodiging(
  token: string
): Promise<{ geldig: boolean; householdNaam?: string; uitgenodigdDoor?: string; rol?: string; foutmelding?: string }> {
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
  return {
    geldig: true,
    householdNaam: data.household_naam ?? undefined,
    uitgenodigdDoor: data.uitgenodigd_door ?? undefined,
    rol: data.rol ?? undefined,
  };
}

export async function accepteerUitnodiging(
  token: string
): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const sessie = requireSessie();
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
