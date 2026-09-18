"use client";

import { useState, useTransition } from "react";
import { Coins, Plus } from "lucide-react";
import type { GoudTransactie } from "@/types/database";

interface Props {
  transacties: GoudTransactie[];
  onToevoegen: (data: {
    bedrag: number;
    datum: string;
    notitie: string | null;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/** Handmatige goud-inleg — geen live koers, eigen goud-kleur. */
export function GoudSectie({ transacties, onToevoegen }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totaal = transacties.reduce((som, t) => som + t.bedrag, 0);

  function submit(formData: FormData) {
    setFout(null);
    const bedrag = Number(formData.get("bedrag"));
    const datum = String(formData.get("datum") ?? "");
    const notitie = String(formData.get("notitie") ?? "").trim();

    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }
    if (!datum) {
      setFout("Kies een datum.");
      return;
    }

    startTransition(async () => {
      const res = await onToevoegen({ bedrag, datum, notitie: notitie || null });
      if (res.gelukt) setFormOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart bg-gradient-to-br from-goud-bg to-white border-goud/20" id="goud">
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 bg-gradient-goud shadow-sm">
          <Coins size={18} color="#ffffff" strokeWidth={2.25} />
        </span>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-goud">Goud</p>
          <p className="text-xl font-extrabold text-goud tabular-nums leading-tight">€{totaal.toFixed(2)}</p>
        </div>
      </div>

      <ul className="space-y-1.5 mb-4">
        {transacties.slice(0, 5).map((t) => (
          <li key={t.id} className="flex justify-between items-center text-sm text-tekst-primair bg-white/60 rounded-lg px-3 py-2">
            <span className="text-tekst-secundair">
              {t.datum}
              {t.notitie ? ` — ${t.notitie}` : ""}
            </span>
            <span className="font-bold tabular-nums">€{t.bedrag.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      {formOpen ? (
        <form action={submit} className="space-y-3 border-t border-goud/20 pt-3">
          <div>
            <label className="veld-label">Bedrag (€)</label>
            <input name="bedrag" type="number" inputMode="decimal" step="0.01" min="0.01" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Datum</label>
            <input name="datum" type="date" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Notitie (optioneel)</label>
            <input name="notitie" className="veld-input" />
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
        <button type="button" className="knop-secundair w-full gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus size={18} strokeWidth={2.5} /> Inleg registreren
        </button>
      )}
    </div>
  );
}
