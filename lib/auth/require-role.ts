import { redirect } from "next/navigation";
import { haalSessie, type SessieData } from "@/lib/auth/session";
import { logger } from "@/lib/logger.server";
import type { Rol } from "@/types/database";

/**
 * Herbruikbare server-helper om een pagina of route te beschermen op
 * basis van rol. Gebruik bovenaan een Server Component of Route Handler:
 *
 *   const sessie = requireRole("admin");
 *
 * Zonder geldige sessie: doorsturen naar /login.
 * Met sessie maar verkeerde rol: AUTH_002 loggen en doorsturen naar de
 * nette "/geen-toegang"-pagina (nooit een crash of witte pagina).
 */
export function requireRole(rol: Rol): SessieData {
  const sessie = haalSessie();

  if (!sessie) {
    redirect("/login");
  }

  if (sessie.rol !== rol) {
    logger.warn({
      code: "AUTH_002",
      message: "Poging tot toegang zonder juiste rol",
      context: { gebruikerId: sessie.gebruikerId, vereisteRol: rol, huidigeRol: sessie.rol },
    });
    redirect("/geen-toegang");
  }

  return sessie;
}

/** Zoals requireRole, maar accepteert eender welke ingelogde gebruiker. */
export function requireSessie(): SessieData {
  const sessie = haalSessie();
  if (!sessie) {
    redirect("/login");
  }
  return sessie;
}
