import { notFound } from "next/navigation";
import { haalDashboardData } from "@/lib/data/dashboard";
import { haalGeregistreerdeMaanden } from "@/lib/data/maanden";
import { vereisHousehold } from "@/lib/auth/household";
import { RegistreerMaandGate } from "@/components/dashboard/RegistreerMaandGate";
import { DashboardClient } from "../DashboardClient";

const MAAND_PATROON = /^\d{4}-\d{2}$/;

// Nooit cachen: financiële data moet altijd vers zijn, en zonder dit
// kon Next.js na een mutatie (bv. een nieuwe maand registreren) nog
// even een verouderde versie van deze pagina teruggeven.
export const dynamic = "force-dynamic";

export default async function DashboardMaandPagina({ params }: { params: { maand: string } }) {
  const { maand } = params;
  if (!MAAND_PATROON.test(maand)) notFound();

  const context = await vereisHousehold();

  const [data, geregistreerdeMaanden] = await Promise.all([
    haalDashboardData(context.householdId, maand),
    haalGeregistreerdeMaanden(context.householdId),
  ]);

  if (data.fout) {
    return (
      <div className="kaart text-center">
        <p className="text-tekst-primair font-bold mb-2">Kon je gegevens niet laden</p>
        <p className="text-tekst-secundair mb-4">Probeer het opnieuw.</p>
        <a href={`/dashboard/${maand}`} className="knop-primair">
          Opnieuw proberen
        </a>
      </div>
    );
  }

  const alleMaanden = geregistreerdeMaanden.map((m) => m.maand);
  const isGeregistreerd = alleMaanden.includes(maand);

  if (!isGeregistreerd) {
    return <RegistreerMaandGate maand={maand} />;
  }

  return (
    <DashboardClient
      data={data}
      huidigeMaand={maand}
      householdNaam={context.householdNaam}
      rol={context.rol}
      alleMaanden={alleMaanden}
    />
  );
}
