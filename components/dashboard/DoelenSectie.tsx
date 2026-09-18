"use client";

import { useState, useTransition } from "react";
import type { Doel } from "@/types/database";
import { berekenDoelProjectie, berekenReedsGespaard } from "@/lib/calculations/doelen";

interface Props {
  doelen: Doel[];
  huidigeMaand: string;
  onToevoegen: (data: {
    naam: string;
    target_bedrag: number;
    maandelijks_bedrag: number;
    prioriteit: number;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onPauzeren: (id: string, gepauzeerd: boolean) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onWisselen: (
    doelIdA: string,
    prioriteitA: number,
    doelIdB: string,
    prioriteitB: number
  ) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/** Doelen zijn goud-vrij hier — goud krijgt zijn eigen sectie/kleur op het dashboard. */
export function DoelenSectie({
  doelen,
  huidigeMaand,
  onToevoegen,
  onVerwijderen,
  onPauzeren,
  onWisselen,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const vandaag = new Date();

  const gesorteerd = [...doelen].sort((a, b) => a.prioriteit - b.prioriteit);

  function wissel(index: number, richting: -1 | 1) {
    const andere = gesorteerd[index + richting];
    const huidige = gesorteerd[index];
    if (!andere || !huidige) return;
    startTransition(async () => {
      await onWisselen(huidige.id, andere.prioriteit, andere.id, huidige.prioriteit);
    });
  }

  function submit(formData: FormData) {
    setFout(null);
    const naam = String(formData.get("naam") ?? "").trim();
    const targetBedrag = Number(formData.get("target_bedrag"));
    const maandelijksBedrag = Number(formData.get("maandelijks_bedrag"));

    if (!naam) {
      setFout("Vul een naam in.");
      return;
    }
    if (!Number.isFinite(targetBedrag) || targetBedrag <= 0) {
      setFout("Doelbedrag moet een positief getal zijn.");
      return;
    }
    if (!Number.isFinite(maandelijksBedrag) || maandelijksBedrag < 0) {
      setFout("Bedrag per maand moet 0 of hoger zijn.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onToevoegen({
        naam,
        target_bedrag: targetBedrag,
        maandelijks_bedrag: maandelijksBedrag,
        prioriteit: doelen.length,
      });
      if (resultaat.gelukt) setFormOpen(false);
      else setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="doelen">
      <h2 className="text-lg font-bold mb-3">Doelen</h2>

      {gesorteerd.length === 0 && !formOpen && (
        <p className="text-tekst-secundair text-sm mb-3">Nog geen doelen ingesteld.</p>
      )}

      <ul className="space-y-3 mb-3">
        {gesorteerd.map((doel, index) => {
          const reedsGespaard = berekenReedsGespaard(doel, vandaag);
          const voortgang = Math.min(100, Math.round((reedsGespaard / doel.target_bedrag) * 100));
          const projectie = berekenDoelProjectie(doel, reedsGespaard, huidigeMaand);

          return (
            <li key={doel.id} className="rounded-xl border border-rand p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{doel.naam}</p>
                  <p className="text-xs text-tekst-secundair">
                    €{reedsGespaard.toFixed(2)} / €{doel.target_bedrag.toFixed(2)} · €
                    {doel.maandelijks_bedrag.toFixed(2)}/maand
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Omhoog"
                    disabled={index === 0 || isPending}
                    onClick={() => wissel(index, -1)}
                    className="min-h-[32px] min-w-[32px] text-tekst-secundair disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Omlaag"
                    disabled={index === gesorteerd.length - 1 || isPending}
                    onClick={() => wissel(index, 1)}
                    className="min-h-[32px] min-w-[32px] text-tekst-secundair disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="w-full h-2 bg-rand rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primair transition-all" style={{ width: `${voortgang}%` }} />
              </div>

              <p className="text-xs text-tekst-secundair mt-1">
                {doel.gepauzeerd
                  ? "Gepauzeerd"
                  : projectie.maanden === null
                    ? "Geen maandelijks bedrag ingesteld"
                    : projectie.maanden === 0
                      ? "Doel al bereikt!"
                      : `Bereikt over ${projectie.maanden} maand${projectie.maanden === 1 ? "" : "en"} (${projectie.datum})`}
              </p>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await onPauzeren(doel.id, !doel.gepauzeerd);
                    })
                  }
                  className="knop-secundair min-h-[36px] px-3 text-sm"
                >
                  {doel.gepauzeerd ? "Hervat" : "Pauzeer"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`Doel "${doel.naam}" verwijderen?`)) {
                      startTransition(async () => {
                        await onVerwijderen(doel.id);
                      });
                    }
                  }}
                  className="min-h-[36px] px-3 text-sm text-tekst-secundair hover:text-tekort transition"
                >
                  Verwijderen
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {formOpen ? (
        <form action={submit} className="space-y-3 border-t border-rand pt-3">
          <div>
            <label className="veld-label">Naam</label>
            <input name="naam" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Doelbedrag (€)</label>
            <input name="target_bedrag" type="number" inputMode="decimal" step="0.01" min="0.01" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Bedrag per maand (€)</label>
            <input name="maandelijks_bedrag" type="number" inputMode="decimal" step="0.01" min="0" className="veld-input" required />
          </div>
          {fout && <p className="veld-fout">{fout}</p>}
          <div className="flex gap-2">
            <button type="submit" className="knop-primair flex-1" disabled={isPending}>
              Opslaan
            </button>
            <button type="button" className="knop-secundair" onClick={() => setFormOpen(false)}>
              Annuleren
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="knop-secundair w-full" onClick={() => setFormOpen(true)}>
          + Doel toevoegen
        </button>
      )}
    </div>
  );
}
