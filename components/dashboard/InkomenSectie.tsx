"use client";

import { useState, useTransition } from "react";
import type { VastInkomen, InkomenBron } from "@/types/database";

interface Props {
  items: VastInkomen[];
  onToevoegen: (data: { bron: InkomenBron; label: string; bedrag: number }) => Promise<{
    gelukt: boolean;
    foutmelding?: string;
  }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

const BRONNEN: { waarde: InkomenBron; label: string }[] = [
  { waarde: "zelf", label: "Zelf" },
  { waarde: "partner", label: "Partner" },
  { waarde: "ander", label: "Ander" },
];

export function InkomenSectie({ items, onToevoegen, onVerwijderen }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const bron = String(formData.get("bron") ?? "zelf") as InkomenBron;

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    startTransition(async () => {
      const res = await onToevoegen({ bron, label, bedrag });
      if (res.gelukt) setFormOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="inkomen">
      <h2 className="text-lg font-bold mb-3">Vast inkomen</h2>

      {items.length === 0 && !formOpen && (
        <p className="text-tekst-secundair text-sm mb-3">Nog niets toegevoegd.</p>
      )}

      <ul className="space-y-2 mb-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-rand p-3">
            <div className="min-w-0">
              <p className="font-bold truncate">{item.label}</p>
              <p className="text-xs text-tekst-secundair capitalize">{item.bron}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-extrabold text-primair">€{item.bedrag.toFixed(2)}</span>
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
        ))}
      </ul>

      {formOpen ? (
        <form action={submit} className="space-y-3 border-t border-rand pt-3">
          <div>
            <label className="veld-label">Bron</label>
            <select name="bron" className="veld-input">
              {BRONNEN.map((b) => (
                <option key={b.waarde} value={b.waarde}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="veld-label">Label</label>
            <input name="label" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Bedrag (€)</label>
            <input name="bedrag" type="number" inputMode="decimal" step="0.01" min="0.01" className="veld-input" required />
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
