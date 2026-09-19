"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { MailCheck } from "lucide-react";
import { registreer, type RegistreerState } from "./actions";

const beginState: RegistreerState = { fout: null, gelukt: false, wachtOpBevestiging: false };

function RegistreerKnop() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="knop-primair w-full" disabled={pending}>
      {pending ? "Bezig met registreren…" : "Account aanmaken"}
    </button>
  );
}

export function RegistreerForm() {
  const [state, formAction] = useFormState(registreer, beginState);
  const router = useRouter();

  useEffect(() => {
    if (state.gelukt && !state.wachtOpBevestiging) {
      router.push("/dashboard");
    }
  }, [state, router]);

  if (state.gelukt && state.wachtOpBevestiging) {
    return (
      <div className="text-center py-2 animate-fade-in">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primair-light mb-3">
          <MailCheck size={24} color="#4F46E5" strokeWidth={2.25} />
        </div>
        <p className="font-semibold text-tekst-primair">Bijna klaar!</p>
        <p className="text-sm text-tekst-secundair mt-1">
          We hebben je een bevestigingsmail gestuurd. Klik op de link daarin en log daarna in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="gebruikersnaam" className="veld-label">
          Gebruikersnaam
        </label>
        <input
          id="gebruikersnaam"
          name="gebruikersnaam"
          type="text"
          autoComplete="nickname"
          required
          className="veld-input"
        />
      </div>

      <div>
        <label htmlFor="email" className="veld-label">
          E-mailadres
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="veld-input" />
      </div>

      <div>
        <label htmlFor="wachtwoord" className="veld-label">
          Wachtwoord
        </label>
        <input
          id="wachtwoord"
          name="wachtwoord"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="veld-input"
        />
      </div>

      <div>
        <label htmlFor="wachtwoord_bevestiging" className="veld-label">
          Wachtwoord bevestigen
        </label>
        <input
          id="wachtwoord_bevestiging"
          name="wachtwoord_bevestiging"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="veld-input"
        />
      </div>

      {state.fout && (
        <p className="veld-fout" role="alert">
          {state.fout}
        </p>
      )}

      <RegistreerKnop />
    </form>
  );
}
