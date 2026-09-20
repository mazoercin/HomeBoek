"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import type { Betaalmethode, ExtraUitgave } from "@/types/database";
import { StapTip } from "@/components/ui/StapTip";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { Switch } from "@/components/ui/Switch";
import { useUitklapbareLijst } from "@/components/ui/useUitklapbareLijst";
import { ToonMeerKnop } from "@/components/ui/ToonMeerKnop";

interface Props {
  items: ExtraUitgave[];
  onToevoegen: (data: {
    label: string;
    bedrag: number;
    overslaanbaar: boolean;
    betaalmethode: Betaalmethode;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onZetGeskipt: (id: string, geskipt: boolean) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  /** Id van een net toegevoegd item (bv. via de snel-toevoegen-FAB) — licht kort op in de lijst. */
  highlightId?: string | null;
  /** Een viewer mag niets toevoegen — de knop/het formulier verschijnt dan niet. */
  magToevoegen?: boolean;
}

export function ExtraUitgavenKader({ items, onToevoegen, onVerwijderen, onZetGeskipt, highlightId, magToevoegen = true }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { zichtbareItems, heeftMeer, uitgeklapt, wisselUitgeklapt, aantalVerborgen } = useUitklapbareLijst(items);

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const overslaanbaar = formData.get("overslaanbaar") === "on";
    const betaalmethode = String(formData.get("betaalmethode") ?? "bankkaart") as Betaalmethode;

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onToevoegen({ label, bedrag, overslaanbaar, betaalmethode });
      if (resultaat.gelukt) setFormOpen(false);
      else setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="uitgaven">
      <h2 className="text-lg font-bold tracking-tight mb-4">Extra uitgaven</h2>

      {items.length === 0 && !formOpen && magToevoegen && (
        <StapTip
          stapNummer={4}
          titel="Flexibele uitgaven (optioneel)"
          uitleg="Abonnementen en kleine terugkerende kosten die je af en toe kan pauzeren."
          voorbeeld="Kapper: €35,00 (overslaanbaar)"
        />
      )}
      {items.length === 0 && !magToevoegen && <p className="text-sm text-tekst-secundair">Nog niets ingevuld.</p>}

      <ul className="space-y-2 mb-2" data-testid="extra-uitgaven-lijst">
        {zichtbareItems.map((item) => {
          const geskipt = item.geskipt;
          return (
            <li
              key={item.id}
              data-testid={`extra-uitgave-${item.id}`}
              className={`rounded-xl border border-rand/70 p-3 transition-colors duration-150 motion-reduce:transition-none hover:bg-slate-50/80 ${
                item.id === highlightId ? "bg-primair-light border-primair/40" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 bg-secundair-light">
                  <SlidersHorizontal size={18} color="#D97706" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-tekst-primair truncate leading-tight">{item.label}</p>
                  {(item.betaalmethode === "maaltijdcheque" || item.overslaanbaar || geskipt) && (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {item.betaalmethode === "maaltijdcheque" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-succes bg-succes-bg rounded-full px-2 py-0.5">
                          <UtensilsCrossed size={11} strokeWidth={2.5} /> Maaltijdcheque
                        </span>
                      )}
                      {item.overslaanbaar && (
                        <span className="text-[11px] font-bold text-secundair-dark bg-secundair-light rounded-full px-2 py-0.5">
                          Overslaanbaar
                        </span>
                      )}
                      {geskipt && (
                        <span className="text-[11px] font-bold text-tekst-secundair bg-slate-100 rounded-full px-2 py-0.5">
                          Deze maand overgeslagen
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Verwijder ${item.label}`}
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`"${item.label}" verwijderen?`)) {
                      startTransition(async () => {
                        await onVerwijderen(item.id);
                      });
                    }
                  }}
                  className="shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekort hover:bg-tekort-bg transition"
                >
                  <Trash2 size={17} strokeWidth={2} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 mt-2.5 pl-[52px]">
                <span className={`font-extrabold tabular-nums ${geskipt ? "text-tekst-secundair line-through" : "text-tekst-primair"}`}>
                  €{item.bedrag.toFixed(2)}
                </span>
                {item.overslaanbaar && (
                  <Switch
                    aan={!geskipt}
                    label={geskipt ? `${item.label} weer meetellen deze maand` : `${item.label} overslaan deze maand`}
                    disabled={isPending}
                    onWijzig={() =>
                      startTransition(async () => {
                        await onZetGeskipt(item.id, !geskipt);
                      })
                    }
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {heeftMeer && (
        <ToonMeerKnop uitgeklapt={uitgeklapt} aantalVerborgen={aantalVerborgen} onKlik={wisselUitgeklapt} />
      )}

      {magToevoegen && (
        <>
          <Uitklapbaar open={formOpen}>
            <form action={submit} className="space-y-3 border-t border-rand pt-3">
              <div>
                <label className="veld-label" htmlFor="extra-uitgave-label">
                  Label
                </label>
                <input id="extra-uitgave-label" name="label" className="veld-input" required />
              </div>
              <div>
                <label className="veld-label" htmlFor="extra-uitgave-bedrag">
                  Bedrag (€)
                </label>
                <input
                  id="extra-uitgave-bedrag"
                  name="bedrag"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  className="veld-input"
                  required
                />
              </div>
              <div>
                <label className="veld-label" htmlFor="extra-uitgave-betaalmethode">
                  Betaald met
                </label>
                <select id="extra-uitgave-betaalmethode" name="betaalmethode" className="veld-input" defaultValue="bankkaart">
                  <option value="bankkaart">Bankkaart</option>
                  <option value="maaltijdcheque">Maaltijdcheque</option>
                </select>
              </div>
              <label className="flex items-center gap-2 min-h-[44px]">
                <input name="overslaanbaar" type="checkbox" defaultChecked className="h-5 w-5" />
                <span>Overslaanbaar (pauzeerbaar)</span>
              </label>
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
          </Uitklapbaar>
          {!formOpen && (
            <button type="button" className="knop-secundair w-full gap-1.5" onClick={() => setFormOpen(true)}>
              <Plus size={18} strokeWidth={2.5} /> Toevoegen
            </button>
          )}
        </>
      )}
    </div>
  );
}
