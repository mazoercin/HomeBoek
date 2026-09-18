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
    <div className="inline-flex gap-1 overflow-x-auto p-1 -mx-4 px-4 md:mx-0 md:px-1 bg-white rounded-full border border-rand/70 shadow-card">
      {OPTIES.map((optie) => (
        <button
          key={optie.waarde}
          type="button"
          onClick={() => onWijzig(optie.waarde)}
          className={`shrink-0 min-h-[38px] px-5 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 ${
            waarde === optie.waarde
              ? "bg-gradient-primair text-white shadow-sm"
              : "text-tekst-secundair hover:bg-slate-50"
          }`}
        >
          {optie.label}
        </button>
      ))}
    </div>
  );
}
