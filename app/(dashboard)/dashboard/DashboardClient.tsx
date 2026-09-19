"use client";

import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/data/dashboard";
import {
  berekenTotaalInkomen,
  berekenOpenstaandBedrag,
  berekenNogTeBetalen,
  berekenWatOverblijft,
  berekenPeriodeProjectie,
  berekenBijdragenAftrekVoorMaand,
  genereerVoorstellenBijTekort,
} from "@/lib/calculations";
import { PeriodeSelector, type Periode } from "@/components/dashboard/PeriodeSelector";
import { MaandKop } from "@/components/dashboard/MaandKop";
import { SamenvattingKaarten } from "@/components/dashboard/SamenvattingKaarten";
import { InkomenSectie } from "@/components/dashboard/InkomenSectie";
import { KostenKader } from "@/components/dashboard/KostenKader";
import { ExtraUitgavenKader } from "@/components/dashboard/ExtraUitgavenKader";
import { WatAlsKader } from "@/components/dashboard/WatAlsKader";
import { DoelenSectie } from "@/components/dashboard/DoelenSectie";
import { InvesteringenSectie } from "@/components/dashboard/InvesteringenSectie";
import { VoorstellenSectie } from "@/components/dashboard/VoorstellenSectie";
import { GrafiekenSectie } from "@/components/dashboard/GrafiekenSectie";
import { GevarenZone } from "@/components/dashboard/GevarenZone";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  zetVasteKostBetaald,
  zetFactuurBetaald,
  zetExtraUitgaveGeskipt,
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
  herschikDoelen,
  voegDoelBijdrageToe,
  voegInvesteringToe,
  voegInvesteringTransactieToe,
  hernoemInvestering,
  verwijderInvestering,
  voegInkomenToe,
  verwijderInkomen,
  wisAlleData,
} from "./actions";

export function DashboardClient({
  data,
  huidigeMaand,
  familienaam,
  alleMaanden,
}: {
  data: DashboardData;
  huidigeMaand: string;
  familienaam: string | null;
  alleMaanden: string[];
}) {
  const [periode, setPeriode] = useState<Periode>(1);

  const projectie = useMemo(
    () =>
      berekenPeriodeProjectie({
        inkomen: data.inkomen,
        extraInkomenHuidigeMaand: data.extraInkomen,
        vasteKosten: data.vasteKosten,
        facturen: data.facturen,
        extraUitgaven: data.extraUitgaven,
        doelBijdragen: data.doelBijdragen,
        startMaand: huidigeMaand,
        aantalMaanden: periode,
      }),
    [data, huidigeMaand, periode]
  );

  // Rij 1: som over de geselecteerde periode (bij 1 maand = gewoon de bekeken maand).
  const totaalInkomen = useMemo(() => projectie.reduce((s, m) => s + m.inkomen, 0), [projectie]);
  const openstaandBedrag = useMemo(() => projectie.reduce((s, m) => s + m.uitgaven, 0), [projectie]);
  const watOverblijft = berekenWatOverblijft(totaalInkomen, openstaandBedrag);

  // Cijfers van de bekeken maand zelf (ongeacht periode) — nodig voor de
  // wat-als-simulatie en tekort-voorstellen, die altijd over die ene maand gaan.
  const inkomenHuidigeMaand = useMemo(
    () =>
      berekenTotaalInkomen({
        inkomen: data.inkomen,
        extraInkomen: data.extraInkomen,
        maand: huidigeMaand,
      }) - berekenBijdragenAftrekVoorMaand(data.doelBijdragen, huidigeMaand),
    [data, huidigeMaand]
  );
  const uitgavenHuidigeMaand = useMemo(
    () =>
      berekenOpenstaandBedrag({
        vasteKosten: data.vasteKosten,
        facturen: data.facturen,
        extraUitgaven: data.extraUitgaven,
      }),
    [data]
  );
  const watOverblijftHuidigeMaand = berekenWatOverblijft(inkomenHuidigeMaand, uitgavenHuidigeMaand);

  // Betaald/nog-te-betalen-opsplitsing geldt enkel voor vaste kosten + facturen
  // (extra uitgaven hebben geen betaald-status).
  const kostenMetBetaalStatus = useMemo(
    () => berekenOpenstaandBedrag({ vasteKosten: data.vasteKosten, facturen: data.facturen, extraUitgaven: [] }),
    [data]
  );
  const nogTeBetalenHuidigeMaand = useMemo(
    () => berekenNogTeBetalen({ vasteKosten: data.vasteKosten, facturen: data.facturen }),
    [data]
  );
  const betaaldHuidigeMaand = kostenMetBetaalStatus - nogTeBetalenHuidigeMaand;
  // Vaste kosten + facturen van deze maand, ongeacht betaald-status en
  // ongeacht de gekozen periode-tab — dit blijft altijd "deze maand".
  const totaalOpenstaandHuidigeMaand = kostenMetBetaalStatus;

  const voorstellen = useMemo(() => {
    if (watOverblijftHuidigeMaand >= 0) return [];
    return genereerVoorstellenBijTekort({
      tekort: Math.abs(watOverblijftHuidigeMaand),
      extraUitgaven: data.extraUitgaven,
      doelen: data.doelen,
      vasteKosten: data.vasteKosten,
      facturen: data.facturen,
    });
  }, [watOverblijftHuidigeMaand, data]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-tekst-primair">
          {familienaam ?? "Jullie"} <span className="text-primair">— Gezinsfinanciën</span>
        </h1>
        <p className="text-sm text-tekst-secundair mt-0.5">Alles overzichtelijk op één plek.</p>
      </div>

      <ScrollReveal>
        <MaandKop huidigeMaand={huidigeMaand} alleMaanden={alleMaanden} />
      </ScrollReveal>

      <PeriodeSelector waarde={periode} onWijzig={setPeriode} />

      <ScrollReveal>
        <SamenvattingKaarten
          totaalInkomen={totaalInkomen}
          openstaandBedrag={openstaandBedrag}
          watOverblijft={watOverblijft}
          betaaldHuidigeMaand={betaaldHuidigeMaand}
          nogTeBetalenHuidigeMaand={nogTeBetalenHuidigeMaand}
          totaalOpenstaandHuidigeMaand={totaalOpenstaandHuidigeMaand}
        />
      </ScrollReveal>

      {periode > 1 && (
        <div className="kaart overflow-x-auto animate-fade-in">
          <h2 className="text-lg font-bold tracking-tight mb-4">Projectie per maand</h2>
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-left text-tekst-secundair">
                <th className="pb-2 text-[11px] uppercase tracking-wide font-semibold">Maand</th>
                <th className="pb-2 text-[11px] uppercase tracking-wide font-semibold">Inkomen</th>
                <th className="pb-2 text-[11px] uppercase tracking-wide font-semibold">Uitgaven</th>
                <th className="pb-2 text-[11px] uppercase tracking-wide font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {projectie.map((m) => (
                <tr key={m.maand} className="border-t border-rand/70">
                  <td className="py-2.5 font-medium">{m.maand}</td>
                  <td className="py-2.5 tabular-nums">€{m.inkomen.toFixed(2)}</td>
                  <td className="py-2.5 tabular-nums">€{m.uitgaven.toFixed(2)}</td>
                  <td className={`py-2.5 font-bold tabular-nums ${m.saldo >= 0 ? "text-succes" : "text-tekort"}`}>
                    €{m.saldo.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ScrollReveal>
        <GrafiekenSectie
          inkomen={data.inkomen}
          vasteKosten={data.vasteKosten}
          extraUitgaven={data.extraUitgaven}
          onInkomenToevoegen={(d) => voegInkomenToe(d, huidigeMaand)}
          onVasteKostToevoegen={(d) => voegVasteKostToe(d, huidigeMaand)}
          onExtraUitgaveToevoegen={(d) => voegExtraUitgaveToe(d, huidigeMaand)}
        />
      </ScrollReveal>

      <ScrollReveal>
        <InkomenSectie
          items={data.inkomen}
          onToevoegen={(d) => voegInkomenToe(d, huidigeMaand)}
          onVerwijderen={verwijderInkomen}
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        <ScrollReveal vertraging={0}>
          <KostenKader
            titel="Vaste kosten"
            ankerId="uitgaven-vast"
            stapTip={{
              nummer: 2,
              titel: "Voeg je vaste kosten toe",
              uitleg: "Kosten die maandelijks terugkomen en niet zomaar stopbaar zijn: huur, verzekering, kredieten.",
              voorbeeld: "Huur — €1750,00",
            }}
            items={data.vasteKosten}
            onZetBetaald={zetVasteKostBetaald}
            onToevoegen={(d) => voegVasteKostToe(d, huidigeMaand)}
            onVerwijderen={verwijderVasteKost}
          />
        </ScrollReveal>
        <ScrollReveal vertraging={80}>
          <KostenKader
            titel="Facturen"
            ankerId="facturen"
            stapTip={{
              nummer: 3,
              titel: "Voeg je facturen toe",
              uitleg: "Elektriciteit, mazout/gas, water, internet — alles wat per factuur binnenkomt.",
              voorbeeld: "Elektriciteit — €120,00",
            }}
            items={data.facturen}
            onZetBetaald={zetFactuurBetaald}
            onToevoegen={(d) => voegFactuurToe(d, huidigeMaand)}
            onVerwijderen={verwijderFactuur}
          />
        </ScrollReveal>
        <ScrollReveal vertraging={160}>
          <ExtraUitgavenKader
            items={data.extraUitgaven}
            onToevoegen={(d) => voegExtraUitgaveToe(d, huidigeMaand)}
            onVerwijderen={verwijderExtraUitgave}
            onZetGeskipt={zetExtraUitgaveGeskipt}
          />
        </ScrollReveal>
      </div>

      <ScrollReveal>
        <WatAlsKader
          overslaanbareUitgaven={data.extraUitgaven.filter((u) => u.overslaanbaar)}
          huidigWatOverblijft={watOverblijftHuidigeMaand}
          onToepassen={pasWatAlsToe}
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <ScrollReveal vertraging={0}>
          <DoelenSectie
            doelen={data.doelen}
            bijdragen={data.doelBijdragen}
            huidigeMaand={huidigeMaand}
            onToevoegen={voegDoelToe}
            onVerwijderen={verwijderDoel}
            onPauzeren={zetDoelGepauzeerd}
            onHerschikken={herschikDoelen}
            onBijdrageToevoegen={voegDoelBijdrageToe}
          />
        </ScrollReveal>
        <ScrollReveal vertraging={80}>
          <InvesteringenSectie
            investeringen={data.investeringen}
            transacties={data.investeringTransacties}
            onInvesteringToevoegen={voegInvesteringToe}
            onTransactieToevoegen={voegInvesteringTransactieToe}
            onHernoemen={hernoemInvestering}
            onVerwijderen={verwijderInvestering}
          />
        </ScrollReveal>
      </div>

      {watOverblijftHuidigeMaand < 0 && (
        <ScrollReveal>
          <VoorstellenSectie voorstellen={voorstellen} onSkipToepassen={pasWatAlsToe} onDoelPauzeren={zetDoelGepauzeerd} />
        </ScrollReveal>
      )}

      <ScrollReveal>
        <GevarenZone onWissen={wisAlleData} />
      </ScrollReveal>
    </div>
  );
}
