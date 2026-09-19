import { redirect } from "next/navigation";
import { haalStandaardMaand } from "@/lib/data/maanden";
import { vereisHousehold } from "@/lib/auth/household";

export const dynamic = "force-dynamic";

/** /dashboard zonder maand → stuur door naar de meest recente geregistreerde maand. */
export default async function DashboardRedirectPagina() {
  const context = await vereisHousehold();
  const maand = await haalStandaardMaand(context.householdId);
  redirect(`/dashboard/${maand}`);
}
