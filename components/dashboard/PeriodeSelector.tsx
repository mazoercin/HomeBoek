"use client";

export type Periode = 1 | 3 | 6 | 12;

const OPTIES: { waarde: Periode; label: string }[] = [
  { waarde: 1, label: "1M" },
  { waarde: 3, label: "3M" },
  { waarde: 6, label: "6M" },
  { waarde: 12, label: "1J" },
];

/** Altijd zichtbaar zonder scrollen — horizontaal scrollbare pill-rij op smalle schermen. */
export function PeriodeSelector({ waarde, onWijzig }: { waarde: Periode; onWijzig: (p: Periode) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
      {OPTIES.map((optie) => (
        <button
          key={optie.waarde}
          type="button"
          onClick={() => onWijzig(optie.waarde)}
          className={`shrink-0 min-h-[44px] px-5 rounded-full font-bold transition active:scale-95 ${
            waarde === optie.waarde
              ? "bg-primair text-white"
              : "bg-white text-tekst-secundair border border-rand"
          }`}
        >
          {optie.label}
        </button>
      ))}
    </div>
  );
}
