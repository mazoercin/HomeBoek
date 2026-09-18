"use client";

import { useMemo, useState, useTransition } from "react";
import type { ExtraUitgave } from "@/types/database";
import { simuleerWatAls } from "@/lib/calculations/watAls";

interface Props {
  overslaanbareUitgaven: ExtraUitgave[];
  geskipteIds: string[];
  huidigWatOverblijft: number;
  maand: string;
  onToepassen: (ids: string[], maand: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/** Rij 3 + 4: live "wat als?"-simulatie, puur client-side tot expliciet toegepast. */
export function WatAlsKader({
  overslaanbareUitgaven,
  geskipteIds,
  huidigWatOverblijft,
  maand,
  onToepassen,
}: Props) {
  const [aangevinkt, setAangevinkt] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);

  const resultaat = useMemo(
    () => simuleerWatAls(huidigWatOverblijft, overslaanbareUitgaven, aangevinkt),
    [huidigWatOverblijft, overslaanbareUitgaven, aangevinkt]
  );

  function toggle(id: string) {
    setAangevinkt((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toepassen() {
    setFout(null);
    startTransition(async () => {
      const res = await onToepassen(aangevinkt, maand);
      if (res.gelukt) setAangevinkt([]);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  const beschikbaar = overslaanbareUitgaven.filter((u) => !geskipteIds.includes(u.id));

  return (
    <div className="kaart">
      <h2 className="text-lg font-bold mb-1">Wat als?</h2>
      <p className="text-tekst-secundair text-sm mb-3">
        Vink uitgaven aan om te zien wat het je deze maand oplevert.
      </p>

      {beschikbaar.length === 0 ? (
        <p className="text-tekst-secundair text-sm">Geen overslaanbare uitgaven beschikbaar.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {beschikbaar.map((uitgave) => (
            <li key={uitgave.id}>
              <label className="flex items-center gap-3 min-h-[44px] rounded-xl border border-rand px-3">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={aangevinkt.includes(uitgave.id)}
                  onChange={() => toggle(uitgave.id)}
                />
                <span className="flex-1">{uitgave.label} niet deze maand</span>
                <span className="font-bold text-tekst-secundair">€{uitgave.bedrag.toFixed(2)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {aangevinkt.length > 0 && (
        <div className="rounded-xl bg-succes-bg p-3 mb-3">
          <p className="text-sm text-tekst-secundair">Als je deze pauzeert:</p>
          <p className="text-xl font-extrabold text-succes">
            €{resultaat.nieuwSaldo.toFixed(2)} over{" "}
            <span className="text-sm font-normal text-tekst-secundair">
              (bespaart €{resultaat.besparing.toFixed(2)})
            </span>
          </p>
        </div>
      )}

      {fout && <p className="veld-fout mb-2">{fout}</p>}

      <button
        type="button"
        className="knop-primair w-full"
        disabled={aangevinkt.length === 0 || isPending}
        onClick={toepassen}
      >
        Toepassen
      </button>
    </div>
  );
}
