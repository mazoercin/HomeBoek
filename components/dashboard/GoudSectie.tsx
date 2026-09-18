"use client";

import { useState, useTransition } from "react";
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
    <div className="kaart bg-goud-bg" id="goud">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-goud">🪙 Goud</h2>
        <p className="text-xl font-extrabold text-goud">€{totaal.toFixed(2)}</p>
      </div>

      <ul className="space-y-1 mb-3">
        {transacties.slice(0, 5).map((t) => (
          <li key={t.id} className="flex justify-between text-sm text-tekst-primair">
            <span>
              {t.datum}
              {t.notitie ? ` — ${t.notitie}` : ""}
            </span>
            <span className="font-bold">€{t.bedrag.toFixed(2)}</span>
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
        <button type="button" className="knop-secundair w-full" onClick={() => setFormOpen(true)}>
          + Inleg registreren
        </button>
      )}
    </div>
  );
}
