"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { DashboardClient } from "@/app/(dashboard)/dashboard/DashboardClient";
import { GastBanner } from "@/components/gast/GastBanner";
import { leegGastData, leesGastData, maandVan, metMaand, schrijfGastData, type GastData } from "@/lib/guest/store";
import { maakGastActies, maakGastRegistreerMaand } from "@/lib/guest/actions";
import type { DashboardData } from "@/lib/data/dashboard";

const MAAND_PATROON = /^\d{4}-\d{2}$/;

/**
 * Gast-variant van app/(dashboard)/dashboard/[maand]/page.tsx: exact
 * dezelfde UI (DashboardClient/MaandKop), maar volledig client-side
 * gevoed vanuit localStorage i.p.v. Supabase — zie lib/guest/store.ts +
 * lib/guest/actions.ts. Bewust "use client": er is hier geen server-side
 * data om op te halen, en localStorage bestaat enkel in de browser. Om
 * een hydration-mismatch te vermijden (de server kent de lokale data
 * niet) tonen we eerst een korte laadstatus en vullen we pas na mount
 * vanuit localStorage.
 *
 * In tegenstelling tot de ingelogde variant is er hier geen expliciete
 * "registreer deze maand eerst"-stap: gast-modus moet zonder wrijving
 * meteen bruikbaar zijn, dus een nog niet bezochte maand wordt gewoon
 * automatisch (leeg) klaargezet.
 */
export default function GastDashboardPagina({ params }: { params: { maand: string } }) {
  const { maand } = params;
  if (!MAAND_PATROON.test(maand)) notFound();

  const [gastData, setGastData] = useState<GastData>(() => leegGastData());
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    let data = leesGastData();
    if (!data.maanden[maand]) {
      data = metMaand(data, maand, (m) => m);
      schrijfGastData(data);
    }
    setGastData(data);
    setGeladen(true);
  }, [maand]);

  if (!geladen) {
    return <div className="kaart text-center text-tekst-secundair">Bezig met laden…</div>;
  }

  const alleMaanden = Object.keys(gastData.maanden).sort();
  const onRegistreerMaand = maakGastRegistreerMaand(setGastData);
  const maandData = maandVan(gastData, maand);
  const data: DashboardData = {
    inkomen: maandData.inkomen,
    extraInkomen: maandData.extraInkomen,
    vasteKosten: maandData.vasteKosten,
    facturen: maandData.facturen,
    extraUitgaven: maandData.extraUitgaven,
    doelen: gastData.doelen,
    doelBijdragen: gastData.doelBijdragen,
    investeringen: gastData.investeringen,
    investeringTransacties: gastData.investeringTransacties,
    fout: false,
  };

  return (
    <div className="space-y-6">
      <GastBanner />
      <DashboardClient
        data={data}
        huidigeMaand={maand}
        householdNaam="Jouw voorbeeldgezin"
        rol="owner"
        alleMaanden={alleMaanden}
        acties={maakGastActies(maand, setGastData)}
        onRegistreerMaand={onRegistreerMaand}
        basisPad="/gast"
        toonOverzicht={false}
        dashboardVolgorde={gastData.dashboardVolgorde}
      />
    </div>
  );
}
