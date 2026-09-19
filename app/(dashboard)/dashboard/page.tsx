import { redirect } from "next/navigation";
import { haalStandaardMaand } from "@/lib/data/maanden";

export const dynamic = "force-dynamic";

/** /dashboard zonder maand → stuur door naar de meest recente geregistreerde maand. */
export default async function DashboardRedirectPagina() {
  const maand = await haalStandaardMaand();
  redirect(`/dashboard/${maand}`);
}
