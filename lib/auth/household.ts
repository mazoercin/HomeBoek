import { redirect } from "next/navigation";
import { maakServerClient } from "@/lib/supabase/server";
import { requireSessie } from "@/lib/auth/require-role";
import { haalUitnodigingToken } from "@/lib/auth/uitnodiging-cookie";
import { logger } from "@/lib/logger.server";
import type { HouseholdRol } from "@/types/database";

export interface HouseholdContext {
  gebruikerId: string;
  gebruikersnaam: string;
  householdId: string;
  householdNaam: string;
  currency: string;
  rol: HouseholdRol;
}

/**
 * Vereist een geldige sessie ÉN lidmaatschap van een huishouden — de
 * vervanger van de vroegere globale requireRole("admin"). Rechten
 * worden hier altijd LIVE uit household_members gehaald (nooit uit de
 * sessie-cookie of een JWT-claim), zodat een rolwijziging door de
 * eigenaar onmiddellijk van kracht is.
 *
 * v1 toont in de UI precies één huishouden per gebruiker (het schema
 * ondersteunt er meerdere, maar er is nog geen wisselaar) — we nemen
 * dus gewoon het eerst-gevonden lidmaatschap.
 *
 * Heeft de gebruiker nog geen enkel huishouden (net geregistreerd
 * zonder uitnodiging), dan sturen we door naar de onboardingpagina.
 */
export async function vereisHousehold(): Promise<HouseholdContext> {
  const sessie = requireSessie();
  const supabase = maakServerClient();

  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, role, households(name, currency)")
    .eq("user_id", sessie.gebruikerId)
    .order("joined_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({
      code: "DB_001",
      message: "Kon huishouden-lidmaatschap niet ophalen",
      context: { gebruikerId: sessie.gebruikerId, error: error.message },
    });
    redirect("/gezin/starten");
  }

  if (!data) {
    // Kwam de gebruiker net via een uitnodigingslink en registreerde die
    // zich onderweg? Dan wacht er een bewaarde token — rond dat eerst af
    // i.p.v. de "nieuw huishouden starten"-stap te tonen.
    redirect(haalUitnodigingToken() ? "/uitnodiging" : "/gezin/starten");
  }

  const household = Array.isArray(data.households) ? data.households[0] : data.households;

  return {
    gebruikerId: sessie.gebruikerId,
    gebruikersnaam: sessie.gebruikersnaam,
    householdId: data.household_id,
    householdNaam: household?.name ?? "Ons gezin",
    currency: household?.currency ?? "EUR",
    rol: data.role as HouseholdRol,
  };
}

/** Zoals vereisHousehold, maar stuurt door naar /geen-toegang als de rol niet volstaat. */
export async function vereisHouseholdRol(minimaal: HouseholdRol): Promise<HouseholdContext> {
  const context = await vereisHousehold();
  const volgorde: HouseholdRol[] = ["viewer", "editor", "owner"];
  if (volgorde.indexOf(context.rol) < volgorde.indexOf(minimaal)) {
    logger.warn({
      code: "AUTH_002",
      message: "Poging tot toegang zonder juiste huishouden-rol",
      context: { gebruikerId: context.gebruikerId, vereist: minimaal, huidig: context.rol },
    });
    redirect("/geen-toegang");
  }
  return context;
}
