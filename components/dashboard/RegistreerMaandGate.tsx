"use client";

import { useState, useTransition } from "react";
import { registreerNieuweMaand } from "@/app/(dashboard)/dashboard/actions";

/**
 * Wordt getoond als je naar een maand navigeert die nog niet
 * geregistreerd is. Na een geslaagde registratie doen we bewust een
 * volledige page-navigatie (window.location) i.p.v. een Next.js-
 * transitie, om elke kans op een verouderde, gecachete weergave van
 * die nieuwe maand uit te sluiten.
 */
export function RegistreerMaandGate({ maand }: { maand: string }) {
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function registreer() {
    setFout(null);
    startTransition(async () => {
      const res = await registreerNieuweMaand(maand, null);
      if (res.gelukt) {
        window.location.href = `/dashboard/${maand}`;
      } else {
        setFout(res.foutmelding ?? "Kon niet registreren.");
      }
    });
  }

  return (
    <div className="kaart text-center max-w-md mx-auto">
      <p className="text-tekst-primair font-bold mb-2">Deze maand is nog niet geregistreerd</p>
      <p className="text-tekst-secundair mb-4">Registreer &ldquo;{maand}&rdquo; om er gegevens voor in te vullen.</p>
      <button type="button" className="knop-primair" disabled={isPending} onClick={registreer}>
        {isPending ? "Bezig…" : `Registreer ${maand}`}
      </button>
      {fout && <p className="veld-fout mt-2">{fout}</p>}
    </div>
  );
}
