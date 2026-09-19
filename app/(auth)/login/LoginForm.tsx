"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

const beginState: LoginState = { fout: null };

function InlogKnop() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="knop-primair w-full" disabled={pending}>
      {pending ? "Bezig met inloggen…" : "Inloggen"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, beginState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
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
          autoComplete="current-password"
          required
          className="veld-input"
        />
      </div>

      {state.fout && (
        <p className="veld-fout" role="alert">
          {state.fout}
        </p>
      )}

      <InlogKnop />
    </form>
  );
}
