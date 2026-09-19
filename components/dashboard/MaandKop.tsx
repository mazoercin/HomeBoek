"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarPlus, CalendarDays } from "lucide-react";
import { formatteerMaandNaam } from "@/lib/calculations/maand";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { Switch } from "@/components/ui/Switch";
import { registreerNieuweMaand } from "@/app/(dashboard)/dashboard/actions";

interface Props {
  huidigeMaand: string;
  alleMaanden: string[]; // oplopend gesorteerd
}

/**
 * Toont welke maand je bekijkt, met vorige/volgende-navigatie tussen
 * geregistreerde maanden, een knop naar het jaaroverzicht, en het
 * paneel om een nieuwe maand te registreren (leeg, of gekopieerd van
 * een bestaande maand — alles komt terug op onbetaald/niet-geskipt te
 * staan, zodat je die nieuwe maand meteen kan opvolgen).
 */
export function MaandKop({ huidigeMaand, alleMaanden }: Props) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [nieuweMaand, setNieuweMaand] = useState(huidigeMaand);
  const [kopieren, setKopieren] = useState(true);
  const [isPending, startTransition] = useTransition();

  const index = alleMaanden.indexOf(huidigeMaand);
  const vorige = index > 0 ? alleMaanden[index - 1] : null;
  const volgende = index >= 0 && index < alleMaanden.length - 1 ? alleMaanden[index + 1] : null;

  function submit() {
    setFout(null);
    if (!/^\d{4}-\d{2}$/.test(nieuweMaand)) {
      setFout("Kies een geldige maand.");
      return;
    }
    if (alleMaanden.includes(nieuweMaand)) {
      setFout(`${formatteerMaandNaam(nieuweMaand)} bestaat al.`);
      return;
    }
    startTransition(async () => {
      await registreerNieuweMaand(nieuweMaand, kopieren ? huidigeMaand : null);
    });
  }

  return (
    <div className="kaart">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={vorige ? `/dashboard/${vorige}` : "#"}
            aria-disabled={!vorige}
            className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full transition ${
              vorige
                ? "text-tekst-secundair hover:text-primair hover:bg-primair-light"
                : "text-slate-300 dark:text-slate-700 pointer-events-none"
            }`}
          >
            <ChevronLeft size={18} strokeWidth={2.25} />
          </Link>
          <h2 className="text-lg font-bold tracking-tight min-w-[9rem] text-center">
            {formatteerMaandNaam(huidigeMaand)}
          </h2>
          <Link
            href={volgende ? `/dashboard/${volgende}` : "#"}
            aria-disabled={!volgende}
            className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full transition ${
              volgende
                ? "text-tekst-secundair hover:text-primair hover:bg-primair-light"
                : "text-slate-300 dark:text-slate-700 pointer-events-none"
            }`}
          >
            <ChevronRight size={18} strokeWidth={2.25} />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/overzicht" className="knop-secundair !min-h-[38px] !px-4 !text-sm gap-1.5">
            <CalendarDays size={16} strokeWidth={2.25} /> Overzicht
          </Link>
          <button
            type="button"
            className="knop-primair !min-h-[38px] !px-4 !text-sm gap-1.5"
            onClick={() => {
              setNieuweMaand(huidigeMaand);
              setOpen((v) => !v);
            }}
          >
            <CalendarPlus size={16} strokeWidth={2.25} /> Nieuwe maand registreren
          </button>
        </div>
      </div>

      <Uitklapbaar open={open}>
        <div className="border-t border-rand pt-4 mt-4 space-y-3">
          <p className="text-sm text-tekst-secundair">
            Kies een maand om te beginnen opvolgen — bijvoorbeeld een vorige maand als historiek, of de volgende
            maand om nu al vooruit te plannen.
          </p>
          <div>
            <label className="veld-label" htmlFor="nieuwe-maand-invoer">
              Maand
            </label>
            <input
              id="nieuwe-maand-invoer"
              type="month"
              value={nieuweMaand}
              onChange={(e) => setNieuweMaand(e.target.value)}
              className="veld-input"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-tekst-primair">
                Kopieer gegevens van {formatteerMaandNaam(huidigeMaand)}
              </p>
              <p className="text-xs text-tekst-secundair mt-0.5">
                Inkomen, vaste kosten, facturen en extra uitgaven worden overgenomen — alles opnieuw onbetaald en
                niet-geskipt, zodat je die nieuwe maand vers kan opvolgen. Zonder kopiëren begin je met een lege
                maand.
              </p>
            </div>
            <Switch aan={kopieren} onWijzig={() => setKopieren((v) => !v)} label="Kopieer gegevens van vorige maand" />
          </div>
          {fout && <p className="veld-fout">{fout}</p>}
          <div className="flex gap-2">
            <button type="button" className="knop-primair flex-1" disabled={isPending} onClick={submit}>
              {isPending ? "Bezig…" : "Registreren"}
            </button>
            <button type="button" className="knop-secundair" onClick={() => setOpen(false)}>
              Annuleren
            </button>
          </div>
        </div>
      </Uitklapbaar>
    </div>
  );
}
