"use client";

import { useState } from "react";
import type { OnboardingDoel } from "@/lib/data/onboarding";
import { valideerVerplichteTekst, valideerPositiefBedrag } from "@/lib/validatie";

interface Props {
  items: OnboardingDoel[];
  onWijzig: (items: OnboardingDoel[]) => void;
  fout: string | null;
  setFout: (fout: string | null) => void;
}

export function Stap5Doelen({ items, onWijzig, fout, setFout }: Props) {
  const [naam, setNaam] = useState("");
  const [targetBedrag, setTargetBedrag] = useState("");
  const [maandelijksBedrag, setMaandelijksBedrag] = useState("");

  function voegToe() {
    setFout(null);
    const tekstFout = valideerVerplichteTekst(naam, "Naam");
    if (tekstFout) return setFout(tekstFout);
    const targetFout = valideerPositiefBedrag(Number(targetBedrag), "Doelbedrag");
    if (targetFout) return setFout(targetFout);
    if (maandelijksBedrag && (!Number.isFinite(Number(maandelijksBedrag)) || Number(maandelijksBedrag) < 0)) {
      setFout("Bedrag per maand moet 0 of hoger zijn.");
      return;
    }

    onWijzig([
      ...items,
      {
        naam: naam.trim(),
        target_bedrag: Number(targetBedrag),
        maandelijks_bedrag: maandelijksBedrag ? Number(maandelijksBedrag) : 0,
        prioriteit: items.length,
      },
    ]);
    setNaam("");
    setTargetBedrag("");
    setMaandelijksBedrag("");
  }

  return (
    <div>
      <h3 className="font-bold mb-1">Spaardoelen</h3>
      <p className="text-sm text-tekst-secundair mb-3">
        Prioriteit volgt automatisch de invoervolgorde — later versleepbaar op het dashboard.
      </p>

      <ul className="space-y-2 mb-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between rounded-xl border border-rand p-3">
            <span>
              {i + 1}. {item.naam}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold">
                €{item.target_bedrag.toFixed(2)}{" "}
                <span className="text-tekst-secundary font-normal">(€{item.maandelijks_bedrag.toFixed(2)}/mnd)</span>
              </span>
              <button
                type="button"
                onClick={() => onWijzig(items.filter((_, idx) => idx !== i))}
                className="min-h-[36px] px-2 text-tekst-secundair hover:text-tekort"
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-rand p-3">
        <div>
          <label className="veld-label">Naam</label>
          <input className="veld-input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bv. Goud" />
        </div>
        <div>
          <label className="veld-label">Doelbedrag (€)</label>
          <input
            className="veld-input"
            type="number"
            inputMode="decimal"
            value={targetBedrag}
            onChange={(e) => setTargetBedrag(e.target.value)}
          />
        </div>
        <div>
          <label className="veld-label">Bedrag per maand (€, optioneel)</label>
          <input
            className="veld-input"
            type="number"
            inputMode="decimal"
            value={maandelijksBedrag}
            onChange={(e) => setMaandelijksBedrag(e.target.value)}
          />
        </div>
        <button type="button" className="knop-secundair" onClick={voegToe}>
          + Toevoegen
        </button>
      </div>

      {fout && <p className="veld-fout mt-3">{fout}</p>}
    </div>
  );
}
