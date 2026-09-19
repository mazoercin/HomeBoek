"use client";

import { useState } from "react";

/**
 * Houdt lange lijsten compact: toont enkel de eerste `drempel` items
 * tot de gebruiker zelf op "Toon meer" klikt. Voorkomt dat een kader
 * eindeloos blijft groeien naarmate er meer wordt ingevuld.
 */
export function useUitklapbareLijst<T>(items: T[], drempel = 10) {
  const [uitgeklapt, setUitgeklapt] = useState(false);
  const heeftMeer = items.length > drempel;
  const zichtbareItems = uitgeklapt || !heeftMeer ? items : items.slice(0, drempel);

  return {
    zichtbareItems,
    heeftMeer,
    uitgeklapt,
    wisselUitgeklapt: () => setUitgeklapt((v) => !v),
    aantalVerborgen: Math.max(0, items.length - drempel),
  };
}
