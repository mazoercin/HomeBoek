import { requireRole } from "@/lib/auth/require-role";
import { leesLogRegels } from "@/lib/logger.server";
import { haalFamilienaam } from "@/lib/data/instellingen";
import { LogViewer } from "@/components/instellingen/LogViewer";
import { FamilienaamKaart } from "@/components/instellingen/FamilienaamKaart";
import { wisLogboek, zetFamilienaam } from "./actions";
import { uitloggen } from "../logout-action";

export default async function InstellingenPagina() {
  requireRole("admin");
  const [regels, familienaam] = await Promise.all([leesLogRegels(200), haalFamilienaam()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Instellingen</h1>
        <form action={uitloggen}>
          <button type="submit" className="knop-secundair min-h-[40px] px-4 text-sm">
            Uitloggen
          </button>
        </form>
      </div>

      <FamilienaamKaart huidigeNaam={familienaam} onOpslaan={zetFamilienaam} />

      <LogViewer regels={regels} onWissen={wisLogboek} />
    </div>
  );
}
