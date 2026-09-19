"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ExtraKostWidget, type ExtraKostToevoegResultaat } from "@/components/extra-kost/ExtraKostWidget";
import type { ExtraKostInvoer } from "@/components/extra-kost/ExtraKostSheet";
import type { ExtraUitgave, HouseholdRol } from "@/types/database";
import type { DashboardActies, RegistreerMaandActie } from "@/types/dashboard-acties";

export function DashboardClient({
  data,
  huidigeMaand,
  householdNaam,
  rol,
  alleMaanden,
  acties,
  onRegistreerMaand,
  basisPad = "/dashboard",
  toonOverzicht = true,
}: {
  data: DashboardData;
  huidigeMaand: string;
  householdNaam: string;
  rol: HouseholdRol;
  alleMaanden: string[];
  /** Of dit écht naar Supabase schrijft of enkel lokaal (gast-modus) — zie types/dashboard-acties.ts. */
  acties: DashboardActies;
  onRegistreerMaand: RegistreerMaandActie;
  basisPad?: string;
  toonOverzicht?: boolean;
}) {
  const [periode, setPeriode] = useState<Periode>(1);

  // Optimistische kopie van de extra uitgaven van deze maand: de FAB
  // (snel-toevoegen) muteert dit meteen, zonder op het netwerk te
  // wachten, en elke bestaande berekening/kaart hieronder leest hiervan
  // i.p.v. rechtstreeks van `data.extraUitgaven` — dus geen tweede,
  // parallelle rekenlogica, enkel een lokale spiegel van dezelfde data.
  // Zodra de server (of, in gast-modus, localStorage) een verse `data`
  // teruggeeft, synct dit weer mee.
  const [extraUitgaven, setExtraUitgaven] = useState(data.extraUitgaven);
  useEffect(() => {
    setExtraUitgaven(data.extraUitgaven);
  }, [data.extraUitgaven]);

  // Id van een net (optimistisch) toegevoegde extra kost — even gemarkeerd
  // in de lijst, daarna vanzelf weer normaal.
  const [nieuwItemId, setNieuwItemId] = useState<string | null>(null);
  useEffect(() => {
    if (!nieuwItemId) return;
    const tijdje = setTimeout(() => setNieuwItemId(null), 1500);
    return () => clearTimeout(tijdje);
  }, [nieuwItemId]);

  // Next.js onthoudt soms de scrollpositie van een eerder bezoek aan
  // dezelfde URL. Bij het wisselen van maand moet je altijd bovenaan
  // dat nieuwe dashboard landen, dus forceren we dat expliciet i.p.v.
  // te vertrouwen op scroll-restoration.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [huidigeMaand]);

  const projectie = useMemo(
    () =>
      berekenPeriodeProjectie({
        inkomen: data.inkomen,
        extraInkomenHuidigeMaand: data.extraInkomen,
        vasteKosten: data.vasteKosten,
        facturen: data.facturen,
        extraUitgaven,
        doelBijdragen: data.doelBijdragen,
        startMaand: huidigeMaand,
        aantalMaanden: periode,
      }),
    [data, extraUitgaven, huidigeMaand, periode]
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
        extraUitgaven,
      }),
    [data, extraUitgaven]
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

  const voorstellen = useMemo(() => {
    if (watOverblijftHuidigeMaand >= 0) return [];
    return genereerVoorstellenBijTekort({
      tekort: Math.abs(watOverblijftHuidigeMaand),
      extraUitgaven,
      doelen: data.doelen,
      vasteKosten: data.vasteKosten,
      facturen: data.facturen,
    });
  }, [watOverblijftHuidigeMaand, data, extraUitgaven]);

  // ---------- Extra-kost-FAB: optimistisch toevoegen/ongedaan maken ----------

  async function voegExtraKostToe(invoer: ExtraKostInvoer & { id: string }): Promise<ExtraKostToevoegResultaat> {
    const isHuidigeMaand = invoer.maand === huidigeMaand;

    if (isHuidigeMaand) {
      const optimistischItem: ExtraUitgave = {
        id: invoer.id,
        label: invoer.label,
        bedrag: invoer.bedrag,
        overslaanbaar: false,
        maand: invoer.maand,
        geskipt: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        household_id: "",
        created_by: null,
        updated_by: null,
        version: 1,
      };
      setExtraUitgaven((prev) => [optimistischItem, ...prev]);
      setNieuwItemId(invoer.id);
    }

    const resultaat = await acties.voegExtraUitgaveToe(
      { id: invoer.id, label: invoer.label, bedrag: invoer.bedrag, overslaanbaar: false },
      invoer.maand
    );

    if (!resultaat.gelukt) {
      if (isHuidigeMaand) {
        setExtraUitgaven((prev) => prev.filter((u) => u.id !== invoer.id));
      }
      return { gelukt: false, foutmelding: resultaat.foutmelding };
    }

    return { gelukt: true, andereMaand: !isHuidigeMaand };
  }

  function maakExtraKostOngedaan(id: string) {
    setExtraUitgaven((prev) => prev.filter((u) => u.id !== id));
    void acties.verwijderExtraUitgave(id);
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-tekst-primair">
          {householdNaam} <span className="text-primair">— Gezinsfinanciën</span>
        </h1>
        <p className="text-sm text-tekst-secundair mt-0.5">Alles overzichtelijk op één plek.</p>
      </div>

      <ScrollReveal>
        <MaandKop
          huidigeMaand={huidigeMaand}
          alleMaanden={alleMaanden}
          onRegistreerMaand={onRegistreerMaand}
          basisPad={basisPad}
          toonOverzicht={toonOverzicht}
        />
      </ScrollReveal>

      <PeriodeSelector waarde={periode} onWijzig={setPeriode} />

      <ScrollReveal>
        <SamenvattingKaarten
          totaalInkomen={totaalInkomen}
          openstaandBedrag={openstaandBedrag}
          watOverblijft={watOverblijft}
          betaaldHuidigeMaand={betaaldHuidigeMaand}
          nogTeBetalenHuidigeMaand={nogTeBetalenHuidigeMaand}
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
          extraUitgaven={extraUitgaven}
          onInkomenToevoegen={(d) => acties.voegInkomenToe(d, huidigeMaand)}
          onVasteKostToevoegen={(d) => acties.voegVasteKostToe(d, huidigeMaand)}
          onExtraUitgaveToevoegen={(d) => acties.voegExtraUitgaveToe(d, huidigeMaand)}
        />
      </ScrollReveal>

      <ScrollReveal>
        <InkomenSectie
          items={data.inkomen}
          onToevoegen={(d) => acties.voegInkomenToe(d, huidigeMaand)}
          onVerwijderen={acties.verwijderInkomen}
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
            onZetBetaald={acties.zetVasteKostBetaald}
            onToevoegen={(d) => acties.voegVasteKostToe(d, huidigeMaand)}
            onVerwijderen={acties.verwijderVasteKost}
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
            onZetBetaald={acties.zetFactuurBetaald}
            onToevoegen={(d) => acties.voegFactuurToe(d, huidigeMaand)}
            onVerwijderen={acties.verwijderFactuur}
          />
        </ScrollReveal>
        <ScrollReveal vertraging={160}>
          <ExtraUitgavenKader
            items={extraUitgaven}
            onToevoegen={(d) => acties.voegExtraUitgaveToe(d, huidigeMaand)}
            onVerwijderen={acties.verwijderExtraUitgave}
            onZetGeskipt={acties.zetExtraUitgaveGeskipt}
            highlightId={nieuwItemId}
          />
        </ScrollReveal>
      </div>

      <ScrollReveal>
        <WatAlsKader
          overslaanbareUitgaven={extraUitgaven.filter((u) => u.overslaanbaar)}
          huidigWatOverblijft={watOverblijftHuidigeMaand}
          onToepassen={acties.pasWatAlsToe}
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <ScrollReveal vertraging={0}>
          <DoelenSectie
            doelen={data.doelen}
            bijdragen={data.doelBijdragen}
            huidigeMaand={huidigeMaand}
            onToevoegen={acties.voegDoelToe}
            onVerwijderen={acties.verwijderDoel}
            onPauzeren={acties.zetDoelGepauzeerd}
            onHerschikken={acties.herschikDoelen}
            onBijdrageToevoegen={acties.voegDoelBijdrageToe}
          />
        </ScrollReveal>
        <ScrollReveal vertraging={80}>
          <InvesteringenSectie
            investeringen={data.investeringen}
            transacties={data.investeringTransacties}
            onInvesteringToevoegen={acties.voegInvesteringToe}
            onTransactieToevoegen={acties.voegInvesteringTransactieToe}
            onHernoemen={acties.hernoemInvestering}
            onVerwijderen={acties.verwijderInvestering}
          />
        </ScrollReveal>
      </div>

      {watOverblijftHuidigeMaand < 0 && (
        <ScrollReveal>
          <VoorstellenSectie
            voorstellen={voorstellen}
            onSkipToepassen={acties.pasWatAlsToe}
            onDoelPauzeren={acties.zetDoelGepauzeerd}
          />
        </ScrollReveal>
      )}

      {rol === "owner" && (
        <ScrollReveal>
          <GevarenZone onWissen={acties.wisData} />
        </ScrollReveal>
      )}

      <ExtraKostWidget rol={rol} onVoegToe={voegExtraKostToe} onMaakOngedaan={maakExtraKostOngedaan} />
    </div>
  );
}
