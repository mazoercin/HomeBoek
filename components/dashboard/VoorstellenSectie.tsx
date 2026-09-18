"use client";

import { useTransition } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { Voorstel } from "@/lib/calculations/types";

interface Props {
  voorstellen: Voorstel[];
  maand: string;
  onSkipToepassen: (ids: string[], maand: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onDoelPauzeren: (id: string, gepauzeerd: boolean) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/** Rij 6: enkel zichtbaar bij rood saldo. Klikbare voorstellen vs. cursieve, niet-klikbare tips. */
export function VoorstellenSectie({ voorstellen, maand, onSkipToepassen, onDoelPauzeren }: Props) {
  const [isPending, startTransition] = useTransition();

  if (voorstellen.length === 0) return null;

  function toepassen(voorstel: Voorstel) {
    if (!voorstel.itemId) return;
    startTransition(() => {
      if (voorstel.type === "pauzeer_uitgave") {
        onSkipToepassen([voorstel.itemId!], maand);
      } else if (voorstel.type === "pauzeer_doel") {
        onDoelPauzeren(voorstel.itemId!, true);
      }
    });
  }

  return (
    <div className="kaart border-2 border-tekort/15 bg-gradient-to-br from-tekort-bg to-white animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={18} color="#F43F5E" strokeWidth={2.25} />
        <h2 className="text-lg font-bold tracking-tight text-tekort">Voorstellen bij tekort</h2>
      </div>
      <p className="text-tekst-secundair text-sm mb-4">Je zit deze maand in het rood. Hier zijn wat opties.</p>

      <ul className="space-y-2">
        {voorstellen.map((v, i) => (
          <li
            key={`${v.type}-${v.itemId ?? i}`}
            className={`rounded-xl border p-3 ${
              v.type === "informatief"
                ? "italic text-tekst-secundair border-rand/60 bg-slate-50/60"
                : "border-rand/70 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              {v.type === "informatief" && <Info size={16} className="shrink-0 text-tekst-secundair" strokeWidth={2} />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold not-italic text-tekst-primair truncate">{v.titel}</p>
                <p className="text-sm truncate">{v.toelichting}</p>
              </div>
              {v.type !== "informatief" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toepassen(v)}
                  className="knop-secundair shrink-0 min-h-[40px] px-4 text-sm"
                >
                  Toepassen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
