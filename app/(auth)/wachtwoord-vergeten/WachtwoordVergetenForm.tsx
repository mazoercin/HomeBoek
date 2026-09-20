"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { MailCheck } from "lucide-react";
import { vraagWachtwoordResetAan, type WachtwoordVergetenState } from "./actions";

const beginState: WachtwoordVergetenState = { fout: null, verzonden: false };

function VerstuurKnop() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="knop-primair w-full" disabled={pending}>
      {pending ? "Bezig…" : "Link versturen"}
    </button>
  );
}

export function WachtwoordVergetenForm() {
  const [state, formAction] = useFormState(vraagWachtwoordResetAan, beginState);

  if (state.verzonden) {
    return (
      <div className="text-center py-2 animate-fade-in">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primair-light mb-3">
          <MailCheck size={24} color="#4F46E5" strokeWidth={2.25} />
        </div>
        <p className="font-semibold text-tekst-primair">
          Als er een account bestaat met een e-mailadres, sturen we je een link om je wachtwoord te herstellen.
        </p>
        <p className="text-sm text-tekst-secundair mt-2">
          <Link href="/login" className="font-semibold text-primair hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="identificator" className="veld-label">
          Gebruikersnaam of e-mailadres
        </label>
        <input
          id="identificator"
          name="identificator"
          type="text"
          autoComplete="username"
          required
          className="veld-input"
        />
      </div>

      {state.fout && (
        <p className="veld-fout" role="alert">
          {state.fout}
        </p>
      )}

      <VerstuurKnop />

      <p className="text-center text-sm text-tekst-secundair">
        <Link href="/login" className="font-semibold text-primair hover:underline">
          Terug naar inloggen
        </Link>
      </p>
    </form>
  );
}
