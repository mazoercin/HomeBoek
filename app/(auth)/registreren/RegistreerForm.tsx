"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { MailCheck, TriangleAlert } from "lucide-react";
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

function DoorgaanZonderEmailKnop() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="knop-primair !min-h-[44px]" disabled={pending}>
      {pending ? "Bezig…" : "Toch doorgaan"}
    </button>
  );
}

export function RegistreerForm() {
  const [state, formAction] = useFormState(registreer, beginState);
  const router = useRouter();
  // Eén keer getoond, dan mag de echte submit door — de invoer zelf
  // (incl. het lege e-mailveld) blijft in dezelfde <form> staan, dus
  // een herhaalde submit stuurt gewoon opnieuw exact wat er al stond.
  const [toonWaarschuwing, setToonWaarschuwing] = useState(false);

  useEffect(() => {
    if (state.gelukt && !state.wachtOpBevestiging) {
      router.push("/dashboard");
    }
  }, [state, router]);

  function opSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (toonWaarschuwing) return;
    const email = (new FormData(e.currentTarget).get("email") as string | null)?.trim();
    if (!email) {
      e.preventDefault();
      setToonWaarschuwing(true);
    }
  }

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
    <form action={formAction} onSubmit={opSubmit} className="space-y-4" noValidate>
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
        <p className="text-xs text-tekst-secundair mt-1.5">Mag verzonnen zijn — dit is wat je gebruikt om in te loggen.</p>
      </div>

      <div>
        <label htmlFor="email" className="veld-label">
          E-mailadres
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className="veld-input" />
        <p className="text-xs text-tekst-secundair mt-1.5">
          Optioneel. Alleen nodig om je wachtwoord te herstellen. Laat leeg als je liever geen e-mailadres opgeeft. Een
          verzonnen e-mailadres werkt niet: je kan het niet bevestigen en dus niet inloggen.
        </p>
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

      {toonWaarschuwing ? (
        <div className="rounded-xl border border-dashed border-tekort/30 p-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert size={18} color="#F43F5E" strokeWidth={2.25} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-tekst-primair">
                Zonder e-mailadres kan je je wachtwoord niet herstellen. Bewaar het goed.
              </p>
              <div className="flex gap-2 mt-3">
                <DoorgaanZonderEmailKnop />
                <button
                  type="button"
                  onClick={() => setToonWaarschuwing(false)}
                  className="knop-secundair !min-h-[44px] !px-4 shrink-0"
                >
                  Terug
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {state.fout && (
            <p className="veld-fout" role="alert">
              {state.fout}
            </p>
          )}
          <RegistreerKnop />
        </>
      )}
    </form>
  );
}
