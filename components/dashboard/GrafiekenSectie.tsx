"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import type { VastInkomen, VasteKost, ExtraUitgave } from "@/types/database";
import { CATEGORIE_INFO } from "@/types/database";

const KLEUREN = ["#6366F1", "#F59E0B", "#10B981", "#F43F5E", "#0EA5E9", "#8B5CF6", "#EC4899", "#64748B"];

interface Segment {
  naam: string;
  waarde: number;
}

function EenGrafiek({ titel, data }: { titel: string; data: Segment[] }) {
  const totaal = data.reduce((s, d) => s + d.waarde, 0);

  return (
    <div>
      <p className="text-sm font-semibold text-tekst-primair mb-2">{titel}</p>
      {data.length === 0 || totaal === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-center px-4">
          <p className="text-xs text-tekst-secundair">Nog geen data — vul een paar bedragen in om hier je verdeling te zien.</p>
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
    </div>
  );
}

interface Props {
  vastInkomen: VastInkomen[];
  vasteKosten: VasteKost[];
  extraUitgaven: ExtraUitgave[];
}

/** Drie taartgrafieken: waar komt het inkomen vandaan, en waar gaat het geld naartoe. */
export function GrafiekenSectie({ vastInkomen, vasteKosten, extraUitgaven }: Props) {
  const inkomenData: Segment[] = vastInkomen.map((i) => ({ naam: i.label, waarde: i.bedrag }));

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
        <EenGrafiek titel="Inkomen per bron" data={inkomenData} />
        <EenGrafiek titel="Vaste kosten per categorie" data={kostenData} />
        <EenGrafiek titel="Extra uitgaven" data={uitgavenData} />
      </div>
    </div>
  );
}
