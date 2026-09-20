"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { parseBedragNaarCents, centsNaarEuro } from "@/lib/calculations/geld";

/**
 * "visa" is geen echte Betaalmethode (zie types/database.ts) — het is
 * een routeringssignaal: de aanroeper (DashboardClient) maakt daar een
 * Factuur van i.p.v. een extra_uitgaven-rij, want dat bedrag moet nog
 * terugbetaald worden aan de kaart.
 */
export type ExtraKostBetaalmethode = "bankkaart" | "visa" | "maaltijdcheque";

export interface ExtraKostInvoer {
  bedrag: number;
  label: string;
  betaalmethode: ExtraKostBetaalmethode;
}

const BETAALMETHODEN: { waarde: ExtraKostBetaalmethode; label: string }[] = [
  { waarde: "bankkaart", label: "Bankkaart" },
  { waarde: "visa", label: "Visa" },
  { waarde: "maaltijdcheque", label: "Maaltijdcheque" },
];

interface Props {
  open: boolean;
  onSluiten: () => void;
  onVoegToe: (invoer: ExtraKostInvoer) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

const FOCUSBARE_ELEMENTEN = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Snel-invoerscherm voor een extra kost — bewust minimaal: enkel bedrag
 * en omschrijving, meteen toevoegen aan de maand die je nu bekijkt. Geen
 * categorie/datum/chips/"nog één" — dat maakte het te ingewikkeld voor
 * wat dit moet zijn: één tik, bedrag intikken, klaar.
 *
 * Bottom sheet op mobiel (`max-sm:`), kleine gecentreerde modal op
 * desktop (`sm:`) — zelfde component, enkel responsive klassen. Focus
 * trap + Escape + klik naast het scherm sluiten, autofocus op het
 * bedrag.
 */
export function ExtraKostSheet({ open, onSluiten, onVoegToe }: Props) {
  const [bedragTekst, setBedragTekst] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [betaalmethode, setBetaalmethode] = useState<ExtraKostBetaalmethode>("bankkaart");
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const paneelRef = useRef<HTMLDivElement>(null);
  const bedragRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Volgende tick, zodat het element al gemonteerd/zichtbaar is.
    const id = requestAnimationFrame(() => bedragRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function opToetsenbord(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onSluiten();
        return;
      }
      if (e.key === "Tab") {
        const paneel = paneelRef.current;
        if (!paneel) return;
        const focusbaar = Array.from(paneel.querySelectorAll<HTMLElement>(FOCUSBARE_ELEMENTEN)).filter(
          (el) => !el.hasAttribute("disabled")
        );
        const eerste = focusbaar[0];
        const laatste = focusbaar[focusbaar.length - 1];
        if (!eerste || !laatste) return;
        if (e.shiftKey && document.activeElement === eerste) {
          e.preventDefault();
          laatste.focus();
        } else if (!e.shiftKey && document.activeElement === laatste) {
          e.preventDefault();
          eerste.focus();
        }
      }
    }

    document.addEventListener("keydown", opToetsenbord);
    return () => document.removeEventListener("keydown", opToetsenbord);
  }, [open, onSluiten]);

  if (!open) return null;

  async function verzend() {
    setFout(null);

    const cents = parseBedragNaarCents(bedragTekst);
    if (cents === null) {
      setFout("Vul een geldig bedrag in (bv. 8,50), groter dan 0, met max. 2 decimalen.");
      return;
    }
    const schoneOmschrijving = omschrijving.trim();
    if (!schoneOmschrijving) {
      setFout("Vul een omschrijving in.");
      return;
    }

    setIsPending(true);
    const resultaat = await onVoegToe({ bedrag: centsNaarEuro(cents), label: schoneOmschrijving, betaalmethode });
    setIsPending(false);

    if (!resultaat.gelukt) {
      setFout(resultaat.foutmelding ?? "Kon niet opslaan, probeer opnieuw.");
      return;
    }

    setBedragTekst("");
    setOmschrijving("");
    setBetaalmethode("bankkaart");
    onSluiten();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in motion-reduce:animate-none"
        onClick={onSluiten}
        aria-hidden
      />
      <div
        ref={paneelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="extra-kost-titel"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        className="relative z-10 w-full sm:max-w-sm bg-kaart rounded-t-2xl sm:rounded-2xl shadow-card-hover
          max-h-[85vh] overflow-y-auto animate-fade-in-up motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h2 id="extra-kost-titel" className="text-lg font-bold tracking-tight">
            Extra kost toevoegen
          </h2>
          <button
            type="button"
            onClick={onSluiten}
            aria-label="Sluiten"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekst-primair hover:bg-slate-100 transition"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <form
          className="px-5 pb-5 pt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verzend();
          }}
        >
          <div>
            <label className="veld-label" htmlFor="extra-kost-bedrag">
              Bedrag (€)
            </label>
            <input
              ref={bedragRef}
              id="extra-kost-bedrag"
              name="bedrag"
              inputMode="decimal"
              autoComplete="off"
              placeholder="8,50"
              className="veld-input"
              value={bedragTekst}
              onChange={(e) => setBedragTekst(e.target.value)}
            />
          </div>

          <div>
            <label className="veld-label" htmlFor="extra-kost-omschrijving">
              Omschrijving
            </label>
            <input
              id="extra-kost-omschrijving"
              name="omschrijving"
              autoComplete="off"
              className="veld-input"
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
            />
          </div>

          <div>
            <label className="veld-label" id="extra-kost-betaalmethode-label">
              Betaald met
            </label>
            <div className="flex gap-1.5" role="radiogroup" aria-labelledby="extra-kost-betaalmethode-label">
              {BETAALMETHODEN.map((m) => (
                <button
                  key={m.waarde}
                  type="button"
                  role="radio"
                  aria-checked={betaalmethode === m.waarde}
                  onClick={() => setBetaalmethode(m.waarde)}
                  className={`flex-1 min-h-[40px] rounded-xl text-xs font-bold border transition ${
                    betaalmethode === m.waarde
                      ? "bg-primair-dark text-white border-primair-dark"
                      : "bg-kaart-verhoogd text-tekst-secundair border-rand hover:border-primair/40"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {betaalmethode === "visa" && (
              <p className="text-xs text-tekst-secundair mt-1.5">
                Komt bij Facturen te staan — dat bedrag moet je nog terugbetalen aan je kaart.
              </p>
            )}
            {betaalmethode === "maaltijdcheque" && (
              <p className="text-xs text-tekst-secundair mt-1.5">Gaat af van je maaltijdcheques-budget, niet van je geld.</p>
            )}
          </div>

          {fout && (
            <p className="veld-fout" role="alert">
              {fout}
            </p>
          )}

          <button type="submit" className="knop-primair w-full" disabled={isPending}>
            {isPending ? "Bezig…" : fout ? "Opnieuw proberen" : "Toevoegen"}
          </button>
        </form>
      </div>
    </div>
  );
}
