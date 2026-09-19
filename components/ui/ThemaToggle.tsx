"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const OPSLAGSLEUTEL = "saldo_thema";

function zetThema(donker: boolean) {
  document.documentElement.classList.toggle("dark", donker);
  try {
    localStorage.setItem(OPSLAGSLEUTEL, donker ? "donker" : "licht");
  } catch {
    // localStorage kan geblokkeerd zijn (privénavigatie) — thema werkt dan gewoon niet-persistent.
  }
}

/**
 * Licht/donker-schakelaar, helemaal bovenaan de navigatiebalk. Het
 * daadwerkelijke thema wordt al vóór de eerste render gezet door een
 * blocking script in de <head> (zie app/layout.tsx) — deze component
 * leest enkel de huidige class af zodat de knop meteen de juiste stand
 * toont, zonder flits.
 */
export function ThemaToggle() {
  const [donker, setDonker] = useState<boolean | null>(null);

  useEffect(() => {
    setDonker(document.documentElement.classList.contains("dark"));
  }, []);

  if (donker === null) {
    return <span className="h-9 w-9 shrink-0" aria-hidden />;
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={donker}
      aria-label={donker ? "Schakel naar lichte modus" : "Schakel naar donkere modus"}
      title={donker ? "Lichte modus" : "Donkere modus"}
      onClick={() => {
        const nieuw = !donker;
        setDonker(nieuw);
        zetThema(nieuw);
      }}
      className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-full text-tekst-secundair hover:text-primair hover:bg-primair-light transition"
    >
      {donker ? <Sun size={17} strokeWidth={2.25} /> : <Moon size={17} strokeWidth={2.25} />}
    </button>
  );
}
