"use client";

import { useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { ExtraUitgave } from "@/types/database";
import { simuleerWatAls } from "@/lib/calculations/watAls";
import { Switch } from "@/components/ui/Switch";

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
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} color="#6366F1" strokeWidth={2.25} />
        <h2 className="text-lg font-bold tracking-tight">Wat als?</h2>
      </div>
      <p className="text-tekst-secundair text-sm mb-4">
        Zet uitgaven uit om te zien wat het je deze maand oplevert.
      </p>

      {beschikbaar.length === 0 ? (
        <p className="text-tekst-secundair text-sm">Geen overslaanbare uitgaven beschikbaar.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {beschikbaar.map((uitgave) => (
            <li key={uitgave.id}>
              <div className="flex items-center gap-3 min-h-[44px] rounded-xl border border-rand/70 px-3 py-1">
                <span className="flex-1 font-medium text-tekst-primair">{uitgave.label}</span>
                <span className="font-bold text-tekst-secundair tabular-nums text-sm">€{uitgave.bedrag.toFixed(2)}</span>
                <Switch
                  aan={aangevinkt.includes(uitgave.id)}
                  label={`${uitgave.label} niet deze maand`}
                  kleurAan="primair"
                  onWijzig={() => toggle(uitgave.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {aangevinkt.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-succes-bg to-white border border-succes/20 p-4 mb-4 animate-fade-in">
          <p className="text-sm text-tekst-secundair">Als je deze pauzeert:</p>
          <p className="text-2xl font-extrabold text-succes tabular-nums">
            €{resultaat.nieuwSaldo.toFixed(2)}{" "}
            <span className="text-sm font-medium text-tekst-secundair">
              over (bespaart €{resultaat.besparing.toFixed(2)})
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
