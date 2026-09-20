import { headers } from "next/headers";
import { createHash, createHmac } from "crypto";
import { maakServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger.server";

const VENSTER_MINUTEN = 15;
const MAX_POGINGEN = 10;

const LOGIN_VENSTER_MINUTEN = 15;
const LOGIN_MAX_POGINGEN_IDENTIFICATOR = 5;
const LOGIN_MAX_POGINGEN_IP = 20;

const RESET_VENSTER_MINUTEN = 60;
const RESET_MAX_POGINGEN_IDENTIFICATOR = 3;
const RESET_MAX_POGINGEN_IP = 10;

export type PogingSoort = "accept" | "aanmaken" | "login" | "reset";

/** Gehashte client-IP (nooit het echte IP bewaren) — best-effort, `null` als de header ontbreekt. */
export function haalIpHash(): string | null {
  const forwarded = headers().get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Gezouten variant, enkel gebruikt door de login-rate-limit hieronder:
 * HMAC-SHA256 met het geheim RATE_LIMIT_SALT i.p.v. de kale SHA-256 van
 * haalIpHash() — een IP-adres of gebruikersnaam heeft te weinig
 * mogelijke waarden om zonder geheim veilig te hashen (rainbow table).
 * Ontbreekt het geheim, dan loggen we dat en vallen we fail-open terug
 * (geen limiet i.p.v. de hele login blokkeren door een configuratiefout).
 */
export function haalGezouteHash(waarde: string): string | null {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt) {
    logger.error({
      code: "AUTH_002",
      message: "RATE_LIMIT_SALT ontbreekt — login-rate-limiting staat effectief uit",
    });
    return null;
  }
  return createHmac("sha256", salt).update(waarde.trim().toLowerCase()).digest("hex");
}

/** Gezouten IP-hash voor de login-rate-limit — zie haalGezouteHash(). */
export function haalGezouteIpHash(): string | null {
  const forwarded = headers().get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  if (!ip) return null;
  return haalGezouteHash(ip);
}

/**
 * Eenvoudige, DB-backed rate limit, enkel bereikbaar via de service-role
 * key — de tabel zelf is voor iedereen anders ontoegankelijk. Fail-open
 * bij een DB-probleem (een storing mag nooit de hele flow blokkeren).
 *
 * "login" en "reset" hebben een eigen implementatie (zie
 * magDoorMetTweeLimieten hieronder): een gedeelde OR-telling zoals
 * "accept"/"aanmaken" past niet bij twee aparte drempels (per
 * identificator én per IP).
 */
export async function magDoor(
  soort: PogingSoort,
  ipHash: string | null,
  gebruikerIdOfIdentificatorHash: string | null
): Promise<boolean> {
  if (soort === "login") {
    return magDoorMetTweeLimieten(
      "login",
      ipHash,
      gebruikerIdOfIdentificatorHash,
      LOGIN_VENSTER_MINUTEN,
      LOGIN_MAX_POGINGEN_IDENTIFICATOR,
      LOGIN_MAX_POGINGEN_IP
    );
  }
  if (soort === "reset") {
    return magDoorMetTweeLimieten(
      "reset",
      ipHash,
      gebruikerIdOfIdentificatorHash,
      RESET_VENSTER_MINUTEN,
      RESET_MAX_POGINGEN_IDENTIFICATOR,
      RESET_MAX_POGINGEN_IP
    );
  }

  if (!ipHash && !gebruikerIdOfIdentificatorHash) return true;
  const supabase = maakServiceClient();
  const sinds = new Date(Date.now() - VENSTER_MINUTEN * 60 * 1000).toISOString();

  const voorwaarden = [
    ipHash ? `ip_hash.eq.${ipHash}` : null,
    gebruikerIdOfIdentificatorHash ? `gebruiker_id.eq.${gebruikerIdOfIdentificatorHash}` : null,
  ]
    .filter(Boolean)
    .join(",");

  const { count, error } = await supabase
    .from("invite_pogingen")
    .select("id", { count: "exact", head: true })
    .eq("soort", soort)
    .gte("created_at", sinds)
    .or(voorwaarden);

  if (error) return true;
  return (count ?? 0) < MAX_POGINGEN;
}

/**
 * Registreert een poging. Voor "login"/"reset" ruimt dit meteen ook
 * rijen ouder dan 24 uur op (enkel diezelfde soort — accept/aanmaken
 * blijven ongemoeid) zodat de tabel niet ongelimiteerd groeit; geen
 * pg_cron nodig (die extensie staat mogelijk niet aan).
 */
export async function registreerPoging(
  soort: PogingSoort,
  ipHash: string | null,
  gebruikerIdOfIdentificatorHash: string | null,
  gelukt: boolean
): Promise<void> {
  const supabase = maakServiceClient();

  if (soort === "login" || soort === "reset") {
    await supabase
      .from("invite_pogingen")
      .insert({ soort, ip_hash: ipHash, identificator_hash: gebruikerIdOfIdentificatorHash, gelukt });
    await supabase
      .from("invite_pogingen")
      .delete()
      .eq("soort", soort)
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    return;
  }

  await supabase
    .from("invite_pogingen")
    .insert({ soort, ip_hash: ipHash, gebruiker_id: gebruikerIdOfIdentificatorHash, gelukt });
}

/** Eén poging zoals opgehaald uit invite_pogingen, voor de login-rate-limit. */
export interface LoginPogingRecord {
  identificatorHash: string | null;
  ipHash: string | null;
  gelukt: boolean;
  aangemaaktOp: number;
}

/**
 * Pure beslissingslogica, gedeeld door login én wachtwoord-reset —
 * bewust los van Supabase zodat dit zonder live databank te testen is
 * (net als lib/calculations/*). Telt enkel mislukte pogingen binnen het
 * venster, en voor de identificator-limiet enkel de mislukkingen NA de
 * laatste geslaagde poging van diezelfde identificator: dat is de
 * "reset bij succes" bij login — zonder dat daarvoor iets verwijderd
 * hoeft te worden. Wachtwoord-reset registreert nooit een succes (zie
 * de "reset"-tak in registreerPoging-aanroepen), dus daar telt gewoon
 * elke mislukte poging plat mee, zonder ooit te resetten.
 */
export function magInloggenLogica(
  pogingen: LoginPogingRecord[],
  identificatorHash: string | null,
  ipHash: string | null,
  nu: number,
  opties: { vensterMs?: number; maxIdentificator?: number; maxIp?: number } = {}
): boolean {
  const vensterMs = opties.vensterMs ?? LOGIN_VENSTER_MINUTEN * 60 * 1000;
  const maxIdentificator = opties.maxIdentificator ?? LOGIN_MAX_POGINGEN_IDENTIFICATOR;
  const maxIp = opties.maxIp ?? LOGIN_MAX_POGINGEN_IP;

  const binnenVenster = pogingen.filter((p) => nu - p.aangemaaktOp < vensterMs);

  let aantalIdentificator = 0;
  if (identificatorHash) {
    const vanIdentificator = binnenVenster.filter((p) => p.identificatorHash === identificatorHash);
    const laatsteSucces = vanIdentificator
      .filter((p) => p.gelukt)
      .reduce((max, p) => Math.max(max, p.aangemaaktOp), -Infinity);
    aantalIdentificator = vanIdentificator.filter((p) => !p.gelukt && p.aangemaaktOp > laatsteSucces).length;
  }

  let aantalIp = 0;
  if (ipHash) {
    aantalIp = binnenVenster.filter((p) => p.ipHash === ipHash && !p.gelukt).length;
  }

  return aantalIdentificator < maxIdentificator && aantalIp < maxIp;
}

async function magDoorMetTweeLimieten(
  soort: "login" | "reset",
  ipHash: string | null,
  identificatorHash: string | null,
  vensterMinuten: number,
  maxIdentificator: number,
  maxIp: number
): Promise<boolean> {
  if (!ipHash && !identificatorHash) return true;
  const supabase = maakServiceClient();
  const sinds = new Date(Date.now() - vensterMinuten * 60 * 1000).toISOString();

  const voorwaarden = [
    identificatorHash ? `identificator_hash.eq.${identificatorHash}` : null,
    ipHash ? `ip_hash.eq.${ipHash}` : null,
  ]
    .filter(Boolean)
    .join(",");

  const { data, error } = await supabase
    .from("invite_pogingen")
    .select("identificator_hash, ip_hash, gelukt, created_at")
    .eq("soort", soort)
    .gte("created_at", sinds)
    .or(voorwaarden);

  if (error || !data) return true;

  const pogingen: LoginPogingRecord[] = data.map((rij) => ({
    identificatorHash: rij.identificator_hash,
    ipHash: rij.ip_hash,
    gelukt: rij.gelukt,
    aangemaaktOp: new Date(rij.created_at).getTime(),
  }));

  return magInloggenLogica(pogingen, identificatorHash, ipHash, Date.now(), {
    vensterMs: vensterMinuten * 60 * 1000,
    maxIdentificator,
    maxIp,
  });
}
