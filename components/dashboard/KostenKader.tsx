"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import type { Categorie, VasteKost, Factuur } from "@/types/database";
import { CATEGORIE_INFO } from "@/types/database";
import { CategorieIcon, categorieInfo } from "@/components/ui/CategorieIcon";
import { Switch } from "@/components/ui/Switch";
import { StapTip } from "@/components/ui/StapTip";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { useUitklapbareLijst } from "@/components/ui/useUitklapbareLijst";
import { ToonMeerKnop } from "@/components/ui/ToonMeerKnop";

type Kost = VasteKost | Factuur;

interface Props {
  titel: string;
  ankerId: string;
  stapTip: { nummer: number; titel: string; uitleg: string; voorbeeld: string };
  items: Kost[];
  onZetBetaald: (id: string, betaald: boolean) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onToevoegen: (data: {
    label: string;
    bedrag: number;
    categorie: Categorie;
    icoon: string;
    vervaldag: number | null;
    eind_datum: string | null;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  /** Een viewer mag niets toevoegen — de knop/het formulier verschijnt dan niet. */
  magToevoegen?: boolean;
}

const CATEGORIEEN = Object.keys(CATEGORIE_INFO) as Categorie[];

/** Herbruikbaar kader voor vaste kosten én facturen — zelfde structuur en gedrag. */
export function KostenKader({ titel, ankerId, stapTip, items, onZetBetaald, onToevoegen, onVerwijderen, magToevoegen = true }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { zichtbareItems, heeftMeer, uitgeklapt, wisselUitgeklapt, aantalVerborgen } = useUitklapbareLijst(items);

  // Optimistische betaald-status: de switch springt meteen om bij een
  // klik, in plaats van te wachten tot de server-actie + volledige
  // dashboard-herlading (kan enkele seconden duren) rond is. Zodra de
  // echte data hierop aansluit, verdwijnt de override vanzelf (zie
  // effect hieronder) — bij een mislukte actie zetten we hem terug.
  const [optimistischBetaald, setOptimistischBetaald] = useState<Record<string, boolean>>({});
  const [bezigIds, setBezigIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOptimistischBetaald((huidig) => {
      const overgebleven = Object.entries(huidig).filter(([id, waarde]) => {
        const item = items.find((i) => i.id === id);
        return item !== undefined && item.betaald !== waarde;
      });
      return overgebleven.length === Object.keys(huidig).length ? huidig : Object.fromEntries(overgebleven);
    });
  }, [items]);

  function betaaldWaarde(item: Kost) {
    return optimistischBetaald[item.id] ?? item.betaald;
  }

  function toggleBetaald(item: Kost) {
    const nieuw = !betaaldWaarde(item);
    setOptimistischBetaald((o) => ({ ...o, [item.id]: nieuw }));
    setBezigIds((s) => new Set(s).add(item.id));
    startTransition(async () => {
      const resultaat = await onZetBetaald(item.id, nieuw);
      if (!resultaat.gelukt) {
        setOptimistischBetaald((o) => ({ ...o, [item.id]: !nieuw }));
      }
      setBezigIds((s) => {
        const nieuwe = new Set(s);
        nieuwe.delete(item.id);
        return nieuwe;
      });
    });
  }

  const betaaldTotaal = items.filter((i) => betaaldWaarde(i)).reduce((s, i) => s + i.bedrag, 0);
  const nogTeBetalenTotaal = items.filter((i) => !betaaldWaarde(i)).reduce((s, i) => s + i.bedrag, 0);

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const categorie = String(formData.get("categorie") ?? "andere") as Categorie;
    const vervaldagRaw = String(formData.get("vervaldag") ?? "");
    const eindDatumRaw = String(formData.get("eind_datum") ?? "");

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    const vervaldag = vervaldagRaw ? Number(vervaldagRaw) : null;
    if (vervaldag !== null && (vervaldag < 1 || vervaldag > 31)) {
      setFout("Vervaldag moet tussen 1 en 31 liggen.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onToevoegen({
        label,
        bedrag,
        categorie,
        icoon: CATEGORIE_INFO[categorie].icoon,
        vervaldag,
        eind_datum: eindDatumRaw || null,
      });
      if (resultaat.gelukt) {
        setFormOpen(false);
      } else {
        setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
      }
    });
  }

  return (
    <div className="kaart" id={ankerId}>
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <h2 className="text-lg font-bold tracking-tight">{titel}</h2>
        {items.length > 0 && (
          <div className="flex items-center gap-2.5 text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-succes">
              <span className="h-1.5 w-1.5 rounded-full bg-succes" /> Betaald €{betaaldTotaal.toFixed(2)}
            </span>
            <span className="flex items-center gap-1 text-tekst-secundair">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Nog te betalen €{nogTeBetalenTotaal.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {items.length === 0 && !formOpen && magToevoegen && (
        <StapTip stapNummer={stapTip.nummer} titel={stapTip.titel} uitleg={stapTip.uitleg} voorbeeld={stapTip.voorbeeld} />
      )}
      {items.length === 0 && !magToevoegen && <p className="text-sm text-tekst-secundair">Nog niets ingevuld.</p>}

      <ul className="space-y-2 mb-2">
        {zichtbareItems.map((item) => {
          const info = categorieInfo(item.categorie);
          const betaald = betaaldWaarde(item);
          const bezig = bezigIds.has(item.id);
          return (
            <li
              key={item.id}
              className="rounded-xl border border-rand/70 p-3 transition-colors hover:bg-slate-50/80"
            >
              <div className="flex items-center gap-3">
                <CategorieIcon categorie={item.categorie} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-tekst-primair truncate leading-tight">{item.label}</p>
                  <p className="text-xs text-tekst-secundair truncate mt-0.5">{CATEGORIE_INFO[item.categorie].label}</p>
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
                <span className="font-extrabold text-tekst-primair tabular-nums">€{item.bedrag.toFixed(2)}</span>
                <Switch
                  aan={betaald}
                  label={betaald ? `${item.label} markeren als onbetaald` : `${item.label} markeren als betaald`}
                  bezig={bezig}
                  disabled={bezig}
                  onWijzig={() => toggleBetaald(item)}
                />
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
            <form action={submit} className="space-y-3 border-t border-rand pt-4">
              <div>
                <label className="veld-label">Label</label>
                <input name="label" className="veld-input" required />
              </div>
              <div>
                <label className="veld-label">Bedrag (€)</label>
                <input name="bedrag" type="number" inputMode="decimal" step="0.01" min="0.01" className="veld-input" required />
              </div>
              <div>
                <label className="veld-label">Categorie</label>
                <select name="categorie" className="veld-input">
                  {CATEGORIEEN.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIE_INFO[c].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="veld-label">Vervaldag (dag van de maand, optioneel)</label>
                <input name="vervaldag" type="number" inputMode="numeric" min="1" max="31" className="veld-input" />
              </div>
              <div>
                <label className="veld-label">Einddatum (optioneel)</label>
                <input name="eind_datum" type="date" className="veld-input" />
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
