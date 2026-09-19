import { notFound } from "next/navigation";
import { haalDashboardData } from "@/lib/data/dashboard";
import { haalFamilienaam } from "@/lib/data/instellingen";
import { haalGeregistreerdeMaanden } from "@/lib/data/maanden";
import { registreerNieuweMaand } from "../actions";
import { DashboardClient } from "../DashboardClient";

const MAAND_PATROON = /^\d{4}-\d{2}$/;

export default async function DashboardMaandPagina({ params }: { params: { maand: string } }) {
  const { maand } = params;
  if (!MAAND_PATROON.test(maand)) notFound();

  const [data, familienaam, geregistreerdeMaanden] = await Promise.all([
    haalDashboardData(maand),
    haalFamilienaam(),
    haalGeregistreerdeMaanden(),
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
    async function registreerActie() {
      "use server";
      await registreerNieuweMaand(maand, null);
    }

    return (
      <div className="kaart text-center max-w-md mx-auto">
        <p className="text-tekst-primair font-bold mb-2">Deze maand is nog niet geregistreerd</p>
        <p className="text-tekst-secundair mb-4">Registreer &ldquo;{maand}&rdquo; om er gegevens voor in te vullen.</p>
        <form action={registreerActie}>
          <button type="submit" className="knop-primair">
            Registreer {maand}
          </button>
        </form>
      </div>
    );
  }

  return (
    <DashboardClient
      data={data}
      huidigeMaand={maand}
      familienaam={familienaam}
      alleMaanden={alleMaanden}
    />
  );
}
