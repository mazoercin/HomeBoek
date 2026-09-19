import { redirect } from "next/navigation";
import { haalStandaardMaand } from "@/lib/data/maanden";

/** /dashboard zonder maand → stuur door naar de meest recente geregistreerde maand. */
export default async function DashboardRedirectPagina() {
  const maand = await haalStandaardMaand();
  redirect(`/dashboard/${maand}`);
}
