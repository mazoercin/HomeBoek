import { redirect } from "next/navigation";
import { huidigeMaandInBrussel } from "@/lib/calculations/maand";

/** /gast zonder maand → stuur door naar de huidige kalendermaand (er is geen "laatst geregistreerde maand" server-side, dat leeft enkel in de browser). */
export default function GastRedirectPagina() {
  redirect(`/gast/${huidigeMaandInBrussel()}`);
}
