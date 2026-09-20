import type { DashboardActies, RegistreerMaandActie } from "@/types/dashboard-acties";
import { GAST_METADATA, maandVan, metMaand, nieuwId, nu, schrijfGastData, type GastData } from "./store";

type Resultaat = Promise<{ gelukt: boolean; foutmelding?: string }>;
type Bijwerken = (data: GastData) => GastData;
type ZetData = (bijwerken: Bijwerken) => void;

function ok(): Resultaat {
  return Promise.resolve({ gelukt: true });
}

/**
 * Bouwt een DashboardActies-implementatie die volledig lokaal (localStorage,
 * via `zetData`) werkt i.p.v. naar Supabase te schrijven — zelfde contract
 * als de echte server actions, zodat DashboardClient zonder wijziging
 * tussen een ingelogde sessie en gast-modus kan wisselen. `huidigeMaand`
 * ligt vast voor de levensduur van deze acties-set (net als bij de echte
 * actions, die de bekeken maand nooit zelf hoeven te kennen — de UI roept
 * ze altijd aan voor items van de maand die je toch al bekijkt).
 */
export function maakGastActies(huidigeMaand: string, zetData: ZetData): DashboardActies {
  function pas(bijwerken: Bijwerken): Resultaat {
    zetData((vorige) => {
      const volgende = bijwerken(vorige);
      schrijfGastData(volgende);
      return volgende;
    });
    return ok();
  }

  return {
    zetVasteKostBetaald: (id, betaald) =>
      pas((data) =>
        metMaand(data, huidigeMaand, (m) => ({
          ...m,
          vasteKosten: m.vasteKosten.map((k) => (k.id === id ? { ...k, betaald, updated_at: nu() } : k)),
        }))
      ),

    zetFactuurBetaald: (id, betaald) =>
      pas((data) =>
        metMaand(data, huidigeMaand, (m) => ({
          ...m,
          facturen: m.facturen.map((f) => (f.id === id ? { ...f, betaald, updated_at: nu() } : f)),
        }))
      ),

    zetExtraUitgaveGeskipt: (id, geskipt) =>
      pas((data) =>
        metMaand(data, huidigeMaand, (m) => ({
          ...m,
          extraUitgaven: m.extraUitgaven.map((u) => (u.id === id ? { ...u, geskipt, updated_at: nu() } : u)),
        }))
      ),

    pasWatAlsToe: (ids) =>
      pas((data) =>
        metMaand(data, huidigeMaand, (m) => ({
          ...m,
          extraUitgaven: m.extraUitgaven.map((u) => (ids.includes(u.id) ? { ...u, geskipt: true, updated_at: nu() } : u)),
        }))
      ),

    voegVasteKostToe: (invoer, maand) =>
      pas((data) =>
        metMaand(data, maand, (m) => ({
          ...m,
          vasteKosten: [
            ...m.vasteKosten,
            { id: nieuwId(), ...invoer, maand, betaald: false, created_at: nu(), updated_at: nu(), ...GAST_METADATA },
          ],
        }))
      ),

    verwijderVasteKost: (id) =>
      pas((data) => metMaand(data, huidigeMaand, (m) => ({ ...m, vasteKosten: m.vasteKosten.filter((k) => k.id !== id) }))),

    voegFactuurToe: (invoer, maand) =>
      pas((data) =>
        metMaand(data, maand, (m) => ({
          ...m,
          facturen: [
            ...m.facturen,
            { id: nieuwId(), ...invoer, maand, betaald: false, created_at: nu(), updated_at: nu(), ...GAST_METADATA },
          ],
        }))
      ),

    verwijderFactuur: (id) =>
      pas((data) => metMaand(data, huidigeMaand, (m) => ({ ...m, facturen: m.facturen.filter((f) => f.id !== id) }))),

    // `invoer.id` is optioneel client-gegenereerd (snel-toevoegen-FAB) —
    // staat er al een item met die id (dubbele verzending), dan is dit
    // een stille no-op i.p.v. een tweede rij toe te voegen.
    voegExtraUitgaveToe: (invoer, maand) =>
      pas((data) =>
        metMaand(data, maand, (m) =>
          invoer.id && m.extraUitgaven.some((u) => u.id === invoer.id)
            ? m
            : {
                ...m,
                extraUitgaven: [
                  ...m.extraUitgaven,
                  {
                    ...invoer,
                    id: invoer.id ?? nieuwId(),
                    maand,
                    geskipt: false,
                    created_at: nu(),
                    updated_at: nu(),
                    ...GAST_METADATA,
                  },
                ],
              }
        )
      ),

    verwijderExtraUitgave: (id) =>
      pas((data) =>
        metMaand(data, huidigeMaand, (m) => ({ ...m, extraUitgaven: m.extraUitgaven.filter((u) => u.id !== id) }))
      ),

    voegDoelToe: (invoer) =>
      pas((data) => ({
        ...data,
        doelen: [
          ...data.doelen,
          { id: nieuwId(), ...invoer, gepauzeerd: false, created_at: nu(), updated_at: nu(), ...GAST_METADATA },
        ],
      })),

    verwijderDoel: (id) =>
      pas((data) => ({
        ...data,
        doelen: data.doelen.filter((d) => d.id !== id),
        doelBijdragen: data.doelBijdragen.filter((b) => b.doel_id !== id),
      })),

    zetDoelGepauzeerd: (id, gepauzeerd) =>
      pas((data) => ({
        ...data,
        doelen: data.doelen.map((d) => (d.id === id ? { ...d, gepauzeerd, updated_at: nu() } : d)),
      })),

    herschikDoelen: (idsInNieuweVolgorde) =>
      pas((data) => ({
        ...data,
        doelen: idsInNieuweVolgorde
          .map((id, index) => {
            const doel = data.doelen.find((d) => d.id === id);
            return doel ? { ...doel, prioriteit: index } : null;
          })
          .filter((doel): doel is NonNullable<typeof doel> => doel !== null),
      })),

    voegDoelBijdrageToe: (invoer) =>
      pas((data) => ({
        ...data,
        doelBijdragen: [...data.doelBijdragen, { id: nieuwId(), ...invoer, created_at: nu(), ...GAST_METADATA }],
      })),

    voegInvesteringToe: (naam) =>
      pas((data) => ({
        ...data,
        investeringen: [...data.investeringen, { id: nieuwId(), naam, created_at: nu(), ...GAST_METADATA }],
      })),

    voegInvesteringTransactieToe: (invoer) =>
      pas((data) => ({
        ...data,
        investeringTransacties: [
          ...data.investeringTransacties,
          { id: nieuwId(), ...invoer, created_at: nu(), ...GAST_METADATA },
        ],
      })),

    hernoemInvestering: (id, naam) =>
      pas((data) => ({
        ...data,
        investeringen: data.investeringen.map((i) => (i.id === id ? { ...i, naam } : i)),
      })),

    verwijderInvestering: (id) =>
      pas((data) => ({
        ...data,
        investeringen: data.investeringen.filter((i) => i.id !== id),
        investeringTransacties: data.investeringTransacties.filter((t) => t.investering_id !== id),
      })),

    voegInkomenToe: (invoer, maand) =>
      pas((data) =>
        metMaand(data, maand, (m) => ({
          ...m,
          inkomen: [...m.inkomen, { id: nieuwId(), ...invoer, maand, created_at: nu(), updated_at: nu(), ...GAST_METADATA }],
        }))
      ),

    verwijderInkomen: (id) =>
      pas((data) => metMaand(data, huidigeMaand, (m) => ({ ...m, inkomen: m.inkomen.filter((i) => i.id !== id) }))),

    zetInkomenWeekBedragen: (inkomenId, weekBedragen) =>
      pas((data) =>
        metMaand(data, huidigeMaand, (m) => ({
          ...m,
          inkomenWeekBedragen: [
            ...m.inkomenWeekBedragen.filter((w) => w.inkomen_id !== inkomenId),
            ...weekBedragen.map((w) => ({
              id: nieuwId(),
              inkomen_id: inkomenId,
              week_nummer: w.week_nummer,
              bedrag: w.bedrag,
              created_at: nu(),
              updated_at: nu(),
              ...GAST_METADATA,
            })),
          ],
        }))
      ),

    wisData: () =>
      // dashboardVolgorde is een schikvoorkeur, geen budgetdata — blijft
      // bewust behouden bij het wissen van alle gezinsfinanciën.
      pas((data) => ({
        maanden: {},
        doelen: [],
        doelBijdragen: [],
        investeringen: [],
        investeringTransacties: [],
        dashboardVolgorde: data.dashboardVolgorde,
      })),

    zetDashboardVolgorde: (volgorde) => pas((data) => ({ ...data, dashboardVolgorde: volgorde })),
  };
}

/**
 * Los van DashboardActies: nieuwe maand registreren, optioneel gekopieerd
 * van een bestaande — spiegelt kopieer_maand()/registreer_maand() (zie
 * supabase/migrations/0018_huishoudens.sql): kopieert inkomen, vaste
 * kosten, facturen en extra uitgaven, telkens opnieuw op onbetaald/niet-
 * geskipt; extra_inkomen wordt bewust niet gekopieerd (net als server-side).
 */
export function maakGastRegistreerMaand(zetData: ZetData): RegistreerMaandActie {
  return function registreerNieuweMaand(nieuweMaand, kopieerVan) {
    zetData((data) => {
      if (data.maanden[nieuweMaand]) return data; // al geregistreerd, niets doen
      const van = kopieerVan ? maandVan(data, kopieerVan) : null;
      const volgende: GastData = {
        ...data,
        maanden: {
          ...data.maanden,
          [nieuweMaand]: van
            ? {
                inkomen: van.inkomen.map((i) => ({ ...i, id: nieuwId(), maand: nieuweMaand })),
                extraInkomen: [],
                // Weekbedragen zijn per definitie week-specifiek (dit is
                // wat er die specifieke week écht binnenkwam) — net als
                // extraInkomen bewust niet meegekopieerd naar een nieuwe
                // maand, die begint met de gewone bedrag × 4-vuistregel.
                inkomenWeekBedragen: [],
                vasteKosten: van.vasteKosten.map((k) => ({ ...k, id: nieuwId(), maand: nieuweMaand, betaald: false })),
                facturen: van.facturen.map((f) => ({ ...f, id: nieuwId(), maand: nieuweMaand, betaald: false })),
                extraUitgaven: van.extraUitgaven.map((u) => ({ ...u, id: nieuwId(), maand: nieuweMaand, geskipt: false })),
              }
            : { inkomen: [], extraInkomen: [], inkomenWeekBedragen: [], vasteKosten: [], facturen: [], extraUitgaven: [] },
        },
      };
      schrijfGastData(volgende);
      return volgende;
    });
    return ok();
  };
}
