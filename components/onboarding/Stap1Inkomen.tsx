"use client";

import { useState } from "react";
import type { InkomenBron, FlexibelInterval } from "@/types/database";
import type { OnboardingVastInkomen, OnboardingFlexibelInkomen } from "@/lib/data/onboarding";
import { valideerVerplichteTekst, valideerPositiefBedrag } from "@/lib/validatie";

const BRONNEN: { waarde: InkomenBron; label: string }[] = [
  { waarde: "zelf", label: "Zelf" },
  { waarde: "partner", label: "Partner" },
  { waarde: "ander", label: "Ander" },
];

const INTERVALLEN: { waarde: FlexibelInterval; label: string }[] = [
  { waarde: "maandelijks", label: "Maandelijks" },
  { waarde: "2-maandelijks", label: "Om de 2 maanden" },
  { waarde: "3-maandelijks", label: "Om de 3 maanden" },
  { waarde: "halfjaarlijks", label: "Halfjaarlijks" },
  { waarde: "jaarlijks", label: "Jaarlijks" },
];

interface Props {
  vastInkomen: OnboardingVastInkomen[];
  flexibelInkomen: OnboardingFlexibelInkomen[];
  onWijzigVast: (items: OnboardingVastInkomen[]) => void;
  onWijzigFlexibel: (items: OnboardingFlexibelInkomen[]) => void;
  fout: string | null;
  setFout: (fout: string | null) => void;
}

export function Stap1Inkomen({ vastInkomen, flexibelInkomen, onWijzigVast, onWijzigFlexibel, fout, setFout }: Props) {
  const [bron, setBron] = useState<InkomenBron>("zelf");
  const [label, setLabel] = useState("");
  const [bedrag, setBedrag] = useState("");

  const [fBron, setFBron] = useState<InkomenBron>("zelf");
  const [fLabel, setFLabel] = useState("");
  const [fBedrag, setFBedrag] = useState("");
  const [fInterval, setFInterval] = useState<FlexibelInterval>("3-maandelijks");
  const [fDatum, setFDatum] = useState("");

  function voegVastToe() {
    setFout(null);
    const tekstFout = valideerVerplichteTekst(label, "Label");
    if (tekstFout) return setFout(tekstFout);
    const bedragFout = valideerPositiefBedrag(Number(bedrag), "Bedrag");
    if (bedragFout) return setFout(bedragFout);

    onWijzigVast([...vastInkomen, { bron, label: label.trim(), bedrag: Number(bedrag) }]);
    setLabel("");
    setBedrag("");
  }

  function voegFlexibelToe() {
    setFout(null);
    if (!fLabel.trim() || !fBedrag || !fDatum) {
      setFout("Vul alle velden voor flexibel inkomen in, of laat deze sectie helemaal leeg.");
      return;
    }
    const bedragFout = valideerPositiefBedrag(Number(fBedrag), "Bedrag");
    if (bedragFout) return setFout(bedragFout);

    onWijzigFlexibel([
      ...flexibelInkomen,
      { bron: fBron, label: fLabel.trim(), bedrag: Number(fBedrag), interval: fInterval, volgende_datum: fDatum },
    ]);
    setFLabel("");
    setFBedrag("");
    setFDatum("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold mb-3">Vast inkomen per bron</h3>
        <p className="text-sm text-tekst-secundair mb-3">Minstens 1 bron is verplicht.</p>

        <ul className="space-y-2 mb-3">
          {vastInkomen.map((item, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-rand p-3">
              <span>
                {item.label} <span className="text-tekst-secundair capitalize">({item.bron})</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold">€{item.bedrag.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => onWijzigVast(vastInkomen.filter((_, idx) => idx !== i))}
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
            <label className="veld-label">Bron</label>
            <select className="veld-input" value={bron} onChange={(e) => setBron(e.target.value as InkomenBron)}>
              {BRONNEN.map((b) => (
                <option key={b.waarde} value={b.waarde}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="veld-label">Label</label>
            <input className="veld-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Bv. Loon" />
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
          <button type="button" className="knop-secundair" onClick={voegVastToe}>
            + Toevoegen
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-1">Terugkerend, niet-maandelijks inkomen</h3>
        <p className="text-sm text-tekst-secundair mb-3">Optioneel — mag leeg blijven.</p>

        <ul className="space-y-2 mb-3">
          {flexibelInkomen.map((item, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-rand p-3">
              <span>
                {item.label} <span className="text-tekst-secundair">({item.interval})</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold">€{item.bedrag.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => onWijzigFlexibel(flexibelInkomen.filter((_, idx) => idx !== i))}
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
            <label className="veld-label">Bron</label>
            <select className="veld-input" value={fBron} onChange={(e) => setFBron(e.target.value as InkomenBron)}>
              {BRONNEN.map((b) => (
                <option key={b.waarde} value={b.waarde}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="veld-label">Label</label>
            <input className="veld-input" value={fLabel} onChange={(e) => setFLabel(e.target.value)} placeholder="Bv. Premie" />
          </div>
          <div>
            <label className="veld-label">Bedrag (€)</label>
            <input
              className="veld-input"
              type="number"
              inputMode="decimal"
              value={fBedrag}
              onChange={(e) => setFBedrag(e.target.value)}
            />
          </div>
          <div>
            <label className="veld-label">Interval</label>
            <select className="veld-input" value={fInterval} onChange={(e) => setFInterval(e.target.value as FlexibelInterval)}>
              {INTERVALLEN.map((i) => (
                <option key={i.waarde} value={i.waarde}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="veld-label">Volgende verwachte datum</label>
            <input className="veld-input" type="date" value={fDatum} onChange={(e) => setFDatum(e.target.value)} />
          </div>
          <button type="button" className="knop-secundair" onClick={voegFlexibelToe}>
            + Toevoegen
          </button>
        </div>
      </div>

      {fout && <p className="veld-fout">{fout}</p>}
    </div>
  );
}
