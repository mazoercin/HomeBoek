import { createClient } from "@supabase/supabase-js";
import type { LogNiveau, LogRegel } from "./logger";

/**
 * Server-only logger: schrijft elk logbericht naar de `applicatie_logs`-
 * tabel in Supabase, en logt in development ook leesbaar (met kleur per
 * niveau) naar de console.
 *
 * Waarom een databasetabel i.p.v. een lokaal bestand: Vercel's
 * serverless functies draaien op een schrijfbeveiligd, kortstondig
 * bestandssysteem — elke aanroep kan in een ander containertje
 * terechtkomen, dus een lokaal logbestand is niet betrouwbaar. Een
 * tabel is de logische vervanger die wél overal werkt.
 *
 * Enkel importeren vanuit Server Components, Server Actions en andere
 * server-only modules (nooit vanuit een "use client"-bestand).
 */

const KLEUR: Record<LogNiveau, string> = {
  INFO: "\x1b[32m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
};
const RESET = "\x1b[0m";

function maakServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function schrijfNaarDatabase(input: { code: string; message: string; context?: Record<string, unknown> }, niveau: LogNiveau): Promise<void> {
  try {
    const supabase = maakServiceClient();
    await supabase.from("applicatie_logs").insert({
      niveau,
      code: input.code,
      bericht: input.message,
      context: input.context ?? null,
    });
  } catch {
    // Een falende logger mag de applicatie nooit doen crashen. Als dit
    // faalt (bv. Supabase tijdelijk onbereikbaar), blijft de console-
    // output in development nog altijd beschikbaar als noodgreep.
  }
}

/**
 * Geeft de databaseschrijf-promise terug i.p.v. hem weg te "voiden".
 * Op Vercel's serverless runtime kan een niet-afgewachte promise
 * gekilled worden zodra een Server Action/Route Handler zijn respons al
 * teruggaf — vooral bij een logger.error() vlak vóór een `return`, het
 * meest voorkomende patroon in deze codebase. Bestaande aanroepen die dit
 * resultaat niet afwachten blijven werken (best-effort, zoals voorheen);
 * kritieke plekken (bv. een foutpad in een Server Action dat je later wil
 * kunnen naspeuren) kunnen er nu bewust wél op `await`en.
 */
function log(niveau: LogNiveau, input: { code: string; message: string; context?: Record<string, unknown> }): Promise<void> {
  // Altijd naar de console (Vercel vangt stdout/stderr op als Runtime Logs —
  // dat is op een serverless platform de enige plek waar je dit live ziet).
  // eslint-disable-next-line no-console
  console.log(`${KLEUR[niveau]}[${niveau}] ${input.code} — ${input.message}${RESET}`, input.context ?? "");

  return schrijfNaarDatabase(input, niveau);
}

export const logger = {
  info: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("INFO", input),
  warn: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("WARN", input),
  error: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("ERROR", input),
};

/** Leest de laatste `limiet` logregels, nieuwste eerst. */
export async function leesLogRegels(limiet = 200): Promise<LogRegel[]> {
  try {
    const supabase = maakServiceClient();
    const { data, error } = await supabase
      .from("applicatie_logs")
      .select("aangemaakt_op, niveau, code, bericht, context")
      .order("aangemaakt_op", { ascending: false })
      .limit(limiet);

    if (error || !data) return [];

    return data.map((r) => ({
      timestamp: r.aangemaakt_op,
      level: r.niveau as LogNiveau,
      code: r.code,
      message: r.bericht,
      context: (r.context as Record<string, unknown> | null) ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function wisLogbestand(): Promise<void> {
  try {
    const supabase = maakServiceClient();
    // Verwijdert alle rijen (geen enkele voldoet aan een onmogelijke id-check niet nodig — delete zonder filter verwijdert alles).
    await supabase.from("applicatie_logs").delete().gte("aangemaakt_op", "1970-01-01");
  } catch {
    // Niets om te doen als het wissen faalt — de gebruiker kan het opnieuw proberen.
  }
}
