"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import { formatteerMaandNaam } from "@/lib/calculations/maand";
import type { MaandSamenvatting } from "@/lib/data/overzicht";

export function OverzichtClient({ maanden }: { maanden: MaandSamenvatting[] }) {
  if (maanden.length === 0) {
    return (
      <div className="kaart text-center py-10">
        <CalendarDays size={28} className="mx-auto text-tekst-secundair mb-3" strokeWidth={1.75} />
        <p className="font-semibold text-tekst-primair mb-1">Nog geen maanden geregistreerd</p>
        <p className="text-sm text-tekst-secundair">
          Ga naar het dashboard en registreer je eerste maand om ze hier terug te zien.
        </p>
      </div>
    );
  }

  const grafiekData = maanden.map((m) => ({
    naam: (formatteerMaandNaam(m.maand).split(" ")[0] ?? m.maand).slice(0, 3),
    Inkomen: Number(m.inkomen.toFixed(2)),
    Uitgaven: Number(m.uitgaven.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div className="kaart">
        <h2 className="text-lg font-bold tracking-tight mb-4">Inkomen vs. uitgaven per maand</h2>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grafiekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="naam" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                formatter={(waarde: number) => `€${waarde.toFixed(2)}`}
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="Inkomen" fill="#6366F1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Uitgaven" fill="#F43F5E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight mb-3">Maanden</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...maanden].reverse().map((m) => {
            const positief = m.saldo >= 0;
            return (
              <Link
                key={m.maand}
                href={`/dashboard/${m.maand}`}
                className="kaart hover:shadow-card-hover transition-shadow duration-200 block"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-tekst-primair">{formatteerMaandNaam(m.maand)}</p>
                  {positief ? (
                    <TrendingUp size={17} className="text-succes" strokeWidth={2.25} />
                  ) : (
                    <TrendingDown size={17} className="text-tekort" strokeWidth={2.25} />
                  )}
                </div>
                <p className={`text-2xl font-extrabold tabular-nums ${positief ? "text-succes" : "text-tekort"}`}>
                  €{m.saldo.toFixed(2)}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-tekst-secundair">
                  <span>Inkomen €{m.inkomen.toFixed(2)}</span>
                  <span>Uitgaven €{m.uitgaven.toFixed(2)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
