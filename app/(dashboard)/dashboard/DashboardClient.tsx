"use client";

import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/data/dashboard";
import {
  berekenTotaalInkomen,
  berekenOpenstaandBedrag,
  berekenWatOverblijft,
  berekenPeriodeProjectie,
  genereerVoorstellenBijTekort,
} from "@/lib/calculations";
import { PeriodeSelector, type Periode } from "@/components/dashboard/PeriodeSelector";
import { SamenvattingKaarten } from "@/components/dashboard/SamenvattingKaarten";
import { InkomenSectie } from "@/components/dashboard/InkomenSectie";
import { KostenKader } from "@/components/dashboard/KostenKader";
import { ExtraUitgavenKader } from "@/components/dashboard/ExtraUitgavenKader";
import { WatAlsKader } from "@/components/dashboard/WatAlsKader";
import { DoelenSectie } from "@/components/dashboard/DoelenSectie";
import { GoudSectie } from "@/components/dashboard/GoudSectie";
import { VoorstellenSectie } from "@/components/dashboard/VoorstellenSectie";
import {
  zetVasteKostBetaald,
  zetFactuurBetaald,
  pasWatAlsToe,
  voegVasteKostToe,
  verwijderVasteKost,
  voegFactuurToe,
  verwijderFactuur,
  voegExtraUitgaveToe,
  verwijderExtraUitgave,
  voegDoelToe,
  verwijderDoel,
  zetDoelGepauzeerd,
  wisselDoelPrioriteit,
  voegGoudTransactieToe,
  voegVastInkomenToe,
  verwijderVastInkomen,
} from "./actions";

export function DashboardClient({ data, huidigeMaand }: { data: DashboardData; huidigeMaand: string }) {
  const [periode, setPeriode] = useState<Periode>(1);

  const geskipteIds = useMemo(() => data.geskipteUitgaven.map((g) => g.extra_uitgave_id), [data]);

  const projectie = useMemo(
    () =>
      berekenPeriodeProjectie({
        vastInkomen: data.vastInkomen,
        flexibelInkomen: data.flexibelInkomen,
        extraInkomenHuidigeMaand: data.extraInkomen,
        vasteKosten: data.vasteKosten,
        facturen: data.facturen,
        extraUitgaven: data.extraUitgaven,
        startMaand: huidigeMaand,
        aantalMaanden: periode,
      }),
    [data, huidigeMaand, periode]
  );

  // Rij 1: som over de geselecteerde periode (bij 1 maand = gewoon de huidige maand).
  const totaalInkomen = useMemo(() => projectie.reduce((s, m) => s + m.inkomen, 0), [projectie]);
  const openstaandBedrag = useMemo(() => projectie.reduce((s, m) => s + m.uitgaven, 0), [projectie]);
  const watOverblijft = berekenWatOverblijft(totaalInkomen, openstaandBedrag);

  // Huidige-maand cijfers (ongeacht periode) — nodig voor de wat-als-simulatie en tekort-voorstellen,
  // die altijd over "deze maand" gaan.
  const inkomenHuidigeMaand = useMemo(
    () =>
      berekenTotaalInkomen({
        vastInkomen: data.vastInkomen,
        flexibelInkomen: data.flexibelInkomen,
        extraInkomen: data.extraInkomen,
        maand: huidigeMaand,
      }),
    [data, huidigeMaand]
  );
  const uitgavenHuidigeMaand = useMemo(
    () =>
      berekenOpenstaandBedrag({
        vasteKosten: data.vasteKosten,
        facturen: data.facturen,
        extraUitgaven: data.extraUitgaven,
        geskipteUitgaveIds: geskipteIds,
        maand: huidigeMaand,
      }),
    [data, geskipteIds, huidigeMaand]
  );
  const watOverblijftHuidigeMaand = berekenWatOverblijft(inkomenHuidigeMaand, uitgavenHuidigeMaand);

  const voorstellen = useMemo(() => {
    if (watOverblijftHuidigeMaand >= 0) return [];
    return genereerVoorstellenBijTekort({
      tekort: Math.abs(watOverblijftHuidigeMaand),
      extraUitgaven: data.extraUitgaven,
      geskipteUitgaveIds: geskipteIds,
      doelen: data.doelen,
      vasteKosten: data.vasteKosten,
      facturen: data.facturen,
    });
  }, [watOverblijftHuidigeMaand, data, geskipteIds]);

  const vasteKostenBetaaldMap = useMemo(
    () => Object.fromEntries(data.vasteKostenBetaald.map((s) => [s.vaste_kost_id, s.betaald])),
    [data]
  );
  const facturenBetaaldMap = useMemo(
    () => Object.fromEntries(data.facturenBetaald.map((s) => [s.factuur_id, s.betaald])),
    [data]
  );

  return (
    <div className="space-y-6">
      <PeriodeSelector waarde={periode} onWijzig={setPeriode} />

      <SamenvattingKaarten
        totaalInkomen={totaalInkomen}
        openstaandBedrag={openstaandBedrag}
        watOverblijft={watOverblijft}
      />

      {periode > 1 && (
        <div className="kaart overflow-x-auto">
          <h2 className="text-lg font-bold mb-3">Projectie per maand</h2>
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-left text-tekst-secundair">
                <th className="pb-2">Maand</th>
                <th className="pb-2">Inkomen</th>
                <th className="pb-2">Uitgaven</th>
                <th className="pb-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {projectie.map((m) => (
                <tr key={m.maand} className="border-t border-rand">
                  <td className="py-2">{m.maand}</td>
                  <td className="py-2">€{m.inkomen.toFixed(2)}</td>
                  <td className="py-2">€{m.uitgaven.toFixed(2)}</td>
                  <td className={`py-2 font-bold ${m.saldo >= 0 ? "text-succes" : "text-tekort"}`}>
                    €{m.saldo.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KostenKader
          titel="Vaste kosten"
          ankerId="uitgaven-vast"
          items={data.vasteKosten}
          betaaldMap={vasteKostenBetaaldMap}
          maand={huidigeMaand}
          onZetBetaald={zetVasteKostBetaald}
          onToevoegen={voegVasteKostToe}
          onVerwijderen={verwijderVasteKost}
        />
        <KostenKader
          titel="Facturen"
          ankerId="facturen"
          items={data.facturen}
          betaaldMap={facturenBetaaldMap}
          maand={huidigeMaand}
          onZetBetaald={zetFactuurBetaald}
          onToevoegen={voegFactuurToe}
          onVerwijderen={verwijderFactuur}
        />
        <ExtraUitgavenKader
          items={data.extraUitgaven}
          geskipteIds={geskipteIds}
          onToevoegen={voegExtraUitgaveToe}
          onVerwijderen={verwijderExtraUitgave}
        />
      </div>

      <WatAlsKader
        overslaanbareUitgaven={data.extraUitgaven.filter((u) => u.overslaanbaar)}
        geskipteIds={geskipteIds}
        huidigWatOverblijft={watOverblijftHuidigeMaand}
        maand={huidigeMaand}
        onToepassen={pasWatAlsToe}
      />

      <InkomenSectie items={data.vastInkomen} onToevoegen={voegVastInkomenToe} onVerwijderen={verwijderVastInkomen} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DoelenSectie
          doelen={data.doelen}
          huidigeMaand={huidigeMaand}
          onToevoegen={voegDoelToe}
          onVerwijderen={verwijderDoel}
          onPauzeren={zetDoelGepauzeerd}
          onWisselen={wisselDoelPrioriteit}
        />
        <GoudSectie transacties={data.goudTransacties} onToevoegen={voegGoudTransactieToe} />
      </div>

      {watOverblijftHuidigeMaand < 0 && (
        <VoorstellenSectie
          voorstellen={voorstellen}
          maand={huidigeMaand}
          onSkipToepassen={pasWatAlsToe}
          onDoelPauzeren={zetDoelGepauzeerd}
        />
      )}
    </div>
  );
}
