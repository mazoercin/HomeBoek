import { haalDashboardData } from "@/lib/data/dashboard";
import { maandSleutel } from "@/lib/calculations/maand";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPagina() {
  const huidigeMaand = maandSleutel(new Date());
  const data = await haalDashboardData(huidigeMaand);

  if (data.fout) {
    return (
      <div className="kaart text-center">
        <p className="text-tekst-primair font-bold mb-2">Kon je gegevens niet laden</p>
        <p className="text-tekst-secundair mb-4">Probeer het opnieuw.</p>
        <a href="/dashboard" className="knop-primair">
          Opnieuw proberen
        </a>
      </div>
    );
  }

  return <DashboardClient data={data} huidigeMaand={huidigeMaand} />;
}
