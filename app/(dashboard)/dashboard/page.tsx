import { redirect } from "next/navigation";
import { haalStandaardMaand } from "@/lib/data/maanden";
import { vereisHousehold } from "@/lib/auth/household";

export const dynamic = "force-dynamic";

/** /dashboard zonder maand → stuur altijd door naar de échte huidige kalendermaand. */
export default async function DashboardRedirectPagina() {
  await vereisHousehold();
  const maand = haalStandaardMaand();
  redirect(`/dashboard/${maand}`);
}
