import { redirect } from "next/navigation";
import { haalSessie } from "@/lib/auth/session";

/**
 * Root-pagina: stuurt altijd door, toont zelf niets. Ingelogd → het
 * eigen dashboard. Niet ingelogd → de gast-modus (meteen bruikbaar
 * dashboard, lokaal bewaard) i.p.v. verplicht eerst een login-scherm —
 * inloggen/registreren blijft één klik weg via de gast-navigatiebalk.
 */
export default function StartPagina() {
  const sessie = haalSessie();
  redirect(sessie ? "/dashboard" : "/gast");
}
