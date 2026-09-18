/**
 * Client-veilige logger: enkel console-output, geen bestandssysteem.
 * Gebruikt door code die zowel server- als client-side kan draaien
 * (de pure rekenfuncties in lib/calculations/, en formuliervalidatie
 * die ook in de browser loopt). Voor server-only logging die ook naar
 * logs/app.log wegschrijft, zie lib/logger.server.ts.
 */

export type LogNiveau = "INFO" | "WARN" | "ERROR";

export interface LogRegel {
  timestamp: string;
  level: LogNiveau;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

function log(level: LogNiveau, input: { code: string; message: string; context?: Record<string, unknown> }): void {
  // eslint-disable-next-line no-console
  console.log(`[${level}] ${input.code} — ${input.message}`, input.context ?? "");
}

export const logger = {
  info: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("INFO", input),
  warn: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("WARN", input),
  error: (input: { code: string; message: string; context?: Record<string, unknown> }) => log("ERROR", input),
};
