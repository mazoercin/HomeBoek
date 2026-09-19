"use client";

import { useState, useTransition } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon, Plus } from "lucide-react";
import type { Categorie, InkomenBron, Inkomen, VasteKost, ExtraUitgave } from "@/types/database";
import { CATEGORIE_INFO } from "@/types/database";
import { berekenMaandequivalent } from "@/lib/calculations/inkomen";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";

const KLEUREN = ["#6366F1", "#F59E0B", "#10B981", "#F43F5E", "#0EA5E9", "#8B5CF6", "#EC4899", "#64748B"];
const CATEGORIEEN = Object.keys(CATEGORIE_INFO) as Categorie[];

interface Segment {
  naam: string;
  waarde: number;
}

type ActieResultaat = Promise<{ gelukt: boolean; foutmelding?: string }>;

/** Klein, uniform "snel toevoegen"-formulier onderaan elke grafiek — zodat je meteen vanuit de Verdeling-kaart data kan invullen. */
function SnelToevoegen({
  soort,
  onToevoegen,
}: {
  soort: "inkomen" | "kosten" | "uitgaven";
  onToevoegen: (formData: FormData) => ActieResultaat;
}) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    const label = String(formData.get("label") ?? "").trim();
    const bedrag = Number(formData.get("bedrag"));
    if (!label) return setFout("Vul een label in.");
    if (!Number.isFinite(bedrag) || bedrag <= 0) return setFout("Bedrag moet een positief getal zijn.");

    startTransition(async () => {
      const resultaat = await onToevoegen(formData);
      if (resultaat.gelukt) setOpen(false);
      else setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="mt-3">
      <Uitklapbaar open={open}>
        <form action={submit} className="space-y-2 pt-1">
          <input name="label" placeholder="Label" className="veld-input !min-h-[38px] text-sm" required />
          <input
            name="bedrag"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="Bedrag (€)"
            className="veld-input !min-h-[38px] text-sm"
            required
          />
          {soort === "kosten" && (
            <select name="categorie" className="veld-input !min-h-[38px] text-sm">
              {CATEGORIEEN.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIE_INFO[c].label}
                </option>
              ))}
            </select>
          )}
          {fout && <p className="veld-fout !mt-1 !text-xs">{fout}</p>}
          <div className="flex gap-1.5">
            <button type="submit" className="knop-primair !min-h-[36px] flex-1 !text-sm" disabled={isPending}>
              Opslaan
            </button>
            <button type="button" className="knop-secundair !min-h-[36px] !text-sm" onClick={() => setOpen(false)}>
              Annuleren
            </button>
          </div>
        </form>
      </Uitklapbaar>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-1 min-h-[36px] rounded-full border border-dashed border-rand text-xs font-semibold text-tekst-secundair hover:text-primair hover:border-primair/40 transition"
        >
          <Plus size={14} strokeWidth={2.5} /> Toevoegen
        </button>
      )}
    </div>
  );
}

function EenGrafiek({
  titel,
  data,
  snelToevoegen,
}: {
  titel: string;
  data: Segment[];
  snelToevoegen: React.ReactNode;
}) {
  const totaal = data.reduce((s, d) => s + d.waarde, 0);

  return (
    <div>
      <p className="text-sm font-semibold text-tekst-primair mb-2">{titel}</p>
      {data.length === 0 || totaal === 0 ? (
        <div className="h-[180px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ naam: "leeg", waarde: 1 }]}
                dataKey="waarde"
                nameKey="naam"
                innerRadius={42}
                outerRadius={68}
                isAnimationActive={false}
                stroke="none"
              >
                <Cell fill="#E2E8F0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <p className="text-xs text-tekst-secundair text-center leading-snug">
              Nog geen data
              <br />— vul je data in.
            </p>
          </div>
        </div>
      ) : (
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="waarde" nameKey="naam" innerRadius={42} outerRadius={68} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={KLEUREN[i % KLEUREN.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                formatter={(waarde: number, naam: string) => [`€${waarde.toFixed(2)}`, naam]}
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.length > 0 && totaal > 0 && (
        <ul className="mt-2 space-y-1">
          {data.slice(0, 5).map((d, i) => (
            <li key={d.naam} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: KLEUREN[i % KLEUREN.length] }} />
              <span className="flex-1 truncate text-tekst-secundair">{d.naam}</span>
              <span className="font-semibold text-tekst-primair tabular-nums">€{d.waarde.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
      {snelToevoegen}
    </div>
  );
}

interface Props {
  inkomen: Inkomen[];
  vasteKosten: VasteKost[];
  extraUitgaven: ExtraUitgave[];
  onInkomenToevoegen: (data: {
    bron: InkomenBron;
    label: string;
    bedrag: number;
    frequentie: "maandelijks";
  }) => ActieResultaat;
  onVasteKostToevoegen: (data: {
    label: string;
    bedrag: number;
    categorie: Categorie;
    icoon: string;
    vervaldag: number | null;
    eind_datum: string | null;
  }) => ActieResultaat;
  onExtraUitgaveToevoegen: (data: { label: string; bedrag: number; overslaanbaar: boolean }) => ActieResultaat;
}

/**
 * Drie taartgrafieken: waar komt het inkomen vandaan, en waar gaat het
 * geld naartoe. Elke grafiek heeft ook een eigen "snel toevoegen" —
 * dezelfde onderliggende data als de kaders verderop, dus alles wat je
 * hier invult verschijnt instant overal elders op het dashboard (en
 * omgekeerd), via dezelfde server-acties.
 */
export function GrafiekenSectie({
  inkomen,
  vasteKosten,
  extraUitgaven,
  onInkomenToevoegen,
  onVasteKostToevoegen,
  onExtraUitgaveToevoegen,
}: Props) {
  const inkomenData: Segment[] = inkomen.map((i) => ({
    naam: i.label,
    waarde: berekenMaandequivalent(i.bedrag, i.frequentie),
  }));

  const kostenPerCategorie = new Map<string, number>();
  for (const kost of vasteKosten) {
    const label = CATEGORIE_INFO[kost.categorie].label;
    kostenPerCategorie.set(label, (kostenPerCategorie.get(label) ?? 0) + kost.bedrag);
  }
  const kostenData: Segment[] = [...kostenPerCategorie.entries()].map(([naam, waarde]) => ({ naam, waarde }));

  const uitgavenData: Segment[] = extraUitgaven.map((u) => ({ naam: u.label, waarde: u.bedrag }));

  return (
    <div className="kaart">
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon size={18} color="#6366F1" strokeWidth={2.25} />
        <h2 className="text-lg font-bold tracking-tight">Verdeling</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
        <EenGrafiek
          titel="Inkomen per bron"
          data={inkomenData}
          snelToevoegen={
            <SnelToevoegen
              soort="inkomen"
              onToevoegen={(fd) =>
                onInkomenToevoegen({
                  bron: "zelf",
                  label: String(fd.get("label")),
                  bedrag: Number(fd.get("bedrag")),
                  frequentie: "maandelijks",
                })
              }
            />
          }
        />
        <EenGrafiek
          titel="Vaste kosten per categorie"
          data={kostenData}
          snelToevoegen={
            <SnelToevoegen
              soort="kosten"
              onToevoegen={(fd) => {
                const categorie = (String(fd.get("categorie")) || "andere") as Categorie;
                return onVasteKostToevoegen({
                  label: String(fd.get("label")),
                  bedrag: Number(fd.get("bedrag")),
                  categorie,
                  icoon: CATEGORIE_INFO[categorie].icoon,
                  vervaldag: null,
                  eind_datum: null,
                });
              }}
            />
          }
        />
        <EenGrafiek
          titel="Extra uitgaven"
          data={uitgavenData}
          snelToevoegen={
            <SnelToevoegen
              soort="uitgaven"
              onToevoegen={(fd) =>
                onExtraUitgaveToevoegen({
                  label: String(fd.get("label")),
                  bedrag: Number(fd.get("bedrag")),
                  overslaanbaar: true,
                })
              }
            />
          }
        />
      </div>
    </div>
  );
}
