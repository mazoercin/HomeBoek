"use client";

import { useState, useTransition } from "react";
import { Home, Check } from "lucide-react";

interface Props {
  huidigeNaam: string | null;
  onOpslaan: (naam: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/** Laat de admin een familienaam instellen (bv. "Familie Mazmahor"), getoond bovenaan het dashboard. */
export function FamilienaamKaart({ huidigeNaam, onOpslaan }: Props) {
  const [naam, setNaam] = useState(huidigeNaam ?? "");
  const [fout, setFout] = useState<string | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    setOpgeslagen(false);
    const waarde = String(formData.get("familienaam") ?? "").trim();

    if (!waarde) {
      setFout("Vul een familienaam in.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onOpslaan(waarde);
      if (resultaat.gelukt) {
        setOpgeslagen(true);
        setTimeout(() => setOpgeslagen(false), 2500);
      } else {
        setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
      }
    });
  }

  return (
    <div className="kaart">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primair-light shrink-0">
          <Home size={17} color="#4F46E5" strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight">Familienaam</h2>
          <p className="text-xs text-tekst-secundair">Verschijnt bovenaan het dashboard.</p>
        </div>
      </div>

      <form action={submit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="veld-label" htmlFor="familienaam">
            Naam
          </label>
          <input
            id="familienaam"
            name="familienaam"
            className="veld-input"
            placeholder="Bv. Familie Mazmahor"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="knop-primair gap-1.5 sm:mb-[1px]" disabled={isPending}>
          {opgeslagen ? <Check size={17} strokeWidth={2.5} /> : null}
          {isPending ? "Bezig…" : opgeslagen ? "Opgeslagen" : "Opslaan"}
        </button>
      </form>
      {fout && <p className="veld-fout mt-2">{fout}</p>}
    </div>
  );
}
