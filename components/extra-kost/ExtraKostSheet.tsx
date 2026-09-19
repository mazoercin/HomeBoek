"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { parseBedragNaarCents, centsNaarEuro } from "@/lib/calculations/geld";
import { vandaagInBrusselAlsDatumString, maandVanDatumString } from "@/lib/calculations/maand";
import { leesRecenteOmschrijvingen, voegRecenteOmschrijvingToe } from "@/lib/extra-kost/recente-omschrijvingen";

const VASTE_CHIPS = ["Kaars", "Tanken", "Drank", "Boodschappen", "Cadeau", "Andere"];

export interface ExtraKostInvoer {
  bedrag: number;
  label: string;
  datum: string; // YYYY-MM-DD
  maand: string; // YYYY-MM, afgeleid van datum
}

interface Props {
  open: boolean;
  onSluiten: () => void;
  onVoegToe: (invoer: ExtraKostInvoer) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

const FOCUSBARE_ELEMENTEN = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Snel-invoerscherm voor een extra kost: bottom sheet op mobiel
 * (`max-sm:`), kleine gecentreerde modal op desktop (`sm:`) — zelfde
 * component, enkel responsive klassen. Focus trap + Escape + klik
 * naast het scherm sluiten, autofocus op het bedrag.
 */
export function ExtraKostSheet({ open, onSluiten, onVoegToe }: Props) {
  const [bedragTekst, setBedragTekst] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [categorie, setCategorie] = useState("");
  const [datum, setDatum] = useState(() => vandaagInBrusselAlsDatumString());
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [recenteOmschrijvingen, setRecenteOmschrijvingen] = useState<string[]>([]);

  const paneelRef = useRef<HTMLDivElement>(null);
  const bedragRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRecenteOmschrijvingen(leesRecenteOmschrijvingen());
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

  function reset() {
    setBedragTekst("");
    setOmschrijving("");
    setCategorie("");
    setDatum(vandaagInBrusselAlsDatumString());
    setFout(null);
  }

  async function verzend(blijfOpen: boolean) {
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
    if (!datum) {
      setFout("Kies een geldige datum.");
      return;
    }

    const schoneCategorie = categorie.trim();
    const label = schoneCategorie ? `${schoneOmschrijving} (${schoneCategorie})` : schoneOmschrijving;

    setIsPending(true);
    const resultaat = await onVoegToe({
      bedrag: centsNaarEuro(cents),
      label,
      datum,
      maand: maandVanDatumString(datum),
    });
    setIsPending(false);

    if (!resultaat.gelukt) {
      setFout(resultaat.foutmelding ?? "Kon niet opslaan, probeer opnieuw.");
      return;
    }

    voegRecenteOmschrijvingToe(schoneOmschrijving);

    if (blijfOpen) {
      reset();
      requestAnimationFrame(() => bedragRef.current?.focus());
    } else {
      onSluiten();
      reset();
    }
  }

  const chipOpties = [...VASTE_CHIPS, ...recenteOmschrijvingen.filter((r) => !VASTE_CHIPS.includes(r))];

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
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekst-primair hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <form
          className="px-5 pb-5 pt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verzend(false);
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
            <div className="flex flex-wrap gap-1.5 mt-2">
              {chipOpties.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setOmschrijving(chip)}
                  className={`text-xs font-semibold rounded-full px-3 py-1.5 min-h-[32px] transition ${
                    omschrijving === chip
                      ? "bg-primair text-white"
                      : "bg-primair-light text-primair-dark hover:brightness-95"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="veld-label" htmlFor="extra-kost-categorie">
              Categorie (optioneel)
            </label>
            <input
              id="extra-kost-categorie"
              name="categorie"
              autoComplete="off"
              className="veld-input"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
            />
          </div>

          <div>
            <label className="veld-label" htmlFor="extra-kost-datum">
              Datum
            </label>
            <input
              id="extra-kost-datum"
              name="datum"
              type="date"
              className="veld-input"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>

          {fout && (
            <p className="veld-fout" role="alert">
              {fout}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" className="knop-primair flex-1" disabled={isPending}>
              {isPending ? "Bezig…" : fout ? "Opnieuw proberen" : "Toevoegen"}
            </button>
            <button
              type="button"
              className="knop-secundair"
              disabled={isPending}
              onClick={() => void verzend(true)}
            >
              + nog één
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
