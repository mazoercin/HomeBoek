import { headers } from "next/headers";
import { createHash } from "crypto";
import { maakServiceClient } from "@/lib/supabase/server";

const VENSTER_MINUTEN = 15;
const MAX_POGINGEN = 10;

/** Gehashte client-IP (nooit het echte IP bewaren) — best-effort, `null` als de header ontbreekt. */
export function haalIpHash(): string | null {
  const forwarded = headers().get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Eenvoudige, DB-backed rate limit op uitnodiging-acties (per IP EN
 * per account), enkel bereikbaar via de service-role key — de tabel
 * zelf is voor iedereen anders ontoegankelijk. Fail-open bij een
 * DB-probleem (een storing mag nooit de hele flow blokkeren).
 */
export async function magDoor(soort: "accept" | "aanmaken", ipHash: string | null, gebruikerId: string | null): Promise<boolean> {
  if (!ipHash && !gebruikerId) return true;
  const supabase = maakServiceClient();
  const sinds = new Date(Date.now() - VENSTER_MINUTEN * 60 * 1000).toISOString();

  const voorwaarden = [ipHash ? `ip_hash.eq.${ipHash}` : null, gebruikerId ? `gebruiker_id.eq.${gebruikerId}` : null]
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

export async function registreerPoging(
  soort: "accept" | "aanmaken",
  ipHash: string | null,
  gebruikerId: string | null,
  gelukt: boolean
): Promise<void> {
  const supabase = maakServiceClient();
  await supabase.from("invite_pogingen").insert({ soort, ip_hash: ipHash, gebruiker_id: gebruikerId, gelukt });
}
