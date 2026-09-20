import type { HouseholdRol } from "@/types/database";

export type VerwijderScope = "huishouden" | "zelf";

/**
 * Bepaalt of "account verwijderen" het hele huishouden meeneemt (alle
 * data + alle gezinsleden-accounts), of enkel het eigen account.
 *
 * Enkel de eigenaar én enkel als die de ENIGE eigenaar is, neemt het
 * hele huishouden mee. Het schema staat vandaag nooit meer dan één
 * eigenaar per huishouden toe (unieke index), dus de "meerdere
 * eigenaars"-tak is vandaag onbereikbaar — maar blijft correct als dat
 * ooit verandert, en kost verder niets.
 */
export function bepaalVerwijderScope(rol: HouseholdRol, aantalEigenaren: number): VerwijderScope {
  if (rol === "owner" && aantalEigenaren <= 1) return "huishouden";
  return "zelf";
}
