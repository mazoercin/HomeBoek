"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

export function ToonMeerKnop({
  uitgeklapt,
  aantalVerborgen,
  onKlik,
}: {
  uitgeklapt: boolean;
  aantalVerborgen: number;
  onKlik: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onKlik}
      className="w-full flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl text-sm font-semibold text-primair hover:bg-primair-light transition mb-2"
    >
      {uitgeklapt ? (
        <>
          <ChevronUp size={16} strokeWidth={2.5} /> Toon minder
        </>
      ) : (
        <>
          <ChevronDown size={16} strokeWidth={2.5} /> Toon {aantalVerborgen} meer
        </>
      )}
    </button>
  );
}
