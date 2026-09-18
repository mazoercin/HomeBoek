import { promises as fs } from "fs";
import path from "path";
import type { LogNiveau, LogRegel } from "./logger";

/**
 * Server-only logger: schrijft elk logbericht als JSON-regel naar
 * logs/app.log (JSON-lines), en logt in development ook leesbaar
 * (met kleur per niveau) naar de console. In productie gaat enkel het
 * logbestand mee — geen console-ruis.
 *
 * Enkel importeren vanuit Server Components, Server Actions en andere
 * server-only modules (nooit vanuit een "use client"-bestand — dat
 * zou 'fs' proberen te bundelen voor de browser).
 */

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

const KLEUR: Record<LogNiveau, string> = {
  INFO: "\x1b[32m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
};
const RESET = "\x1b[0m";

async function schrijfNaarBestand(regel: LogRegel): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, JSON.stringify(regel) + "\n", "utf8");
  } catch {
    // Een falende logger mag de applicatie nooit doen crashen.
  }
}

function log(level: LogNiveau, input: { code: string; message: string; context?: Record<string, unknown> }): void {
  const regel: LogRegel = {
    timestamp: new Date().toISOString(),
    level,
    code: input.code,
    message: input.message,
    context: input.context,
  };

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`${KLEUR[level]}[${level}] ${regel.code} — ${regel.message}${RESET}`, input.context ?? "");
  }

  void schrijfNaarBestand(regel);
}

export const logger = {
  info: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("INFO", input),
  warn: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("WARN", input),
  error: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("ERROR", input),
};

/** Leest de laatste `limiet` regels uit het logbestand, nieuwste eerst. */
export async function leesLogRegels(limiet = 200): Promise<LogRegel[]> {
  try {
    const inhoud = await fs.readFile(LOG_FILE, "utf8");
    const regels = inhoud
      .split("\n")
      .filter((r) => r.trim().length > 0)
      .map((r) => {
        try {
          return JSON.parse(r) as LogRegel;
        } catch {
          return null;
        }
      })
      .filter((r): r is LogRegel => r !== null);
    return regels.reverse().slice(0, limiet);
  } catch {
    return [];
  }
}

export async function wisLogbestand(): Promise<void> {
  try {
    await fs.writeFile(LOG_FILE, "", "utf8");
  } catch {
    // Niets om te doen als het bestand niet bestaat — resultaat is toch leeg.
  }
}
