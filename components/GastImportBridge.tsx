"use client";

import { useEffect, useRef } from "react";
import { importeerGastData } from "@/app/gezin/actions";
import { heeftGastData, leesGastData, wisGastData } from "@/lib/guest/store";
import { bouwGastImportPayload } from "@/lib/guest/import";

/**
 * Onzichtbaar bruggetje in het ingelogde dashboard: had je al gegevens
 * ingevuld in gast-modus (zonder account, lokaal in de browser) vóór je
 * inlogde of een account maakte? Dan zet dit ze bij het eerstvolgende
 * bezoek aan je dashboard automatisch over naar je huishouden — zonder
 * knop, zonder tussenstap. Bewust hier (i.p.v. gekoppeld aan één
 * specifieke onboardingstap) zodat het werkt ongeacht hoe je precies bij
 * een account uitkwam. Best-effort: mislukt het, dan blijft de lokale
 * kopie gewoon staan en proberen we het bij een volgend bezoek opnieuw.
 */
export function GastImportBridge() {
  const bezig = useRef(false);

  useEffect(() => {
    if (bezig.current || !heeftGastData()) return;
    bezig.current = true;

    importeerGastData(bouwGastImportPayload(leesGastData()))
      .then((resultaat) => {
        if (resultaat.gelukt) {
          wisGastData();
          window.location.reload();
        }
      })
      .catch((error) => {
        console.error("Kon gast-data niet overzetten:", error);
      })
      .finally(() => {
        bezig.current = false;
      });
  }, []);

  return null;
}
