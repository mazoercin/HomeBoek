import { useEffect, useRef, useState } from "react";
import { TrendingUp, Wallet, CircleCheck, CircleAlert, UtensilsCrossed } from "lucide-react";

/** Korte, subtiele "pulse" (<200ms) telkens `waarde` wijzigt — bv. na het optimistisch toevoegen van een extra kost. */
function useKortePulse(waarde: number): boolean {
  const vorige = useRef(waarde);
  const [pulseren, setPulseren] = useState(false);

  useEffect(() => {
    if (vorige.current === waarde) return;
    vorige.current = waarde;
    setPulseren(true);
    const tijdje = setTimeout(() => setPulseren(false), 180);
    return () => clearTimeout(tijdje);
  }, [waarde]);

  return pulseren;
}

interface Props {
  totaalInkomen: number;
  openstaandBedrag: number;
  watOverblijft: number;
  /** Van de vaste kosten + facturen van deze maand: hoeveel staat al op "betaald". */
  betaaldHuidigeMaand: number;
  /** Van de vaste kosten + facturen van deze maand: hoeveel staat nog op "onbetaald". */
  nogTeBetalenHuidigeMaand: number;
  /**
   * Apart budget, los van "geld" — enkel getoond zodra er deze maand
   * iets ontvangen of besteed is, anders staat dit blok maar in de weg
   * voor huishoudens die geen maaltijdcheques gebruiken.
   */
  maaltijdcheques?: { ontvangen: number; besteed: number; over: number } | null;
}

/** Rij 1: de kernkaarten — inkomen, openstaand, wat overblijft (groen/rood), en optioneel maaltijdcheques. */
export function SamenvattingKaarten({
  totaalInkomen,
  openstaandBedrag,
  watOverblijft,
  betaaldHuidigeMaand,
  nogTeBetalenHuidigeMaand,
  maaltijdcheques,
}: Props) {
  const positief = watOverblijft >= 0;
  const openstaandPulseert = useKortePulse(openstaandBedrag);
  const watOverblijftPulseert = useKortePulse(watOverblijft);
  const toonMaaltijdcheques = !!maaltijdcheques && (maaltijdcheques.ontvangen !== 0 || maaltijdcheques.besteed !== 0);
  const maaltijdchequesPositief = (maaltijdcheques?.over ?? 0) >= 0;
  const maaltijdchequesOverPulseert = useKortePulse(maaltijdcheques?.over ?? 0);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 ${toonMaaltijdcheques ? "lg:grid-cols-4" : ""} gap-4 lg:gap-5`}>
      <div className="kaart animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center rounded-full h-9 w-9 bg-primair-light">
            <TrendingUp size={17} color="#4F46E5" strokeWidth={2.25} />
          </span>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-tekst-secundair">Totaal inkomen</p>
        </div>
        <p data-testid="samenvatting-totaalinkomen" className="text-3xl font-extrabold text-tekst-primair tabular-nums tracking-tight">
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
        <p
          data-testid="samenvatting-openstaand"
          className={`text-3xl font-extrabold text-tekst-primair tabular-nums tracking-tight origin-left transition-transform duration-150 motion-reduce:transition-none ${
            openstaandPulseert ? "scale-105" : "scale-100"
          }`}
        >
          €{openstaandBedrag.toFixed(2)}
        </p>
        {openstaandBedrag === 0 ? (
          <a href="#uitgaven-vast" className="text-xs font-semibold text-primair hover:underline mt-1.5 inline-block">
            Vul in bij Vaste kosten →
          </a>
        ) : (
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-succes">
              <span className="h-1.5 w-1.5 rounded-full bg-succes" /> Betaald €{betaaldHuidigeMaand.toFixed(2)}
            </span>
            <span className="flex items-center gap-1 font-semibold text-tekst-secundair">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Nog te betalen €{nogTeBetalenHuidigeMaand.toFixed(2)}
            </span>
          </div>
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
        <p
          data-testid="samenvatting-watoverblijft"
          className={`text-3xl font-extrabold tabular-nums tracking-tight origin-left transition-transform duration-150 motion-reduce:transition-none ${
            positief ? "text-succes" : "text-tekort"
          } ${watOverblijftPulseert ? "scale-105" : "scale-100"}`}
        >
          €{watOverblijft.toFixed(2)}
        </p>
        <p className={`text-xs font-semibold mt-1 ${positief ? "text-succes" : "text-tekort"}`}>
          {positief ? "Op schema" : "Tekort deze maand"}
        </p>
      </div>

      {toonMaaltijdcheques && maaltijdcheques && (
        <div className="kaart animate-fade-in-up [animation-delay:180ms]">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center rounded-full h-9 w-9 bg-succes-bg">
              <UtensilsCrossed size={17} color="#10B981" strokeWidth={2.25} />
            </span>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-tekst-secundair">Maaltijdcheques</p>
          </div>
          <p
            data-testid="samenvatting-maaltijdcheques-over"
            className={`text-3xl font-extrabold tabular-nums tracking-tight origin-left transition-transform duration-150 motion-reduce:transition-none ${
              maaltijdchequesPositief ? "text-succes" : "text-tekort"
            } ${maaltijdchequesOverPulseert ? "scale-105" : "scale-100"}`}
          >
            €{maaltijdcheques.over.toFixed(2)}
          </p>
          <p className="text-xs font-semibold mt-1 text-tekst-secundair">
            {maaltijdchequesPositief ? "Nog over" : "Meer besteed dan ontvangen"}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-tekst-secundair">
              <span className="h-1.5 w-1.5 rounded-full bg-succes" /> Ontvangen €{maaltijdcheques.ontvangen.toFixed(2)}
            </span>
            <span className="flex items-center gap-1 font-semibold text-tekst-secundair">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Besteed €{maaltijdcheques.besteed.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
