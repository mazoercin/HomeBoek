import { redirect } from "next/navigation";
import { haalSessie } from "@/lib/auth/session";
import { heeftBasisdata } from "@/lib/auth/gebruiker";

/** Root-pagina: stuurt altijd door naar de juiste plek, toont zelf niets. */
export default async function StartPagina() {
  const sessie = haalSessie();

  if (!sessie) {
    redirect("/login");
  }

  const heeftData = await heeftBasisdata();
  redirect(heeftData ? "/dashboard" : "/onboarding");
}
