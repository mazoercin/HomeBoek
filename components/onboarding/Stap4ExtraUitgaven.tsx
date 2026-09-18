"use client";

import { useState } from "react";
import type { OnboardingExtraUitgave } from "@/lib/data/onboarding";
import { valideerVerplichteTekst, valideerPositiefBedrag } from "@/lib/validatie";

interface Props {
  items: OnboardingExtraUitgave[];
  onWijzig: (items: OnboardingExtraUitgave[]) => void;
  fout: string | null;
  setFout: (fout: string | null) => void;
}

export function Stap4ExtraUitgaven({ items, onWijzig, fout, setFout }: Props) {
  const [label, setLabel] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [overslaanbaar, setOverslaanbaar] = useState(true);

  function voegToe() {
    setFout(null);
    const tekstFout = valideerVerplichteTekst(label, "Label");
    if (tekstFout) return setFout(tekstFout);
    const bedragFout = valideerPositiefBedrag(Number(bedrag), "Bedrag");
    if (bedragFout) return setFout(bedragFout);

    onWijzig([...items, { label: label.trim(), bedrag: Number(bedrag), overslaanbaar }]);
    setLabel("");
    setBedrag("");
    setOverslaanbaar(true);
  }

  return (
    <div>
      <h3 className="font-bold mb-1">Extra / variabele kosten</h3>
      <p className="text-sm text-tekst-secundair mb-3">
        Pauzeerbare abonnementen en kleine terugkerende uitgaven — deze zijn per definitie flexibel.
      </p>

      <ul className="space-y-2 mb-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between rounded-xl border border-rand p-3">
            <span>
              {item.label}{" "}
              {item.overslaanbaar && (
                <span className="text-xs font-bold text-secundair bg-secundair/10 rounded-full px-2 py-0.5 ml-1">
                  Overslaanbaar
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold">€{item.bedrag.toFixed(2)}</span>
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
          <label className="veld-label">Label</label>
          <input className="veld-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Bv. Kapper" />
        </div>
        <div>
          <label className="veld-label">Bedrag (€)</label>
          <input
            className="veld-input"
            type="number"
            inputMode="decimal"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={overslaanbaar}
            onChange={(e) => setOverslaanbaar(e.target.checked)}
          />
          <span>Overslaanbaar</span>
        </label>
        <button type="button" className="knop-secundair" onClick={voegToe}>
          + Toevoegen
        </button>
      </div>

      {fout && <p className="veld-fout mt-3">{fout}</p>}
    </div>
  );
}
