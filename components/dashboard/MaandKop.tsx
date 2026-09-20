"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarPlus, CalendarDays, RotateCcw, RefreshCw } from "lucide-react";
import { formatteerMaandNaam, maandSleutel } from "@/lib/calculations/maand";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { Switch } from "@/components/ui/Switch";
import type { RegistreerMaandActie } from "@/types/dashboard-acties";

interface Props {
  huidigeMaand: string;
  alleMaanden: string[]; // oplopend gesorteerd
  onRegistreerMaand: RegistreerMaandActie;
  /** "/dashboard" voor ingelogde gebruikers, "/gast" in gast-modus. */
  basisPad?: string;
  /** Het jaaroverzicht bestaat enkel voor ingelogde huishoudens (multi-maand data uit Supabase). */
  toonOverzicht?: boolean;
}

/**
 * Toont welke maand je bekijkt, met vorige/volgende-navigatie tussen
 * geregistreerde maanden, een knop naar het jaaroverzicht, en het
 * paneel om een nieuwe maand te registreren (leeg, of gekopieerd van
 * een bestaande maand — alles komt terug op onbetaald/niet-geskipt te
 * staan, zodat je die nieuwe maand meteen kan opvolgen).
 *
 * Alle navigatie tussen maanden gebeurt hier bewust met gewone <a>-
 * tags (volledige page-navigatie) i.p.v. next/link: Next.js' client-
 * side navigatiecache bleek na het aanmaken van een maand soms nog een
 * verouderde versie van de doelpagina te tonen. Een echte page-load
 * slaat die cache helemaal over.
 */
export function MaandKop({
  huidigeMaand,
  alleMaanden,
  onRegistreerMaand,
  basisPad = "/dashboard",
  toonOverzicht = true,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [nieuweMaand, setNieuweMaand] = useState(huidigeMaand);
  const [kopieren, setKopieren] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [verversPending, startVervers] = useTransition();
  const [vandaag, setVandaag] = useState<string | null>(null);

  // Pas na mount bepalen (i.p.v. tijdens SSR) om een hydration-mismatch
  // door tijdzoneverschillen tussen server en browser te vermijden.
  useEffect(() => {
    setVandaag(maandSleutel(new Date()));
  }, []);

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
      const res = await onRegistreerMaand(nieuweMaand, kopieren ? huidigeMaand : null);
      if (res.gelukt) {
        window.location.href = `${basisPad}/${nieuweMaand}`;
      } else {
        setFout(res.foutmelding ?? "Kon niet opslaan.");
      }
    });
  }

  return (
    <div className="kaart">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <a
            href={vorige ? `${basisPad}/${vorige}` : undefined}
            aria-disabled={!vorige}
            className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full transition ${
              vorige
                ? "text-tekst-secundair hover:text-primair hover:bg-primair-light"
                : "text-slate-300 dark:text-slate-700 pointer-events-none"
            }`}
          >
            <ChevronLeft size={18} strokeWidth={2.25} />
          </a>
          <h2 className="text-lg font-bold tracking-tight min-w-[9rem] text-center">
            {formatteerMaandNaam(huidigeMaand)}
          </h2>
          <a
            href={volgende ? `${basisPad}/${volgende}` : undefined}
            aria-disabled={!volgende}
            className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full transition ${
              volgende
                ? "text-tekst-secundair hover:text-primair hover:bg-primair-light"
                : "text-slate-300 dark:text-slate-700 pointer-events-none"
            }`}
          >
            <ChevronRight size={18} strokeWidth={2.25} />
          </a>
          {basisPad !== "/gast" && (
            <button
              type="button"
              title="Ververs: haal de nieuwste gegevens op (bv. na een wijziging door een ander gezinslid)"
              aria-label="Ververs dashboard"
              disabled={verversPending}
              onClick={() => startVervers(() => router.refresh())}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-primair hover:bg-primair-light transition disabled:opacity-60"
            >
              <RefreshCw size={16} strokeWidth={2.25} className={verversPending ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {vandaag && vandaag !== huidigeMaand && (
            <a
              href={`${basisPad}/${vandaag}`}
              className="knop-secundair !min-h-[38px] !px-4 !text-sm gap-1.5 whitespace-nowrap flex-1 sm:flex-none justify-center"
            >
              <RotateCcw size={16} strokeWidth={2.25} className="shrink-0" /> Naar huidige maand
            </a>
          )}
          {toonOverzicht && (
            <a
              href="/overzicht"
              className="knop-secundair !min-h-[38px] !px-4 !text-sm gap-1.5 whitespace-nowrap flex-1 sm:flex-none justify-center"
            >
              <CalendarDays size={16} strokeWidth={2.25} className="shrink-0" /> Overzicht
            </a>
          )}
          <button
            type="button"
            className="knop-primair !min-h-[38px] !px-4 !text-sm gap-1.5 whitespace-nowrap flex-1 sm:flex-none justify-center basis-full sm:basis-auto"
            onClick={() => {
              setNieuweMaand(huidigeMaand);
              setOpen((v) => !v);
            }}
          >
            <CalendarPlus size={16} strokeWidth={2.25} className="shrink-0" /> Nieuwe maand registreren
          </button>
        </div>
      </div>

      <Uitklapbaar open={open}>
        <div className="border-t border-rand pt-4 mt-4 space-y-3">
          <p className="text-sm text-tekst-secundair">
            Kies een maand om te beginnen opvolgen: bijvoorbeeld een vorige maand als historiek, of de volgende
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
                Inkomen, vaste kosten, facturen en extra uitgaven worden overgenomen, alles opnieuw onbetaald en
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
