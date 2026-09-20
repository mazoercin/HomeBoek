"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

const BEVESTIG_WOORD = "VERWIJDEREN";

interface Props {
  onVerwijderen: (wachtwoord: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
  submitLabel?: string;
}

/**
 * De eigenlijke twee-staps-bevestiging (wachtwoord + het letterlijk
 * intikken van "VERWIJDEREN"), los van JouwGegevensKaart zodat dit ook
 * hergebruikt kan worden op het /gezin/starten-herstelpad (een account
 * zonder huishouden-rij, bv. na een eerder mislukte verwijdering).
 * Bij succes stuurt de Server Action zelf door (redirect()) — hier hoeft
 * dan niets meer te gebeuren.
 */
export function VerwijderAccountFormulier({ onVerwijderen, submitLabel = "Account definitief verwijderen" }: Props) {
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestigTekst, setBevestigTekst] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const magVerwijderen = wachtwoord.length > 0 && bevestigTekst === BEVESTIG_WOORD && !isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!magVerwijderen) return;
        setFout(null);
        startTransition(async () => {
          const res = await onVerwijderen(wachtwoord);
          if (!res.gelukt) setFout(res.foutmelding ?? "Kon je account niet verwijderen.");
        });
      }}
      className="space-y-3"
    >
      <div>
        <label htmlFor="verwijder-wachtwoord" className="veld-label">
          Je huidige wachtwoord
        </label>
        <input
          id="verwijder-wachtwoord"
          type="password"
          autoComplete="current-password"
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          className="veld-input"
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="verwijder-bevestiging" className="veld-label">
          Typ <span className="font-mono font-bold">{BEVESTIG_WOORD}</span> om te bevestigen
        </label>
        <input
          id="verwijder-bevestiging"
          type="text"
          autoComplete="off"
          value={bevestigTekst}
          onChange={(e) => setBevestigTekst(e.target.value)}
          className="veld-input font-mono"
          disabled={isPending}
        />
      </div>

      {fout && (
        <p className="veld-fout flex items-center gap-1.5">
          <AlertTriangle size={14} strokeWidth={2.25} className="shrink-0" /> {fout}
        </p>
      )}

      <button
        type="submit"
        disabled={!magVerwijderen}
        className="w-full min-h-[44px] rounded-full bg-tekort text-white font-bold transition active:scale-[0.97] hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isPending ? "Bezig..." : submitLabel}
      </button>
    </form>
  );
}
