"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, Wallet, CalendarRange, ChevronDown, ChevronUp } from "lucide-react";
import type { Inkomen, InkomenBron, InkomenFrequentie, InkomenWeekBedrag } from "@/types/database";
import { berekenInkomenMaandbedrag } from "@/lib/calculations/inkomen";
import { StapTip } from "@/components/ui/StapTip";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { useUitklapbareLijst } from "@/components/ui/useUitklapbareLijst";
import { ToonMeerKnop } from "@/components/ui/ToonMeerKnop";

interface Props {
  items: Inkomen[];
  weekBedragen: InkomenWeekBedrag[];
  onToevoegen: (data: {
    bron: InkomenBron;
    label: string;
    bedrag: number;
    frequentie: InkomenFrequentie;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onVerwijderen: (id: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  onZetWeekBedragen: (
    inkomenId: string,
    weekBedragen: { week_nummer: number; bedrag: number }[]
  ) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  /** Een viewer mag niets toevoegen — de knop/het formulier verschijnt dan niet. */
  magToevoegen?: boolean;
}

const BRONNEN: { waarde: InkomenBron; label: string }[] = [
  { waarde: "zelf", label: "Zelf" },
  { waarde: "partner", label: "Partner" },
  { waarde: "ander", label: "Ander" },
  { waarde: "maaltijdcheques", label: "Maaltijdcheques" },
];

const FREQUENTIES: { waarde: InkomenFrequentie; label: string }[] = [
  { waarde: "wekelijks", label: "Wekelijks" },
  { waarde: "maandelijks", label: "Maandelijks" },
  { waarde: "3-maandelijks", label: "Om de 3 maanden" },
  { waarde: "6-maandelijks", label: "Om de 6 maanden" },
  { waarde: "jaarlijks", label: "Jaarlijks" },
];

const FREQUENTIE_LABEL: Record<InkomenFrequentie, string> = {
  wekelijks: "per week",
  maandelijks: "per maand",
  "3-maandelijks": "per 3 maanden",
  "6-maandelijks": "per 6 maanden",
  jaarlijks: "per jaar",
};

/** Veilige (niet-gooiende) variant voor weergave — één corrupte rij mag de lijst nooit laten crashen. */
function veiligMaandbedrag(item: Inkomen, weekBedragen: InkomenWeekBedrag[]): number {
  try {
    return berekenInkomenMaandbedrag(item, weekBedragen);
  } catch {
    return 0;
  }
}

function WeekBedragenEditor({
  item,
  weekBedragen,
  onZetWeekBedragen,
}: {
  item: Inkomen;
  weekBedragen: InkomenWeekBedrag[];
  onZetWeekBedragen: Props["onZetWeekBedragen"];
}) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bestaande = weekBedragen.filter((w) => w.inkomen_id === item.id);
  const [waarden, setWaarden] = useState<string[]>(() =>
    [1, 2, 3, 4].map((week) => {
      const gevonden = bestaande.find((w) => w.week_nummer === week);
      return gevonden ? String(gevonden.bedrag) : "";
    })
  );

  const ingevuld = bestaande.length;
  const totaal = bestaande.reduce((som, w) => som + w.bedrag, 0);

  function submit() {
    setFout(null);
    const nieuw: { week_nummer: number; bedrag: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const tekst = (waarden[i] ?? "").trim();
      if (!tekst) continue;
      const bedrag = Number(tekst.replace(",", "."));
      if (!Number.isFinite(bedrag) || bedrag < 0) {
        setFout(`Week ${i + 1}: vul een geldig bedrag in (of laat leeg).`);
        return;
      }
      nieuw.push({ week_nummer: i + 1, bedrag });
    }
    startTransition(async () => {
      const res = await onZetWeekBedragen(item.id, nieuw);
      if (res.gelukt) setOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="mt-2 pl-[52px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primair hover:underline"
      >
        <CalendarRange size={13} strokeWidth={2.25} />
        {ingevuld > 0 ? `Weekbedragen: €${totaal.toFixed(2)} (${ingevuld}/4 weken)` : "Per week invullen"}
        {open ? <ChevronUp size={13} strokeWidth={2.25} /> : <ChevronDown size={13} strokeWidth={2.25} />}
      </button>

      <Uitklapbaar open={open}>
        <div className="mt-2 rounded-xl border border-rand/70 p-3 space-y-2">
          <p className="text-xs text-tekst-secundair">
            Vul in wat je die week echt binnenkreeg. Een week leeg laten en opslaan gebruikt geen weekbedrag. Vul
            alle 4 leeg in om terug te schakelen naar het vaste bedrag × 4.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <label className="veld-label" htmlFor={`week-${item.id}-${i}`}>
                  Week {i + 1}
                </label>
                <input
                  id={`week-${item.id}-${i}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="veld-input"
                  value={waarden[i]}
                  onChange={(e) => {
                    const nieuweWaarden = [...waarden];
                    nieuweWaarden[i] = e.target.value;
                    setWaarden(nieuweWaarden);
                  }}
                />
              </div>
            ))}
          </div>
          {fout && <p className="veld-fout">{fout}</p>}
          <div className="flex gap-2">
            <button type="button" className="knop-primair flex-1 !min-h-[36px] !text-sm" disabled={isPending} onClick={submit}>
              {isPending ? "Bezig…" : "Opslaan"}
            </button>
            <button type="button" className="knop-secundair !min-h-[36px] !text-sm" onClick={() => setOpen(false)}>
              Annuleren
            </button>
          </div>
        </div>
      </Uitklapbaar>
    </div>
  );
}

export function InkomenSectie({ items, weekBedragen, onToevoegen, onVerwijderen, onZetWeekBedragen, magToevoegen = true }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { zichtbareItems, heeftMeer, uitgeklapt, wisselUitgeklapt, aantalVerborgen } = useUitklapbareLijst(items);

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    const bron = String(formData.get("bron") ?? "zelf") as InkomenBron;
    const frequentie = String(formData.get("frequentie") ?? "maandelijks") as InkomenFrequentie;

    if (!label) {
      setFout("Vul een label in.");
      return;
    }
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setFout("Bedrag moet een positief getal zijn.");
      return;
    }

    startTransition(async () => {
      const res = await onToevoegen({ bron, label, bedrag, frequentie });
      if (res.gelukt) setFormOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="inkomen">
      <h2 className="text-lg font-bold tracking-tight mb-1">Inkomen</h2>
      <p className="text-xs text-tekst-secundair mb-4">
        Kies per post hoe vaak het binnenkomt. We rekenen automatisch om naar een maandbedrag. Bij &ldquo;wekelijks&rdquo;
        kan je ook elke week apart invullen als het bedrag varieert. Bron &ldquo;Maaltijdcheques&rdquo; telt apart:
        dat geld komt niet op je rekening, dus het telt niet mee bij &ldquo;Totaal inkomen&rdquo; hierboven (zie het
        aparte maaltijdcheques-blok als je die gebruikt).
      </p>

      {items.length === 0 && !formOpen && magToevoegen && (
        <StapTip
          stapNummer={1}
          titel="Begin met je inkomen"
          uitleg="Vul elk inkomen apart in: je loon, dat van je partner, kindergeld, een freelance-opdracht, ... met de juiste frequentie."
          voorbeeld="Loon Ercin: €2400,00 maandelijks"
        />
      )}
      {items.length === 0 && !magToevoegen && <p className="text-sm text-tekst-secundair">Nog niets ingevuld.</p>}

      <ul className="space-y-2 mb-2">
        {zichtbareItems.map((item) => {
          const maandequivalent = veiligMaandbedrag(item, weekBedragen);
          return (
            <li
              key={item.id}
              className="rounded-xl border border-rand/70 p-3 transition-colors hover:bg-slate-50/80"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 bg-primair-light">
                  <Wallet size={18} color="#4F46E5" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-tekst-primair truncate leading-tight">{item.label}</p>
                  <p className="text-xs text-tekst-secundair mt-0.5">
                    <span className="capitalize">{item.bron}</span> · €{item.bedrag.toFixed(2)}{" "}
                    {FREQUENTIE_LABEL[item.frequentie]}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0 mr-1">
                  <span className="text-[11px] uppercase tracking-wide text-tekst-secundair font-medium">Per maand</span>
                  <span className="font-extrabold text-primair tabular-nums">€{maandequivalent.toFixed(2)}</span>
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
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekort hover:bg-tekort-bg transition"
                >
                  <Trash2 size={17} strokeWidth={2} />
                </button>
              </div>
              {item.frequentie === "wekelijks" && (
                <WeekBedragenEditor item={item} weekBedragen={weekBedragen} onZetWeekBedragen={onZetWeekBedragen} />
              )}
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
                <label className="veld-label" htmlFor="inkomen-bron">
                  Bron
                </label>
                <select id="inkomen-bron" name="bron" className="veld-input">
                  {BRONNEN.map((b) => (
                    <option key={b.waarde} value={b.waarde}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="veld-label" htmlFor="inkomen-label">
                  Label
                </label>
                <input id="inkomen-label" name="label" className="veld-input" required />
              </div>
              <div>
                <label className="veld-label" htmlFor="inkomen-bedrag">
                  Bedrag (€)
                </label>
                <input
                  id="inkomen-bedrag"
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
                <label className="veld-label" htmlFor="inkomen-frequentie">
                  Frequentie
                </label>
                <select id="inkomen-frequentie" name="frequentie" className="veld-input" defaultValue="maandelijks">
                  {FREQUENTIES.map((f) => (
                    <option key={f.waarde} value={f.waarde}>
                      {f.label}
                    </option>
                  ))}
                </select>
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
