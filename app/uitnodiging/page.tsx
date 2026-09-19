import { haalSessie } from "@/lib/auth/session";
import { haalUitnodigingToken } from "@/lib/auth/uitnodiging-cookie";
import { UitnodigingClient } from "./UitnodigingClient";

export const dynamic = "force-dynamic";

export default function UitnodigingPagina() {
  const sessie = haalSessie();
  // Val terug op een eerder bewaarde token (na een registratie/e-mail-
  // bevestigingsronde is de originele #token uit de URL al verloren).
  const serverToken = haalUitnodigingToken();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
      <div className="w-full max-w-sm animate-fade-in-up">
        <UitnodigingClient
          ingelogd={!!sessie}
          gebruikersnaam={sessie?.gebruikersnaam ?? null}
          serverToken={serverToken}
        />
      </div>
    </main>
  );
}
