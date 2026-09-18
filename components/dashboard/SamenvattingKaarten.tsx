interface Props {
  totaalInkomen: number;
  openstaandBedrag: number;
  watOverblijft: number;
}

/** Rij 1: de drie kernkaarten — inkomen, openstaand, en wat overblijft (groen/rood). */
export function SamenvattingKaarten({ totaalInkomen, openstaandBedrag, watOverblijft }: Props) {
  const positief = watOverblijft >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="kaart">
        <p className="veld-label mb-1">Totaal inkomen</p>
        <p className="text-2xl font-extrabold text-primair">€{totaalInkomen.toFixed(2)}</p>
      </div>
      <div className="kaart">
        <p className="veld-label mb-1">Openstaand bedrag</p>
        <p className="text-2xl font-extrabold text-tekst-primair">€{openstaandBedrag.toFixed(2)}</p>
      </div>
      <div className={`kaart ${positief ? "bg-succes-bg" : "bg-tekort-bg"}`}>
        <p className="veld-label mb-1">Wat overblijft</p>
        <p className={`text-2xl font-extrabold ${positief ? "text-succes" : "text-tekort"}`}>
          €{watOverblijft.toFixed(2)}
        </p>
        <p className="text-sm mt-1">{positief ? "🟢 Op schema" : "🔴 Tekort"}</p>
      </div>
    </div>
  );
}
