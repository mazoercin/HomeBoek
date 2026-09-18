import { redirect } from "next/navigation";
import { haalSessie } from "@/lib/auth/session";

/** Root-pagina: stuurt altijd door naar login of het dashboard, toont zelf niets. */
export default function StartPagina() {
  const sessie = haalSessie();
  redirect(sessie ? "/dashboard" : "/login");
}
