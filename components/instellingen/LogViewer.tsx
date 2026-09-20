"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LogNiveau, LogRegel } from "@/lib/logger";

const NIVEAUS: LogNiveau[] = ["INFO", "WARN", "ERROR"];

const NIVEAU_KLEUR: Record<LogNiveau, string> = {
  INFO: "text-succes bg-succes-bg",
  WARN: "text-goud bg-goud-bg",
  ERROR: "text-tekort bg-tekort-bg",
};

export function LogViewer({
  regels,
  onWissen,
}: {
  regels: LogRegel[];
  onWissen: () => Promise<void>;
}) {
  const router = useRouter();
  const [actieveNiveaus, setActieveNiveaus] = useState<Set<LogNiveau>>(new Set(NIVEAUS));
  const [zoekterm, setZoekterm] = useState("");
  const [uitgeklapt, setUitgeklapt] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggleNiveau(niveau: LogNiveau) {
    setActieveNiveaus((prev) => {
      const nieuw = new Set(prev);
      if (nieuw.has(niveau)) nieuw.delete(niveau);
      else nieuw.add(niveau);
      return nieuw;
    });
  }

  const gefilterd = useMemo(() => {
    const term = zoekterm.trim().toLowerCase();
    return regels.filter((r) => {
      if (!actieveNiveaus.has(r.level)) return false;
      if (!term) return true;
      return r.code.toLowerCase().includes(term) || r.message.toLowerCase().includes(term);
    });
  }, [regels, actieveNiveaus, zoekterm]);

  function wissen() {
    if (!confirm("Weet je zeker dat je het logboek wil wissen?")) return;
    startTransition(async () => {
      await onWissen();
      router.refresh();
    });
  }

  return (
    <div className="kaart">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold">Logboek</h2>
        <div className="flex gap-2">
          <button type="button" className="knop-secundair min-h-[40px] px-4 text-sm" onClick={() => router.refresh()}>
            Ververs
          </button>
          <button
            type="button"
            className="knop-secundair min-h-[40px] px-4 text-sm text-tekort"
            onClick={wissen}
            disabled={isPending}
          >
            Logbestand wissen
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {NIVEAUS.map((niveau) => (
          <button
            key={niveau}
            type="button"
            onClick={() => toggleNiveau(niveau)}
            className={`min-h-[36px] px-3 rounded-full text-sm font-bold border transition ${
              actieveNiveaus.has(niveau) ? NIVEAU_KLEUR[niveau] + " border-transparent" : "border-rand text-tekst-secundair"
            }`}
          >
            {niveau}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Zoek op foutcode of tekst…"
        className="veld-input mb-4"
        value={zoekterm}
        onChange={(e) => setZoekterm(e.target.value)}
      />

      {gefilterd.length === 0 ? (
        <p className="text-tekst-secundair text-center py-8">
          {regels.length === 0 ? "Nog geen logs, dat is goed nieuws!" : "Geen logregels gevonden voor deze filter."}
        </p>
      ) : (
        <ul className="space-y-2">
          {gefilterd.map((regel, i) => {
            const open = uitgeklapt.has(i);
            return (
              <li key={i} className="rounded-xl border border-rand p-3">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() =>
                    setUitgeklapt((prev) => {
                      const nieuw = new Set(prev);
                      if (nieuw.has(i)) nieuw.delete(i);
                      else nieuw.add(i);
                      return nieuw;
                    })
                  }
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${NIVEAU_KLEUR[regel.level]}`}>
                      {regel.level}
                    </span>
                    <span className="text-xs font-mono text-tekst-secundair">{regel.code}</span>
                    <span className="text-xs text-tekst-secundair">
                      {new Date(regel.timestamp).toLocaleString("nl-BE")}
                    </span>
                  </div>
                  <p className="mt-1">{regel.message}</p>
                </button>
                {open && regel.context && (
                  <pre className="mt-2 text-xs bg-rand/40 rounded-lg p-2 overflow-x-auto">
                    {JSON.stringify(regel.context, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
