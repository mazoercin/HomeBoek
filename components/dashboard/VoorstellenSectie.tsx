"use client";

import { useTransition } from "react";
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
    <div className="kaart border-2 border-tekort-bg">
      <h2 className="text-lg font-bold mb-1 text-tekort">Voorstellen bij tekort</h2>
      <p className="text-tekst-secundair text-sm mb-3">
        Je zit deze maand in het rood. Hier zijn wat opties.
      </p>

      <ul className="space-y-2">
        {voorstellen.map((v, i) => (
          <li
            key={`${v.type}-${v.itemId ?? i}`}
            className={`rounded-xl border border-rand p-3 ${
              v.type === "informatief" ? "italic text-tekst-secundair" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold truncate">{v.titel}</p>
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
