"use client";

import { useState, useTransition } from "react";
import { PiggyBank, Mail } from "lucide-react";
import { startNieuwHousehold } from "./actions";

export function StartHouseholdForm() {
  const [naam, setNaam] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    const waarde = String(formData.get("naam") ?? "").trim();
    startTransition(async () => {
      const res = await startNieuwHousehold(waarde);
      if (!res.gelukt) setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="kaart shadow-card-hover">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primair-light shrink-0">
            <PiggyBank size={19} color="#4F46E5" strokeWidth={2.25} />
          </span>
          <div>
            <h2 className="font-bold text-tekst-primair leading-tight">Nieuw gezinsbudget starten</h2>
            <p className="text-xs text-tekst-secundair">Jij wordt de eigenaar — je kan later gezinsleden uitnodigen.</p>
          </div>
        </div>
        <form action={submit} className="space-y-3">
          <input
            name="naam"
            className="veld-input"
            placeholder="Bv. Familie Mazmahor"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
          />
          {fout && <p className="veld-fout">{fout}</p>}
          <button type="submit" className="knop-primair w-full" disabled={isPending}>
            {isPending ? "Bezig…" : "Starten"}
          </button>
        </form>
      </div>

      <a href="/uitnodiging" className="kaart flex items-center gap-3 hover:shadow-card-hover transition-shadow">
        <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-secundair-light shrink-0">
          <Mail size={19} color="#D97706" strokeWidth={2.25} />
        </span>
        <div>
          <p className="font-bold text-tekst-primair leading-tight">Ik heb een uitnodiging</p>
          <p className="text-xs text-tekst-secundair">Plak de link die je van een gezinslid kreeg.</p>
        </div>
      </a>
    </div>
  );
}
