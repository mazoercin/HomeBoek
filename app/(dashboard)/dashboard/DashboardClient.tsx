"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
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
import { SleepbaarBlok } from "@/components/dashboard/SleepbaarBlok";
import { ExtraKostWidget } from "@/components/extra-kost/ExtraKostWidget";
import type { ExtraUitgave, HouseholdRol } from "@/types/database";
import type { DashboardActies, RegistreerMaandActie } from "@/types/dashboard-acties";

/**
 * Vaste standaardvolgorde van de sleepbare kaders. MaandKop (navigatie)
 * en GevarenZone (destructieve actie, bewust altijd onderaan) horen hier
 * niet bij — die blijven op hun vaste plek, slepen zou daar meer
 * verwarren dan helpen.
 */
const STANDAARD_VOLGORDE = ["samenvatting", "grafieken", "inkomen", "kosten", "wat-als", "doelen-investeringen", "voorstellen"];

/**
 * Voegt de opgeslagen volgorde samen met de vaste set kader-id's: onbekende
 * (verouderde) id's vallen weg, nieuwe kaders die nog niet in een eerder
 * opgeslagen volgorde zaten, komen automatisch achteraan te staan i.p.v.
 * te verdwijnen.
 */
function samenstellenVolgorde(opgeslagen: string[] | null): string[] {
  const geldig = new Set(STANDAARD_VOLGORDE);
  const uitOpslag = (opgeslagen ?? []).filter((id) => geldig.has(id));
  const ontbrekend = STANDAARD_VOLGORDE.filter((id) => !uitOpslag.includes(id));
  return [...uitOpslag, ...ontbrekend];
}

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
  dashboardVolgorde = null,
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
  /** Bewaarde sleep-volgorde van de kaders — null zolang niemand nog iets versleepte. */
  dashboardVolgorde?: string[] | null;
}) {
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
  // Voegt altijd toe aan de maand die je nu bekijkt (geen datumkeuze) —
  // vandaar dat dit hier meteen optimistisch kan, zonder onderscheid
  // tussen "huidige maand" en "andere maand".

  async function voegExtraKostToe(invoer: {
    id: string;
    label: string;
    bedrag: number;
  }): Promise<{ gelukt: boolean; foutmelding?: string }> {
    const optimistischItem: ExtraUitgave = {
      id: invoer.id,
      label: invoer.label,
      bedrag: invoer.bedrag,
      overslaanbaar: false,
      maand: huidigeMaand,
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

    const resultaat = await acties.voegExtraUitgaveToe(
      { id: invoer.id, label: invoer.label, bedrag: invoer.bedrag, overslaanbaar: false },
      huidigeMaand
    );

    if (!resultaat.gelukt) {
      setExtraUitgaven((prev) => prev.filter((u) => u.id !== invoer.id));
      return { gelukt: false, foutmelding: resultaat.foutmelding };
    }

    return { gelukt: true };
  }

  function maakExtraKostOngedaan(id: string) {
    setExtraUitgaven((prev) => prev.filter((u) => u.id !== id));
    void acties.verwijderExtraUitgave(id);
  }

  // ---------- Sleepbare kader-volgorde ----------
  // Enkel editor/owner mag verzetten — een "kijkt mee"-gebruiker zou
  // anders de indeling voor het hele gezin door elkaar kunnen gooien.
  const magSlepen = rol !== "viewer";
  const [, startVolgordeTransition] = useTransition();
  const [volgordeIds, setVolgordeIds] = useState(() => samenstellenVolgorde(dashboardVolgorde ?? null));
  useEffect(() => {
    setVolgordeIds(samenstellenVolgorde(dashboardVolgorde ?? null));
  }, [dashboardVolgorde]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  function opDragEinde(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setVolgordeIds((vorige) => {
      // Werkt op de VOLLEDIGE lijst (ook een kader dat deze maand niet
      // getoond wordt, bv. "voorstellen" zonder tekort) zodat zo'n
      // verborgen kader zijn plek niet verliest — enkel de zichtbare
      // kaders zijn ooit `active`/`over`, dus dit blijft correct. Zelfde
      // arrayMove-aanpak als DoelenSectie: rechtstreeks op index werken
      // (i.p.v. zelf verwijderen+invoegen) is nodig omdat de richting van
      // de sleep bepaalt vóór of ná het doel-item ingevoegd moet worden.
      const vanIndex = vorige.indexOf(activeId);
      const naarIndex = vorige.indexOf(overId);
      if (vanIndex === -1 || naarIndex === -1) return vorige;
      const nieuw = arrayMove(vorige, vanIndex, naarIndex);
      startVolgordeTransition(() => {
        void acties.zetDashboardVolgorde(nieuw);
      });
      return nieuw;
    });
  }

  const blokken: Record<string, { zichtbaar: boolean; element: ReactNode }> = {
    samenvatting: {
      zichtbaar: true,
      element: (
        <ScrollReveal>
          <SamenvattingKaarten
            totaalInkomen={inkomenHuidigeMaand}
            openstaandBedrag={uitgavenHuidigeMaand}
            watOverblijft={watOverblijftHuidigeMaand}
            betaaldHuidigeMaand={betaaldHuidigeMaand}
            nogTeBetalenHuidigeMaand={nogTeBetalenHuidigeMaand}
          />
        </ScrollReveal>
      ),
    },
    grafieken: {
      zichtbaar: true,
      element: (
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
      ),
    },
    inkomen: {
      zichtbaar: true,
      element: (
        <ScrollReveal>
          <InkomenSectie
            items={data.inkomen}
            onToevoegen={(d) => acties.voegInkomenToe(d, huidigeMaand)}
            onVerwijderen={acties.verwijderInkomen}
          />
        </ScrollReveal>
      ),
    },
    kosten: {
      zichtbaar: true,
      element: (
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
      ),
    },
    "wat-als": {
      zichtbaar: true,
      element: (
        <ScrollReveal>
          <WatAlsKader
            overslaanbareUitgaven={extraUitgaven.filter((u) => u.overslaanbaar)}
            huidigWatOverblijft={watOverblijftHuidigeMaand}
            onToepassen={acties.pasWatAlsToe}
          />
        </ScrollReveal>
      ),
    },
    "doelen-investeringen": {
      zichtbaar: true,
      element: (
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
      ),
    },
    voorstellen: {
      zichtbaar: watOverblijftHuidigeMaand < 0,
      element: (
        <ScrollReveal>
          <VoorstellenSectie voorstellen={voorstellen} onSkipToepassen={acties.pasWatAlsToe} onDoelPauzeren={acties.zetDoelGepauzeerd} />
        </ScrollReveal>
      ),
    },
  };

  const zichtbareVolgorde = volgordeIds.filter((id) => blokken[id]?.zichtbaar);

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={opDragEinde}>
        <SortableContext items={zichtbareVolgorde} strategy={verticalListSortingStrategy}>
          <div className="space-y-6 lg:space-y-8">
            {zichtbareVolgorde.map((id) => (
              <SleepbaarBlok key={id} id={id} actief={magSlepen}>
                {blokken[id]?.element}
              </SleepbaarBlok>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {rol === "owner" && (
        <ScrollReveal>
          <GevarenZone onWissen={acties.wisData} />
        </ScrollReveal>
      )}

      <ExtraKostWidget rol={rol} onVoegToe={voegExtraKostToe} onMaakOngedaan={maakExtraKostOngedaan} />
    </div>
  );
}
