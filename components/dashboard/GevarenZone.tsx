"use client";

import { useState, useTransition } from "react";
import { Trash2, TriangleAlert } from "lucide-react";

interface Props {
  onWissen: () => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/** Aantal stap-tips op het dashboard (Inkomen, Vaste kosten, Facturen, Extra uitgaven, Doelen). */
const AANTAL_STAP_TIPS = 5;

/** Wist de "genegeerd"-voorkeur van alle stap-tips, zodat ze na een volledige reset weer verschijnen. */
function verwijderTipVoorkeuren() {
  try {
    for (let i = 1; i <= AANTAL_STAP_TIPS; i++) {
      localStorage.removeItem(`saldo_tip_genegeerd_${i}`);
    }
  } catch {
    // Geen localStorage beschikbaar — niets om te wissen.
  }
}

/**
 * "Alles wissen"-knop onderaan het dashboard: verwijdert alle inkomen-,
 * kosten-, doelen- en goud-data zodat je terug bij een volledig leeg
 * dashboard start (met de stap-tips opnieuw zichtbaar). Bewust een
 * eigen Ja/Nee-bevestigingskaart i.p.v. de kale browser-confirm(), zodat
 * de impact duidelijk is voor een niet-technisch gezinslid.
 */
export function GevarenZone({ onWissen }: Props) {
  const [bevestigOpen, setBevestigOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function bevestig() {
    setFout(null);
    startTransition(async () => {
      const resultaat = await onWissen();
      if (resultaat.gelukt) {
        verwijderTipVoorkeuren();
        // Een volledige herlaad (i.p.v. router.refresh()) zorgt ervoor dat
        // élk dashboardkader écht opnieuw opbouwt en zijn stap-tip dus
        // vers uit (nu lege) localStorage leest — anders blijven al
        // gemonteerde tips die al eerder weggeklikt waren onzichtbaar.
        window.location.reload();
      } else {
        setFout(resultaat.foutmelding ?? "Kon de data niet wissen. Probeer opnieuw.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-tekort/30 p-5 mt-2">
      {!bevestigOpen ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-tekst-primair text-sm">Alle data wissen</p>
            <p className="text-xs text-tekst-secundair mt-0.5">
              Verwijdert al je inkomen, kosten, doelen en goud-inleg. Kan niet ongedaan gemaakt worden.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBevestigOpen(true)}
            className="min-h-[40px] px-4 rounded-full text-sm font-bold text-tekort border border-tekort/30 hover:bg-tekort-bg transition flex items-center gap-1.5"
          >
            <Trash2 size={15} strokeWidth={2.25} /> Alle data wissen
          </button>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-tekort-bg shrink-0">
              <TriangleAlert size={17} color="#F43F5E" strokeWidth={2.25} />
            </span>
            <div>
              <p className="font-bold text-tekst-primair">Weet je het zeker?</p>
              <p className="text-sm text-tekst-secundair mt-0.5">
                Dit wist al je inkomen, vaste kosten, facturen, extra uitgaven, doelen en goud-inleg
                permanent. Je krijgt daarna een volledig leeg dashboard.
              </p>
            </div>
          </div>

          {fout && <p className="veld-fout mt-3">{fout}</p>}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={bevestig}
              className="min-h-[44px] px-6 rounded-full bg-tekort text-white font-bold transition active:scale-[0.97] hover:brightness-105 disabled:opacity-50"
            >
              {isPending ? "Bezig met wissen…" : "Ja, alles wissen"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setBevestigOpen(false)}
              className="knop-secundair"
            >
              Nee, annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
