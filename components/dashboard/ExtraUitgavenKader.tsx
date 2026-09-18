"use client";

import { useState, useTransition } from "react";
import type { ExtraUitgave } from "@/types/database";

interface Props {
  items: ExtraUitgave[];
  geskipteIds: string[];
  onToevoegen: (data: {
    label: string;
    bedrag: number;
    overslaanbaar: boolean;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

export function ExtraUitgavenKader({ items, geskipteIds, onToevoegen, onVerwijderen }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const overslaanbaar = formData.get("overslaanbaar") === "on";

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onToevoegen({ label, bedrag, overslaanbaar });
      if (resultaat.gelukt) setFormOpen(false);
      else setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="uitgaven">
      <h2 className="text-lg font-bold mb-3">Extra uitgaven</h2>

      {items.length === 0 && !formOpen && (
        <p className="text-tekst-secundair text-sm mb-3">Nog niets toegevoegd.</p>
      )}

      <ul className="space-y-2 mb-3">
        {items.map((item) => {
          const geskipt = geskipteIds.includes(item.id);
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-rand p-3"
            >
              <div className="min-w-0">
                <p className="font-bold truncate">{item.label}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {item.overslaanbaar && (
                    <span className="text-xs font-bold text-secundair bg-secundair/10 rounded-full px-2 py-0.5">
                      Overslaanbaar
                    </span>
                  )}
                  {geskipt && (
                    <span className="text-xs font-bold text-tekst-secundair bg-rand rounded-full px-2 py-0.5">
                      Deze maand overgeslagen
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-extrabold">€{item.bedrag.toFixed(2)}</span>
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
          <label className="flex items-center gap-2 min-h-[44px]">
            <input name="overslaanbaar" type="checkbox" defaultChecked className="h-5 w-5" />
            <span>Overslaanbaar (pauzeerbaar)</span>
          </label>
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
