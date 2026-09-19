"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, Wallet } from "lucide-react";
import type { Inkomen, InkomenBron, InkomenFrequentie } from "@/types/database";
import { berekenMaandequivalent } from "@/lib/calculations/inkomen";
import { StapTip } from "@/components/ui/StapTip";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";

interface Props {
  items: Inkomen[];
  onToevoegen: (data: {
    bron: InkomenBron;
    label: string;
    bedrag: number;
    frequentie: InkomenFrequentie;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

const BRONNEN: { waarde: InkomenBron; label: string }[] = [
  { waarde: "zelf", label: "Zelf" },
  { waarde: "partner", label: "Partner" },
  { waarde: "ander", label: "Ander" },
];

const FREQUENTIES: { waarde: InkomenFrequentie; label: string }[] = [
  { waarde: "wekelijks", label: "Wekelijks" },
  { waarde: "maandelijks", label: "Maandelijks" },
  { waarde: "3-maandelijks", label: "Om de 3 maanden" },
  { waarde: "6-maandelijks", label: "Om de 6 maanden" },
  { waarde: "jaarlijks", label: "Jaarlijks" },
];

const FREQUENTIE_LABEL: Record<InkomenFrequentie, string> = {
  wekelijks: "per week",
  maandelijks: "per maand",
  "3-maandelijks": "per 3 maanden",
  "6-maandelijks": "per 6 maanden",
  jaarlijks: "per jaar",
};

export function InkomenSectie({ items, onToevoegen, onVerwijderen }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const bron = String(formData.get("bron") ?? "zelf") as InkomenBron;
    const frequentie = String(formData.get("frequentie") ?? "maandelijks") as InkomenFrequentie;

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    startTransition(async () => {
      const res = await onToevoegen({ bron, label, bedrag, frequentie });
      if (res.gelukt) setFormOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="inkomen">
      <h2 className="text-lg font-bold tracking-tight mb-1">Inkomen</h2>
      <p className="text-xs text-tekst-secundair mb-4">
        Kies per post hoe vaak het binnenkomt — we rekenen automatisch om naar een maandbedrag.
      </p>

      {items.length === 0 && !formOpen && (
        <StapTip
          stapNummer={1}
          titel="Begin met je inkomen"
          uitleg="Vul elk inkomen apart in — je loon, dat van je partner, kindergeld, een freelance-opdracht, ... met de juiste frequentie."
          voorbeeld="Loon Ercin — €2400,00 maandelijks"
        />
      )}

      <ul className="space-y-2 mb-4">
        {items.map((item) => {
          const maandequivalent = berekenMaandequivalent(item.bedrag, item.frequentie);
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-rand/70 p-3 transition-colors hover:bg-slate-50/80"
            >
              <span className="inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 bg-primair-light">
                <Wallet size={18} color="#4F46E5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-tekst-primair truncate leading-tight">{item.label}</p>
                <p className="text-xs text-tekst-secundair mt-0.5">
                  <span className="capitalize">{item.bron}</span> · €{item.bedrag.toFixed(2)}{" "}
                  {FREQUENTIE_LABEL[item.frequentie]}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0 mr-1">
                <span className="text-[11px] uppercase tracking-wide text-tekst-secundair font-medium">Per maand</span>
                <span className="font-extrabold text-primair tabular-nums">€{maandequivalent.toFixed(2)}</span>
              </div>
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
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekort hover:bg-tekort-bg transition"
              >
                <Trash2 size={17} strokeWidth={2} />
              </button>
            </li>
          );
        })}
      </ul>

      <Uitklapbaar open={formOpen}>
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
          <div>
            <label className="veld-label">Frequentie</label>
            <select name="frequentie" className="veld-input" defaultValue="maandelijks">
              {FREQUENTIES.map((f) => (
                <option key={f.waarde} value={f.waarde}>
                  {f.label}
                </option>
              ))}
            </select>
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
      </Uitklapbaar>
      {!formOpen && (
        <button type="button" className="knop-secundair w-full gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus size={18} strokeWidth={2.5} /> Toevoegen
        </button>
      )}
    </div>
  );
}
