"use client";

import { useState, useTransition } from "react";
import { Mail, MailCheck } from "lucide-react";

interface Props {
  huidigeEmail: string;
  isNepAdres: boolean;
  onOpslaan: (email: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/**
 * Herstel-e-mailadres voor de eigenaar zelf — enkel nodig om ooit een
 * wachtwoord te kunnen herstellen (zie registratie: dit veld is daar
 * optioneel). Wie zonder adres registreerde, kan er hier alsnog een
 * toevoegen; wie er al een heeft, kan het wijzigen.
 */
export function HerstelEmailKaart({ huidigeEmail, isNepAdres, onOpslaan }: Props) {
  const [email, setEmail] = useState(isNepAdres ? "" : huidigeEmail);
  const [fout, setFout] = useState<string | null>(null);
  const [verzonden, setVerzonden] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    const waarde = String(formData.get("email") ?? "").trim();
    if (!waarde) {
      setFout("Vul een e-mailadres in.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onOpslaan(waarde);
      if (resultaat.gelukt) {
        setVerzonden(true);
      } else {
        setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
      }
    });
  }

  return (
    <div className="kaart">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primair-light shrink-0">
          <Mail size={17} color="#4F46E5" strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight">Herstel-e-mailadres</h2>
          <p className="text-xs text-tekst-secundair">
            Je logt in met je gebruikersnaam — dit adres is enkel nodig om ooit je wachtwoord te kunnen herstellen.
          </p>
        </div>
      </div>

      {verzonden ? (
        <div className="flex items-start gap-2.5 text-sm">
          <MailCheck size={18} color="#4F46E5" strokeWidth={2.25} className="shrink-0 mt-0.5" />
          <p className="text-tekst-secundair">
            We hebben een bevestigingsmail gestuurd. Klik op de link daarin om de wijziging af te ronden — tot dan blijft
            je huidige inlog gewoon werken.
          </p>
        </div>
      ) : (
        <>
          {isNepAdres && (
            <p className="text-sm text-tekst-secundair mb-3">Je hebt momenteel nog geen herstel-e-mailadres ingesteld.</p>
          )}
          <form action={submit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="veld-label" htmlFor="herstel-email">
                E-mailadres
              </label>
              <input
                id="herstel-email"
                name="email"
                type="email"
                className="veld-input"
                placeholder="jij@voorbeeld.be"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="knop-primair sm:mb-[1px]" disabled={isPending}>
              {isPending ? "Bezig…" : isNepAdres ? "Toevoegen" : "Wijzigen"}
            </button>
          </form>
          {fout && <p className="veld-fout mt-2">{fout}</p>}
        </>
      )}
    </div>
  );
}
