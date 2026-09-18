"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  stapNummer: number;
  titel: string;
  uitleg: string;
  voorbeeld: string;
}

/**
 * Vriendelijke inline-tutorial: toont per leeg dashboardkader een
 * genummerde stap met uitleg + concreet voorbeeld, zodat iemand die
 * net heeft ingelogd meteen weet wat te doen — zonder een aparte
 * onboarding-flow te moeten doorlopen. "Negeren" onthoudt de keuze
 * per browser (localStorage) zodat de tip niet blijft terugkomen,
 * maar duikt vanzelf weer op zodra het kader écht leeg is op een
 * nieuw toestel/na het wissen van alle data.
 */
export function StapTip({ stapNummer, titel, uitleg, voorbeeld }: Props) {
  const sleutel = `saldo_tip_genegeerd_${stapNummer}`;
  const [genegeerd, setGenegeerd] = useState(true); // pas na mount tonen, voorkomt flits

  useEffect(() => {
    try {
      setGenegeerd(localStorage.getItem(sleutel) === "1");
    } catch {
      setGenegeerd(false); // geen localStorage beschikbaar — toon de tip gewoon
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function negeer() {
    setGenegeerd(true);
    try {
      localStorage.setItem(sleutel, "1");
    } catch {
      // per-viewer gemak — geen probleem als dit niet lukt (privénavigatie, ...)
    }
  }

  if (genegeerd) return null;

  return (
    <div className="rounded-xl border border-primair/20 bg-primair-light p-4 mb-3 animate-fade-in relative">
      <button
        type="button"
        aria-label="Tip negeren"
        onClick={negeer}
        className="absolute top-2.5 right-2.5 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-full text-primair/50 hover:text-primair hover:bg-white/60 transition"
      >
        <X size={15} strokeWidth={2.5} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primair text-white text-xs font-extrabold shrink-0">
          {stapNummer}
        </span>
        <div>
          <p className="font-semibold text-primair-dark text-sm">{titel}</p>
          <p className="text-sm text-tekst-primair/80 mt-0.5">{uitleg}</p>
          <p className="text-xs text-tekst-secundair mt-1.5 italic">Bijvoorbeeld: {voorbeeld}</p>
        </div>
      </div>
    </div>
  );
}
