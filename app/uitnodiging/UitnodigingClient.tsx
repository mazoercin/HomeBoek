"use client";

import { useEffect, useState, useTransition } from "react";
import { PiggyBank, Users, CircleAlert, UserPlus, LogIn } from "lucide-react";
import { bekijkUitnodiging, accepteerUitnodiging } from "@/app/gezin/actions";
import { bewaarUitnodigingToken } from "./cookie-actions";

type Status = "laden" | "geldig" | "ongeldig";

interface Props {
  ingelogd: boolean;
  gebruikersnaam: string | null;
  /** Bewaarde token uit een eerdere ronde (na registratie/e-mailbevestiging) — fallback als er geen #fragment is. */
  serverToken: string | null;
}

/**
 * Leest de token bewust uit het URL-fragment (#token), nooit uit het
 * pad of een query-parameter: fragments worden nooit naar de server
 * verstuurd, dus komen ze ook nooit in server- of toegangslogs terecht.
 * Enkel een expliciete klik op "Toetreden" doet iets — het laden van
 * deze pagina zelf (GET) verbruikt de uitnodiging niet.
 */
export function UitnodigingClient({ ingelogd, gebruikersnaam, serverToken }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("laden");
  const [info, setInfo] = useState<{
    householdNaam?: string;
    uitgenodigdDoor?: string;
    rol?: string;
    huidigHouseholdNaam?: string;
  }>({});
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const uitFragment = window.location.hash ? window.location.hash.slice(1) : null;
    const gevonden = uitFragment || serverToken;
    setToken(gevonden);

    if (!gevonden) {
      setStatus("ongeldig");
      setFout("Geen geldige uitnodigingslink gevonden.");
      return;
    }

    bekijkUitnodiging(gevonden).then((res) => {
      if (res.geldig) {
        setInfo({
          householdNaam: res.householdNaam,
          uitgenodigdDoor: res.uitgenodigdDoor,
          rol: res.rol,
          huidigHouseholdNaam: res.huidigHouseholdNaam,
        });
        setStatus("geldig");
      } else {
        setStatus("ongeldig");
        setFout(res.foutmelding ?? "Deze link is niet meer geldig.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ga(pad: "/registreren" | "/login") {
    if (!token) return;
    startTransition(async () => {
      await bewaarUitnodigingToken(token);
      window.location.href = pad;
    });
  }

  function bevestigToetreden() {
    if (!token) return;
    setFout(null);
    startTransition(async () => {
      const res = await accepteerUitnodiging(token);
      if (!res.gelukt) setFout(res.foutmelding ?? "Kon niet toetreden.");
    });
  }

  const rolLabel = info.rol === "editor" ? "mag invullen (editor)" : "kijkt mee (viewer)";

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primair shadow-lg shadow-primair/25 mb-4">
          <PiggyBank size={30} color="#ffffff" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-extrabold text-tekst-primair tracking-tight">Uitnodiging</h1>
      </div>

      <div className="kaart shadow-card-hover">
        {status === "laden" && <p className="text-sm text-tekst-secundair text-center">Bezig met laden…</p>}

        {status === "ongeldig" && (
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-tekort-bg mb-3">
              <CircleAlert size={24} color="#F43F5E" strokeWidth={2.25} />
            </div>
            <p className="font-semibold text-tekst-primair">{fout}</p>
            <p className="text-sm text-tekst-secundair mt-1">Vraag een nieuwe link aan de eigenaar van het gezin.</p>
          </div>
        )}

        {status === "geldig" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primair-light mb-3">
              <Users size={22} color="#4F46E5" strokeWidth={2.25} />
            </div>
            <p className="text-tekst-secundair text-sm">
              <span className="font-semibold text-tekst-primair">{info.uitgenodigdDoor}</span> nodigt je uit voor
            </p>
            <p className="text-xl font-extrabold text-tekst-primair mt-0.5">{info.householdNaam}</p>
            <p className="text-xs text-tekst-secundair mt-1">Jij {rolLabel}.</p>

            {info.huidigHouseholdNaam && (
              <div className="mt-4 rounded-xl bg-goud-bg border border-goud/25 p-3 text-left">
                <p className="text-xs font-semibold text-tekst-primair">
                  Let op: je hebt momenteel al een eigen dashboard bij{" "}
                  <span className="font-bold">{info.huidigHouseholdNaam}</span>.
                </p>
                <p className="text-xs text-tekst-secundair mt-1">
                  Zodra je hier toetreedt, zie je voortaan{" "}
                  <span className="font-semibold text-tekst-primair">{info.householdNaam}</span> in plaats daarvan.
                  Je oude dashboard blijft bestaan, maar is dan niet meer zichtbaar in de app.
                </p>
              </div>
            )}

            {fout && <p className="veld-fout mt-3">{fout}</p>}

            <div className="mt-5 space-y-2">
              {ingelogd ? (
                <button type="button" className="knop-primair w-full" disabled={isPending} onClick={bevestigToetreden}>
                  {isPending ? "Bezig…" : `Toetreden als ${gebruikersnaam}`}
                </button>
              ) : (
                <>
                  <button type="button" className="knop-primair w-full gap-1.5" disabled={isPending} onClick={() => ga("/registreren")}>
                    <UserPlus size={17} strokeWidth={2.25} /> Gratis account maken
                  </button>
                  <button type="button" className="knop-secundair w-full gap-1.5" disabled={isPending} onClick={() => ga("/login")}>
                    <LogIn size={17} strokeWidth={2.25} /> Ik heb al een account
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
