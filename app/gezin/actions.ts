"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { maakServerClient, maakServiceClient } from "@/lib/supabase/server";
import { vereisHousehold, vereisHouseholdRol } from "@/lib/auth/household";
import { requireSessie } from "@/lib/auth/require-role";
import { maakGebruikersProfiel, haalGebruikersProfiel } from "@/lib/auth/gebruiker";
import { valideerGebruikersnaamFormaat } from "@/lib/auth/gebruikersnaam";
import { maakNepEmail } from "@/lib/auth/nep-email";
import { haalIpHash, magDoor, registreerPoging } from "@/lib/auth/rate-limit";
import { haalSiteUrl } from "@/lib/auth/site-url";
import { verwijderSessieCookie } from "@/lib/auth/session";
import { bepaalVerwijderScope } from "@/lib/auth/account-verwijderen";
import { isAdminEmail } from "@/lib/auth/admin";
import { bouwHuisbalansExport, exportBestandsnaam } from "@/lib/export/huisbalans-export";
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
  const email = input.email?.trim() || maakNepEmail(gebruikersnaam);

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
      context: { gebruikersnaam: context.gebruikersnaam, householdId: context.householdId, error: createError?.message },
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
      context: { gebruikersnaam: context.gebruikersnaam, householdId: context.householdId, error: lidError.message },
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
    logger.error({
      code: "DB_001",
      message: "Kon wachtwoord niet resetten",
      context: { gebruikersnaam: context.gebruikersnaam, userId, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon het wachtwoord niet wijzigen." };
  }

  return { gelukt: true };
}

/**
 * Voegt een echt herstel-e-mailadres toe (of wijzigt een bestaand
 * adres) voor de EIGEN account van de eigenaar — niet voor gezinsleden.
 * Gebruikt bewust de gewone, sessie-gebonden client: updateUser() werkt
 * altijd op de ingelogde gebruiker zelf, nooit op een willekeurig
 * user-id. Het nieuwe adres wordt pas echt gebruikt (profiles.email
 * gelijkgetrokken) nadat de bevestigingsmail gevolgd is — zie
 * app/auth/callback/route.ts.
 */
export async function zetEigenEmail(nieuweEmail: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");

  const email = nieuweEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { gelukt: false, foutmelding: "Vul een geldig e-mailadres in." };
  }

  const siteUrl = haalSiteUrl();
  if (!siteUrl) {
    return { gelukt: false, foutmelding: "Kon geen bevestigingslink opbouwen. Probeer het later opnieuw." };
  }

  const supabase = maakServerClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/instellingen")}` }
  );

  if (error) {
    logger.error({
      code: "AUTH_001",
      message: "Kon e-mailadres niet wijzigen",
      context: { gebruikersnaam: context.gebruikersnaam, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon het e-mailadres niet wijzigen." };
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
    logger.error({
      code: "DB_001",
      message: "Kon rol niet wijzigen",
      context: { gebruikersnaam: context.gebruikersnaam, userId, rol, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon de rol niet wijzigen." };
  }

  revalidatePath("/instellingen");
  return { gelukt: true };
}

/**
 * De eigenaar verwijdert een gezinslid — inclusief hun account (ze
 * kunnen daarna niet meer inloggen). Hun al ingevoerde gegevens
 * (inkomen, kosten, ...) blijven gewoon in het huishouden staan, want
 * die horen bij het huishouden, niet bij het account. `household_members`
 * cascadet automatisch mee zodra het account weg is (on delete cascade
 * op user_id) — geen aparte delete nodig.
 */
export async function verwijderLid(userId: string): Promise<{ gelukt: boolean; foutmelding?: string }> {
  const context = await vereisHouseholdRol("owner");

  if (userId === context.gebruikerId) {
    return { gelukt: false, foutmelding: "Gebruik 'Account verwijderen' in Jouw gegevens om je eigen account te verwijderen." };
  }

  const supabase = maakServerClient();
  const { data: lid } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", context.householdId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!lid) {
    return { gelukt: false, foutmelding: "Dit account hoort niet bij jouw huishouden." };
  }

  const doelProfiel = await haalGebruikersProfiel(userId);
  if (isAdminEmail(doelProfiel?.email)) {
    return { gelukt: false, foutmelding: "Dit account kan niet verwijderd worden." };
  }

  const serviceClient = maakServiceClient();
  const { error } = await serviceClient.auth.admin.deleteUser(userId);

  if (error) {
    logger.error({
      code: "AUTH_001",
      message: "Kon lid niet verwijderen",
      context: { gebruikersnaam: context.gebruikersnaam, error: error.message },
    });
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
      context: { gebruikersnaam: context.gebruikersnaam, nieuweOwnerId, error: error.message },
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
    logger.error({
      code: "DB_001",
      message: "Kon huishoudinstellingen niet opslaan",
      context: { gebruikersnaam: context.gebruikersnaam, error: error.message },
    });
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
    logger.error({
      code: "DB_001",
      message: "Kon huishouddata niet wissen",
      context: { gebruikersnaam: context.gebruikersnaam, error: error.message },
    });
    return { gelukt: false, foutmelding: "Kon de data niet wissen, probeer opnieuw." };
  }

  revalidatePath("/dashboard/[maand]", "page");
  revalidatePath("/overzicht");
  return { gelukt: true };
}

// ---------- Jouw gegevens: downloaden en account verwijderen ----------

export interface DownloadResultaat {
  gelukt: boolean;
  bestand?: string;
  bestandsnaam?: string;
  foutmelding?: string;
}

/**
 * "Download mijn gegevens": bewust de gewone sessie-client (RLS bepaalt
 * de rijen), met expliciete kolomkeuze per tabel — nooit `household_id`/
 * `created_by`/`updated_by`/`version` (interne kolommen) en nooit
 * `email` voor een ANDER profiel dan het eigen (RLS filtert enkel
 * rijen, niet kolommen — een gezinslid mag via profiles_select_huisgenoten
 * de volledige profielrij van elk ander lid lezen, dus dat moet hier
 * expliciet vermeden worden, niet aan RLS overgelaten).
 */
export async function downloadMijnGegevens(): Promise<DownloadResultaat> {
  const context = await vereisHousehold();
  const ipHash = haalIpHash();

  if (!(await magDoor("export", ipHash, context.gebruikerId))) {
    return { gelukt: false, foutmelding: "Te veel pogingen, probeer het later opnieuw." };
  }

  const supabase = maakServerClient();

  const [
    huishoudenRes,
    profielRes,
    ledenRes,
    inkomenRes,
    weekBedragenRes,
    extraInkomenRes,
    vasteKostenRes,
    facturenRes,
    extraUitgavenRes,
    doelenRes,
    doelBijdragenRes,
    investeringenRes,
    investeringTransactiesRes,
    maandenRes,
  ] = await Promise.all([
    supabase.from("households").select("name, currency").eq("id", context.householdId).single(),
    supabase.from("profiles").select("gebruikersnaam, email, created_at").eq("user_id", context.gebruikerId).single(),
    supabase.from("household_members").select("user_id, role, joined_at").eq("household_id", context.householdId),
    supabase
      .from("inkomen")
      .select("id, bron, label, bedrag, frequentie, maand, created_at, updated_at")
      .eq("household_id", context.householdId),
    supabase
      .from("inkomen_weekbedragen")
      .select("id, inkomen_id, week_nummer, bedrag, created_at, updated_at")
      .eq("household_id", context.householdId),
    supabase.from("extra_inkomen").select("id, label, bedrag, maand, created_at, updated_at").eq("household_id", context.householdId),
    supabase
      .from("vaste_kosten")
      .select("id, label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald, created_at, updated_at")
      .eq("household_id", context.householdId),
    supabase
      .from("facturen")
      .select("id, label, bedrag, categorie, icoon, vervaldag, eind_datum, maand, betaald, created_at, updated_at")
      .eq("household_id", context.householdId),
    supabase
      .from("extra_uitgaven")
      .select("id, label, bedrag, overslaanbaar, maand, geskipt, created_at, updated_at")
      .eq("household_id", context.householdId),
    supabase
      .from("doelen")
      .select("id, naam, target_bedrag, maandelijks_bedrag, prioriteit, gepauzeerd, created_at, updated_at")
      .eq("household_id", context.householdId),
    supabase
      .from("doel_bijdragen")
      .select("id, doel_id, bedrag, datum, notitie, aftrekken_van_inkomen, created_at")
      .eq("household_id", context.householdId),
    supabase.from("investeringen").select("id, naam, created_at").eq("household_id", context.householdId),
    supabase
      .from("investering_transacties")
      .select("id, investering_id, bedrag, datum, notitie, created_at")
      .eq("household_id", context.householdId),
    supabase.from("dashboard_maanden").select("maand, created_at").eq("household_id", context.householdId),
  ]);

  if (!huishoudenRes.data || !profielRes.data) {
    logger.error({
      code: "DB_001",
      message: "Kon basisgegevens voor export niet ophalen",
      context: { gebruikersnaam: context.gebruikersnaam, error: huishoudenRes.error?.message ?? profielRes.error?.message },
    });
    return { gelukt: false, foutmelding: "Kon je gegevens niet ophalen. Probeer opnieuw." };
  }

  // Gebruikersnamen van de rest van het gezin — enkel deze ene kolom,
  // nooit hun e-mailadres, in een eigen, aparte query.
  const ledenIds = (ledenRes.data ?? []).map((lid) => lid.user_id as string).filter((id) => id !== context.gebruikerId);
  const { data: ledenProfielen } =
    ledenIds.length > 0
      ? await supabase.from("profiles").select("user_id, gebruikersnaam").in("user_id", ledenIds)
      : { data: [] as { user_id: string; gebruikersnaam: string }[] };
  const gebruikersnaamPerId = new Map((ledenProfielen ?? []).map((p) => [p.user_id, p.gebruikersnaam]));

  const gezinsleden = (ledenRes.data ?? [])
    .filter((lid) => lid.user_id !== context.gebruikerId)
    .map((lid) => ({
      gebruikersnaam: gebruikersnaamPerId.get(lid.user_id as string) ?? "Onbekend",
      rol: lid.role as HouseholdRol,
      lid_sinds: lid.joined_at as string,
    }));

  const exportData = bouwHuisbalansExport({
    huishouden: { naam: huishoudenRes.data.name, valuta: huishoudenRes.data.currency },
    profiel: {
      gebruikersnaam: profielRes.data.gebruikersnaam,
      email: profielRes.data.email,
      lid_sinds: profielRes.data.created_at,
    },
    gezinsleden,
    inkomen: inkomenRes.data ?? [],
    inkomen_weekbedragen: weekBedragenRes.data ?? [],
    extra_inkomen: extraInkomenRes.data ?? [],
    vaste_kosten: vasteKostenRes.data ?? [],
    facturen: facturenRes.data ?? [],
    extra_uitgaven: extraUitgavenRes.data ?? [],
    doelen: doelenRes.data ?? [],
    doel_bijdragen: doelBijdragenRes.data ?? [],
    investeringen: investeringenRes.data ?? [],
    investering_transacties: investeringTransactiesRes.data ?? [],
    dashboard_maanden: maandenRes.data ?? [],
  });

  await registreerPoging("export", ipHash, context.gebruikerId, true);

  return { gelukt: true, bestand: JSON.stringify(exportData, null, 2), bestandsnaam: exportBestandsnaam() };
}

export interface VerwijderAccountResultaat {
  gelukt: boolean;
  foutmelding?: string;
}

/**
 * Verwijdert het eigen account (service-client — enkel de admin-API kan
 * een auth-gebruiker verwijderen), registreert de poging voor de
 * rate-limit, en bij succes: uitloggen + doorsturen. Bij een fout
 * blijft alles zoals het was (geen sessie/cookie aangeraakt), dus een
 * herhaalde poging is altijd veilig.
 */
async function verwijderEigenAccount(
  userId: string,
  serviceClient: ReturnType<typeof maakServiceClient>,
  ipHash: string | null
): Promise<VerwijderAccountResultaat> {
  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  await registreerPoging("verwijderen", ipHash, userId, !error);

  if (error) {
    // Nooit gebruikersnaam/e-mailadres in de log — enkel de technische foutmelding.
    logger.error({ code: "AUTH_001", message: "Kon account niet volledig verwijderen", context: { error: error.message } });
    return { gelukt: false, foutmelding: "Kon je account niet volledig verwijderen. Probeer opnieuw." };
  }

  const supabase = maakServerClient();
  await supabase.auth.signOut();
  verwijderSessieCookie();
  redirect("/login?account_verwijderd=1");
}

/**
 * "Account verwijderen" — voor zowel de eigenaar als een gezinslid.
 * Wachtwoord wordt eerst opnieuw geverifieerd (signInWithPassword),
 * daarna de rate-limit gecontroleerd.
 *
 * Gebruikt bewust requireSessie() (enkel een geldige sessie, geen
 * huishouden vereist) i.p.v. vereisHousehold(): een gebruiker zonder
 * household_members-rij moet dit ook kunnen — dat is precies het
 * "wees"-herstelpad voor wanneer een eerdere poging strandde ná de
 * RPC (huishouden al weg) maar vóór de laatste stap (het eigen
 * account verwijderen).
 *
 * Eigenaar-volgorde (enkel als de gebruiker de ENIGE eigenaar is —
 * zie bepaalVerwijderScope): eerst alle gezinsleden (deleteUser), dán
 * de RPC (verwijder_household, met de sessie-client: private.is_owner
 * heeft een echte auth.uid() nodig), dán de eigenaar zelf. Zo raakt de
 * database nooit iets aan zolang er nog een gezinslid-account
 * over is dat niet verwijderd kon worden.
 */
export async function verwijderMijnAccount(wachtwoord: string): Promise<VerwijderAccountResultaat> {
  const sessie = await requireSessie();

  const profiel = await haalGebruikersProfiel(sessie.gebruikerId);
  if (!profiel) {
    return { gelukt: false, foutmelding: "Kon je account niet vinden. Probeer opnieuw in te loggen." };
  }
  if (isAdminEmail(profiel.email)) {
    return { gelukt: false, foutmelding: "Dit account kan niet verwijderd worden." };
  }

  const supabase = maakServerClient();
  const { error: wachtwoordFout } = await supabase.auth.signInWithPassword({
    email: profiel.email,
    password: wachtwoord,
  });
  if (wachtwoordFout) {
    return { gelukt: false, foutmelding: "Wachtwoord klopt niet." };
  }

  const ipHash = haalIpHash();
  if (!(await magDoor("verwijderen", ipHash, sessie.gebruikerId))) {
    return { gelukt: false, foutmelding: "Te veel pogingen, probeer het later opnieuw." };
  }

  const serviceClient = maakServiceClient();

  const { data: lidRij } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", sessie.gebruikerId)
    .maybeSingle();

  if (!lidRij) {
    // "Wees"-pad: geen huishouden (meer) — enkel het account zelf nog verwijderen.
    return verwijderEigenAccount(sessie.gebruikerId, serviceClient, ipHash);
  }

  if (lidRij.role !== "owner") {
    // Gewoon gezinslid: enkel het eigen account, de huishouddata blijft.
    return verwijderEigenAccount(sessie.gebruikerId, serviceClient, ipHash);
  }

  const { count: aantalEigenaren } = await supabase
    .from("household_members")
    .select("user_id", { count: "exact", head: true })
    .eq("household_id", lidRij.household_id)
    .eq("role", "owner");

  const scope = bepaalVerwijderScope(lidRij.role as HouseholdRol, aantalEigenaren ?? 1);

  if (scope === "zelf") {
    return verwijderEigenAccount(sessie.gebruikerId, serviceClient, ipHash);
  }

  const { data: alleLeden } = await supabase.from("household_members").select("user_id").eq("household_id", lidRij.household_id);
  const gezinsledenIds = (alleLeden ?? []).map((lid) => lid.user_id as string).filter((id) => id !== sessie.gebruikerId);

  for (const lidId of gezinsledenIds) {
    const { error } = await serviceClient.auth.admin.deleteUser(lidId);
    if (error) {
      logger.error({
        code: "AUTH_001",
        message: "Kon gezinslid-account niet verwijderen tijdens het verwijderen van het huishouden",
        context: { error: error.message },
      });
      await registreerPoging("verwijderen", ipHash, sessie.gebruikerId, false);
      return { gelukt: false, foutmelding: "Kon niet alles verwijderen. Probeer opnieuw." };
    }
  }

  const { error: rpcFout } = await supabase.rpc("verwijder_household", { p_household_id: lidRij.household_id });
  if (rpcFout) {
    logger.error({ code: "DB_001", message: "verwijder_household mislukte", context: { error: rpcFout.message } });
    await registreerPoging("verwijderen", ipHash, sessie.gebruikerId, false);
    return { gelukt: false, foutmelding: "Kon het huishouden niet volledig verwijderen. Probeer opnieuw." };
  }

  return verwijderEigenAccount(sessie.gebruikerId, serviceClient, ipHash);
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
      context: {
        gebruikersnaam: context.gebruikersnaam,
        householdId: context.householdId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return { gelukt: false, foutmelding: "Kon je gegevens niet overzetten." };
  }
}
