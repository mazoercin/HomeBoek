"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

interface Props {
  bericht: string;
  onOngedaanMaken?: () => void;
  onSluiten: () => void;
  duurMs?: number;
}

/** Kort, onopdringerig bevestigingsbericht onderaan met een optionele "Ongedaan maken"-actie. Sluit vanzelf na `duurMs`. */
export function Toast({ bericht, onOngedaanMaken, onSluiten, duurMs = 5000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onSluiten, duurMs);
    return () => clearTimeout(timer);
  }, [onSluiten, duurMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="extra-kost-toast"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
      className="fixed z-40 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)]
        flex items-center gap-3 rounded-full bg-tekst-primair text-white pl-3 pr-2 py-2 shadow-lg
        animate-fade-in-up motion-reduce:animate-none"
    >
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-succes shrink-0">
        <Check size={14} strokeWidth={3} aria-hidden />
      </span>
      <span className="text-sm font-semibold truncate">{bericht}</span>
      {onOngedaanMaken && (
        <button
          type="button"
          onClick={() => {
            onOngedaanMaken();
            onSluiten();
          }}
          className="text-sm font-bold text-primair-light hover:text-white underline underline-offset-2 shrink-0 px-2 py-1 min-h-[32px]"
        >
          Ongedaan maken
        </button>
      )}
    </div>
  );
}
