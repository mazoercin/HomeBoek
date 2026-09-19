"use client";

import { useState, useTransition } from "react";
import { Home, Check } from "lucide-react";

interface Props {
  huidigeNaam: string;
  huidigeCurrency: string;
  kanBewerken: boolean;
  onOpslaan: (naam: string, currency: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

const VALUTA = [
  { code: "EUR", label: "€ Euro" },
  { code: "USD", label: "$ Dollar" },
  { code: "GBP", label: "£ Pond" },
];

/** Gezinsnaam + valuta — enkel de eigenaar kan dit wijzigen (RLS dwingt dit ook af). */
export function HouseholdNaamKaart({ huidigeNaam, huidigeCurrency, kanBewerken, onOpslaan }: Props) {
  const [naam, setNaam] = useState(huidigeNaam);
  const [currency, setCurrency] = useState(huidigeCurrency);
  const [fout, setFout] = useState<string | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    setOpgeslagen(false);
    const waarde = String(formData.get("naam") ?? "").trim();
    const munt = String(formData.get("currency") ?? "EUR");

    if (!waarde) {
      setFout("Vul een naam in.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onOpslaan(waarde, munt);
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
          <h2 className="text-lg font-bold tracking-tight leading-tight">Gezinsnaam</h2>
          <p className="text-xs text-tekst-secundair">Verschijnt bovenaan het dashboard.</p>
        </div>
      </div>

      {kanBewerken ? (
        <form action={submit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="veld-label" htmlFor="naam">
              Naam
            </label>
            <input
              id="naam"
              name="naam"
              className="veld-input"
              placeholder="Bv. Familie Mazmahor"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="veld-label" htmlFor="currency">
              Valuta
            </label>
            <select
              id="currency"
              name="currency"
              className="veld-input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {VALUTA.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="knop-primair gap-1.5 sm:mb-[1px]" disabled={isPending}>
            {opgeslagen ? <Check size={17} strokeWidth={2.5} /> : null}
            {isPending ? "Bezig…" : opgeslagen ? "Opgeslagen" : "Opslaan"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-tekst-secundair">
          <span className="font-semibold text-tekst-primair">{huidigeNaam}</span> — enkel de eigenaar kan dit wijzigen.
        </p>
      )}
      {fout && <p className="veld-fout mt-2">{fout}</p>}
    </div>
  );
}
