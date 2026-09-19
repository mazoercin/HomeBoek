"use client";

import { useEffect, useMemo } from "react";
import type { DashboardData } from "@/lib/data/dashboard";
import {
  berekenTotaalInkomen,
  berekenOpenstaandBedrag,
  berekenNogTeBetalen,
  berekenWatOverblijft,
  berekenBijdragenAftrekVoorMaand,
  genereerVoorstellenBijTekort,
} from "@/lib/calculations";
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
import type { HouseholdRol } from "@/types/database";
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
  // Next.js onthoudt soms de scrollpositie van een eerder bezoek aan
  // dezelfde URL. Bij het wisselen van maand moet je altijd bovenaan
  // dat nieuwe dashboard landen, dus forceren we dat expliciet i.p.v.
  // te vertrouwen op scroll-restoration.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [huidigeMaand]);

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

      <ScrollReveal>
        <SamenvattingKaarten
          totaalInkomen={inkomenHuidigeMaand}
          openstaandBedrag={uitgavenHuidigeMaand}
          watOverblijft={watOverblijftHuidigeMaand}
          betaaldHuidigeMaand={betaaldHuidigeMaand}
          nogTeBetalenHuidigeMaand={nogTeBetalenHuidigeMaand}
        />
      </ScrollReveal>

      <ScrollReveal>
        <GrafiekenSectie
          inkomen={data.inkomen}
          vasteKosten={data.vasteKosten}
          extraUitgaven={data.extraUitgaven}
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
            items={data.extraUitgaven}
            onToevoegen={(d) => acties.voegExtraUitgaveToe(d, huidigeMaand)}
            onVerwijderen={acties.verwijderExtraUitgave}
            onZetGeskipt={acties.zetExtraUitgaveGeskipt}
          />
        </ScrollReveal>
      </div>

      <ScrollReveal>
        <WatAlsKader
          overslaanbareUitgaven={data.extraUitgaven.filter((u) => u.overslaanbaar)}
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
    </div>
  );
}
