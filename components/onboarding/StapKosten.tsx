"use client";

import { useState } from "react";
import type { Categorie } from "@/types/database";
import { CATEGORIE_INFO } from "@/types/database";
import type { OnboardingKost } from "@/lib/data/onboarding";
import { valideerVerplichteTekst, valideerPositiefBedrag } from "@/lib/validatie";

const CATEGORIEEN = Object.keys(CATEGORIE_INFO) as Categorie[];

interface Props {
  titel: string;
  toelichting: string;
  items: OnboardingKost[];
  onWijzig: (items: OnboardingKost[]) => void;
  fout: string | null;
  setFout: (fout: string | null) => void;
}

/** Gedeeld tussen stap 2 (vaste kosten) en stap 3 (facturen) — zelfde structuur. */
export function StapKosten({ titel, toelichting, items, onWijzig, fout, setFout }: Props) {
  const [label, setLabel] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [categorie, setCategorie] = useState<Categorie>("andere");
  const [vervaldag, setVervaldag] = useState("");
  const [eindDatum, setEindDatum] = useState("");

  function voegToe() {
    setFout(null);
    const tekstFout = valideerVerplichteTekst(label, "Label");
    if (tekstFout) return setFout(tekstFout);
    const bedragFout = valideerPositiefBedrag(Number(bedrag), "Bedrag");
    if (bedragFout) return setFout(bedragFout);

    const vervaldagGetal = vervaldag ? Number(vervaldag) : null;
    if (vervaldagGetal !== null && (vervaldagGetal < 1 || vervaldagGetal > 31)) {
      setFout("Vervaldag moet tussen 1 en 31 liggen.");
      return;
    }

    onWijzig([
      ...items,
      {
        label: label.trim(),
        bedrag: Number(bedrag),
        categorie,
        icoon: CATEGORIE_INFO[categorie].icoon,
        vervaldag: vervaldagGetal,
        eind_datum: eindDatum || null,
      },
    ]);
    setLabel("");
    setBedrag("");
    setVervaldag("");
    setEindDatum("");
  }

  return (
    <div>
      <h3 className="font-bold mb-1">{titel}</h3>
      <p className="text-sm text-tekst-secundair mb-3">{toelichting}</p>

      <ul className="space-y-2 mb-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between rounded-xl border border-rand p-3">
            <span>
              <span aria-hidden>{item.icoon}</span> {item.label}
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
          <input className="veld-input" value={label} onChange={(e) => setLabel(e.target.value)} />
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
        <div>
          <label className="veld-label">Categorie</label>
          <select className="veld-input" value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)}>
            {CATEGORIEEN.map((c) => (
              <option key={c} value={c}>
                {CATEGORIE_INFO[c].icoon} {CATEGORIE_INFO[c].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="veld-label">Vervaldag (optioneel)</label>
          <input
            className="veld-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={vervaldag}
            onChange={(e) => setVervaldag(e.target.value)}
          />
        </div>
        <div>
          <label className="veld-label">Einddatum (optioneel)</label>
          <input className="veld-input" type="date" value={eindDatum} onChange={(e) => setEindDatum(e.target.value)} />
        </div>
        <button type="button" className="knop-secundair" onClick={voegToe}>
          + Toevoegen
        </button>
      </div>

      {fout && <p className="veld-fout mt-3">{fout}</p>}
    </div>
  );
}
