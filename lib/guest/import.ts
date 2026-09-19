import type { GastData } from "./store";
import type { GastImportPayload } from "@/app/gezin/actions";

/**
 * Zet lokaal bewaarde gast-data om naar het payload-formaat dat
 * importeerGastData() verwacht — enkel de echte business-velden, nooit
 * de gast-only metadata (id/household_id="gast"/created_by/...): die
 * ids en het "gast"-huishouden-id zouden een insert in de échte database
 * meteen doen falen (geen geldig uuid, geen bestaand huishouden).
 */
export function bouwGastImportPayload(data: GastData): GastImportPayload {
  const maanden: GastImportPayload["maanden"] = {};
  for (const [maand, m] of Object.entries(data.maanden)) {
    maanden[maand] = {
      inkomen: m.inkomen.map(({ bron, label, bedrag, frequentie }) => ({ bron, label, bedrag, frequentie })),
      vasteKosten: m.vasteKosten.map(({ label, bedrag, categorie, icoon, vervaldag, eind_datum, betaald }) => ({
        label,
        bedrag,
        categorie,
        icoon,
        vervaldag,
        eind_datum,
        betaald,
      })),
      facturen: m.facturen.map(({ label, bedrag, categorie, icoon, vervaldag, eind_datum, betaald }) => ({
        label,
        bedrag,
        categorie,
        icoon,
        vervaldag,
        eind_datum,
        betaald,
      })),
      extraUitgaven: m.extraUitgaven.map(({ label, bedrag, overslaanbaar, geskipt }) => ({
        label,
        bedrag,
        overslaanbaar,
        geskipt,
      })),
    };
  }

  return {
    maanden,
    doelen: data.doelen.map(({ id, naam, target_bedrag, maandelijks_bedrag, prioriteit, gepauzeerd }) => ({
      id,
      naam,
      target_bedrag,
      maandelijks_bedrag,
      prioriteit,
      gepauzeerd,
    })),
    doelBijdragen: data.doelBijdragen.map(({ doel_id, bedrag, datum, notitie, aftrekken_van_inkomen }) => ({
      doel_id,
      bedrag,
      datum,
      notitie,
      aftrekken_van_inkomen,
    })),
    investeringen: data.investeringen.map(({ id, naam }) => ({ id, naam })),
    investeringTransacties: data.investeringTransacties.map(({ investering_id, bedrag, datum, notitie }) => ({
      investering_id,
      bedrag,
      datum,
      notitie,
    })),
  };
}
