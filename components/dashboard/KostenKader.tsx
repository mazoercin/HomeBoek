"use client";

import { useState, useTransition } from "react";
import type { Categorie, VasteKost, Factuur } from "@/types/database";
import { CATEGORIE_INFO } from "@/types/database";

type Kost = VasteKost | Factuur;

interface Props {
  titel: string;
  ankerId: string;
  items: Kost[];
  betaaldMap: Record<string, boolean>;
  maand: string;
  onZetBetaald: (id: string, maand: string, betaald: boolean) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onToevoegen: (data: {
    label: string;
    bedrag: number;
    categorie: Categorie;
    icoon: string;
    vervaldag: number | null;
    eind_datum: string | null;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

const CATEGORIEEN = Object.keys(CATEGORIE_INFO) as Categorie[];

/** Herbruikbaar kader voor vaste kosten én facturen — zelfde structuur en gedrag. */
export function KostenKader({
  titel,
  ankerId,
  items,
  betaaldMap,
  maand,
  onZetBetaald,
  onToevoegen,
  onVerwijderen,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const categorie = String(formData.get("categorie") ?? "andere") as Categorie;
    const vervaldagRaw = String(formData.get("vervaldag") ?? "");
    const eindDatumRaw = String(formData.get("eind_datum") ?? "");

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    const vervaldag = vervaldagRaw ? Number(vervaldagRaw) : null;
    if (vervaldag !== null && (vervaldag < 1 || vervaldag > 31)) {
      setFout("Vervaldag moet tussen 1 en 31 liggen.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onToevoegen({
        label,
        bedrag,
        categorie,
        icoon: CATEGORIE_INFO[categorie].icoon,
        vervaldag,
        eind_datum: eindDatumRaw || null,
      });
      if (resultaat.gelukt) {
        setFormOpen(false);
      } else {
        setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
      }
    });
  }

  return (
    <div className="kaart" id={ankerId}>
      <h2 className="text-lg font-bold mb-3">{titel}</h2>

      {items.length === 0 && !formOpen && (
        <p className="text-tekst-secundair text-sm mb-3">Nog niets toegevoegd.</p>
      )}

      <ul className="space-y-2 mb-3">
        {items.map((item) => {
          const info = CATEGORIE_INFO[item.categorie];
          const betaald = betaaldMap[item.id] ?? false;
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-rand p-3"
            >
              <div className="min-w-0">
                <p className="font-bold truncate">
                  <span aria-hidden>{item.icoon || info.icoon}</span> {item.label}
                </p>
                <p className="text-xs text-tekst-secundair truncate">{info.label}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-extrabold">€{item.bedrag.toFixed(2)}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await onZetBetaald(item.id, maand, !betaald);
                    })
                  }
                  className={`min-h-[44px] px-3 rounded-full text-sm font-bold transition active:scale-95 ${
                    betaald ? "bg-succes-bg text-succes" : "bg-rand text-tekst-secundair"
                  }`}
                >
                  {betaald ? "✓ Betaald" : "Onbetaald"}
                </button>
                <button
                  type="button"
                  aria-label={`Verwijder ${item.label}`}
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`"${item.label}" verwijderen?`)) {
                      startTransition(async () => {
                        await onVerwijderen(item.id);
                      });
                    }
                  }}
                  className="min-h-[44px] min-w-[44px] text-tekst-secundair hover:text-tekort transition"
                >
                  🗑️
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {formOpen ? (
        <form action={submit} className="space-y-3 border-t border-rand pt-3">
          <div>
            <label className="veld-label">Label</label>
            <input name="label" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Bedrag (€)</label>
            <input name="bedrag" type="number" inputMode="decimal" step="0.01" min="0.01" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Categorie</label>
            <select name="categorie" className="veld-input">
              {CATEGORIEEN.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIE_INFO[c].icoon} {CATEGORIE_INFO[c].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="veld-label">Vervaldag (dag van de maand, optioneel)</label>
            <input name="vervaldag" type="number" inputMode="numeric" min="1" max="31" className="veld-input" />
          </div>
          <div>
            <label className="veld-label">Einddatum (optioneel)</label>
            <input name="eind_datum" type="date" className="veld-input" />
          </div>
          {fout && <p className="veld-fout">{fout}</p>}
          <div className="flex gap-2">
            <button type="submit" className="knop-primair flex-1" disabled={isPending}>
              Opslaan
            </button>
            <button type="button" className="knop-secundair" onClick={() => setFormOpen(false)}>
              Annuleren
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="knop-secundair w-full" onClick={() => setFormOpen(true)}>
          + Toevoegen
        </button>
      )}
    </div>
  );
}
