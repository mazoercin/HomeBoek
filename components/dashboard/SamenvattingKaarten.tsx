import { TrendingUp, Wallet, CircleCheck, CircleAlert } from "lucide-react";

interface Props {
  totaalInkomen: number;
  openstaandBedrag: number;
  watOverblijft: number;
}

/** Rij 1: de drie kernkaarten — inkomen, openstaand, en wat overblijft (groen/rood). */
export function SamenvattingKaarten({ totaalInkomen, openstaandBedrag, watOverblijft }: Props) {
  const positief = watOverblijft >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
      <div className="kaart animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center rounded-full h-9 w-9 bg-primair-light">
            <TrendingUp size={17} color="#4F46E5" strokeWidth={2.25} />
          </span>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-tekst-secundair">Totaal inkomen</p>
        </div>
        <p className="text-3xl font-extrabold text-tekst-primair tabular-nums tracking-tight">
          €{totaalInkomen.toFixed(2)}
        </p>
        {totaalInkomen === 0 && (
          <a href="#inkomen" className="text-xs font-semibold text-primair hover:underline mt-1.5 inline-block">
            Vul in bij Vast inkomen →
          </a>
        )}
      </div>

      <div className="kaart animate-fade-in-up [animation-delay:60ms]">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center rounded-full h-9 w-9 bg-slate-100">
            <Wallet size={17} color="#475569" strokeWidth={2.25} />
          </span>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-tekst-secundair">Openstaand bedrag</p>
        </div>
        <p className="text-3xl font-extrabold text-tekst-primair tabular-nums tracking-tight">
          €{openstaandBedrag.toFixed(2)}
        </p>
        {openstaandBedrag === 0 && (
          <a href="#uitgaven-vast" className="text-xs font-semibold text-primair hover:underline mt-1.5 inline-block">
            Vul in bij Vaste kosten →
          </a>
        )}
      </div>

      <div
        className={`kaart animate-fade-in-up [animation-delay:120ms] ${
          positief ? "bg-gradient-to-br from-succes-bg to-white" : "bg-gradient-to-br from-tekort-bg to-white"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center justify-center rounded-full h-9 w-9 ${
              positief ? "bg-succes/15" : "bg-tekort/15"
            }`}
          >
            {positief ? (
              <CircleCheck size={17} color="#10B981" strokeWidth={2.25} />
            ) : (
              <CircleAlert size={17} color="#F43F5E" strokeWidth={2.25} />
            )}
          </span>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-tekst-secundair">Wat overblijft</p>
        </div>
        <p className={`text-3xl font-extrabold tabular-nums tracking-tight ${positief ? "text-succes" : "text-tekort"}`}>
          €{watOverblijft.toFixed(2)}
        </p>
        <p className={`text-xs font-semibold mt-1 ${positief ? "text-succes" : "text-tekort"}`}>
          {positief ? "Op schema" : "Tekort deze maand"}
        </p>
      </div>
    </div>
  );
}
