"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, SlidersHorizontal } from "lucide-react";
import type { ExtraUitgave } from "@/types/database";
import { StapTip } from "@/components/ui/StapTip";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { Switch } from "@/components/ui/Switch";
import { useUitklapbareLijst } from "@/components/ui/useUitklapbareLijst";
import { ToonMeerKnop } from "@/components/ui/ToonMeerKnop";

interface Props {
  items: ExtraUitgave[];
  geskipteIds: string[];
  maand: string;
  onToevoegen: (data: {
    label: string;
    bedrag: number;
    overslaanbaar: boolean;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onZetGeskipt: (id: string, maand: string, geskipt: boolean) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

export function ExtraUitgavenKader({ items, geskipteIds, maand, onToevoegen, onVerwijderen, onZetGeskipt }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { zichtbareItems, heeftMeer, uitgeklapt, wisselUitgeklapt, aantalVerborgen } = useUitklapbareLijst(items);

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const overslaanbaar = formData.get("overslaanbaar") === "on";

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onToevoegen({ label, bedrag, overslaanbaar });
      if (resultaat.gelukt) setFormOpen(false);
      else setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="uitgaven">
      <h2 className="text-lg font-bold tracking-tight mb-4">Extra uitgaven</h2>

      {items.length === 0 && !formOpen && (
        <StapTip
          stapNummer={4}
          titel="Flexibele uitgaven (optioneel)"
          uitleg="Abonnementen en kleine terugkerende kosten die je af en toe kan pauzeren."
          voorbeeld="Kapper — €35,00 (overslaanbaar)"
        />
      )}

      <ul className="space-y-2 mb-2">
        {zichtbareItems.map((item) => {
          const geskipt = geskipteIds.includes(item.id);
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-rand/70 p-3 transition-colors hover:bg-slate-50/80"
            >
              <span className="inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 bg-secundair-light">
                <SlidersHorizontal size={18} color="#D97706" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-tekst-primair truncate leading-tight">{item.label}</p>
                <div className="flex gap-1.5 flex-wrap mt-1">
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
              </div>
              <div className="flex flex-col items-end shrink-0 mr-1">
                <span className="text-[11px] uppercase tracking-wide text-tekst-secundair font-medium">Bedrag</span>
                <span
                  className={`font-extrabold tabular-nums ${geskipt ? "text-tekst-secundair line-through" : "text-tekst-primair"}`}
                >
                  €{item.bedrag.toFixed(2)}
                </span>
              </div>
              {item.overslaanbaar && (
                <Switch
                  aan={!geskipt}
                  label={geskipt ? `${item.label} weer meetellen deze maand` : `${item.label} overslaan deze maand`}
                  disabled={isPending}
                  onWijzig={() =>
                    startTransition(async () => {
                      await onZetGeskipt(item.id, maand, !geskipt);
                    })
                  }
                />
              )}
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
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekort hover:bg-tekort-bg transition"
              >
                <Trash2 size={17} strokeWidth={2} />
              </button>
            </li>
          );
        })}
      </ul>

      {heeftMeer && (
        <ToonMeerKnop uitgeklapt={uitgeklapt} aantalVerborgen={aantalVerborgen} onKlik={wisselUitgeklapt} />
      )}

      <Uitklapbaar open={formOpen}>
        <form action={submit} className="space-y-3 border-t border-rand pt-3">
          <div>
            <label className="veld-label">Label</label>
            <input name="label" className="veld-input" required />
          </div>
          <div>
            <label className="veld-label">Bedrag (€)</label>
            <input name="bedrag" type="number" inputMode="decimal" step="0.01" min="0.01" className="veld-input" required />
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
    </div>
  );
}
