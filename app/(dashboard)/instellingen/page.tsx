import { requireRole } from "@/lib/auth/require-role";
import { leesLogRegels } from "@/lib/logger.server";
import { LogViewer } from "@/components/instellingen/LogViewer";
import { wisLogboek } from "./actions";
import { uitloggen } from "../logout-action";

export default async function InstellingenPagina() {
  requireRole("admin");
  const regels = await leesLogRegels(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Instellingen</h1>
        <form action={uitloggen}>
          <button type="submit" className="knop-secundair min-h-[40px] px-4 text-sm">
            Uitloggen
          </button>
        </form>
      </div>

      <LogViewer regels={regels} onWissen={wisLogboek} />
    </div>
  );
}
