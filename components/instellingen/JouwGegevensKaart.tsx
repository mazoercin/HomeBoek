"use client";

import { useState } from "react";
import { Download, ShieldAlert, TriangleAlert } from "lucide-react";
import type { VerwijderScope } from "@/lib/auth/account-verwijderen";
import { VerwijderAccountFormulier } from "./VerwijderAccountFormulier";

interface DownloadResultaat {
  gelukt: boolean;
  bestand?: string;
  bestandsnaam?: string;
  foutmelding?: string;
}

interface Props {
  scope: VerwijderScope;
  /** Gebruikersnamen van de gezinsleden die mee verdwijnen — enkel relevant bij scope "huishouden". */
  gezinsledenNamen: string[];
  onDownloaden: () => Promise<DownloadResultaat>;
  onVerwijderen: (wachtwoord: string) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/** Zet een JSON-string om naar een browserdownload, zonder een nieuwe server-endpoint. */
function downloadAlsBestand(inhoud: string, bestandsnaam: string) {
  const blob = new Blob([inhoud], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * "Jouw gegevens" op /instellingen: downloaden (export) en het eigen
 * account verwijderen. Het verwijder-blok staat achter een expliciete
 * "Account verwijderen"-toggle — de bevestiging zelf (wachtwoord +
 * "VERWIJDEREN" intikken) zit in VerwijderAccountFormulier.
 */
export function JouwGegevensKaart({ scope, gezinsledenNamen, onDownloaden, onVerwijderen }: Props) {
  const [verwijderOpen, setVerwijderOpen] = useState(false);
  const [downloadBezig, setDownloadBezig] = useState(false);
  const [downloadFout, setDownloadFout] = useState<string | null>(null);

  async function download() {
    setDownloadFout(null);
    setDownloadBezig(true);
    try {
      const res = await onDownloaden();
      if (!res.gelukt || !res.bestand || !res.bestandsnaam) {
        setDownloadFout(res.foutmelding ?? "Kon je gegevens niet downloaden.");
        return;
      }
      downloadAlsBestand(res.bestand, res.bestandsnaam);
    } finally {
      setDownloadBezig(false);
    }
  }

  return (
    <div className="kaart">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primair-light shrink-0">
          <ShieldAlert size={17} color="#4F46E5" strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight">Jouw gegevens</h2>
          <p className="text-xs text-tekst-secundair">Download je gegevens, of verwijder je account.</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-rand/70 p-3">
        <div>
          <p className="font-semibold text-tekst-primair text-sm">Download mijn gegevens</p>
          <p className="text-xs text-tekst-secundair mt-0.5">Eén bestand (.json) met alles wat je zelf hebt ingevuld.</p>
        </div>
        <button type="button" onClick={download} disabled={downloadBezig} className="knop-secundair !min-h-[40px] !px-4 !text-sm gap-1.5">
          <Download size={15} strokeWidth={2.25} /> {downloadBezig ? "Bezig..." : "Downloaden"}
        </button>
      </div>
      {downloadFout && <p className="veld-fout !mt-2">{downloadFout}</p>}

      <div className="rounded-xl border border-dashed border-tekort/30 p-3 mt-3">
        {!verwijderOpen ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-tekst-primair text-sm">Account verwijderen</p>
              <p className="text-xs text-tekst-secundair mt-0.5">
                {scope === "huishouden"
                  ? "Verwijdert je account, het hele huishouden en alle gezinsleden-accounts. Kan niet ongedaan gemaakt worden."
                  : "Verwijdert enkel je eigen account. Je ingevulde gegevens blijven bij het huishouden staan."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVerwijderOpen(true)}
              className="min-h-[40px] px-4 rounded-full text-sm font-bold text-tekort border border-tekort/30 hover:bg-tekort-bg transition"
            >
              Account verwijderen
            </button>
          </div>
        ) : (
          <div className="animate-fade-in space-y-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-tekort-bg shrink-0">
                <TriangleAlert size={17} color="#F43F5E" strokeWidth={2.25} />
              </span>
              <div>
                <p className="font-bold text-tekst-primair">Weet je het zeker?</p>
                {scope === "huishouden" ? (
                  <>
                    <p className="text-sm text-tekst-secundair mt-0.5">
                      Je bent de enige eigenaar van dit huishouden. Je account verwijderen neemt het hele
                      huishouden mee, inclusief de accounts van:
                    </p>
                    <ul className="text-sm text-tekst-primair font-semibold mt-1.5 space-y-0.5">
                      {gezinsledenNamen.map((naam) => (
                        <li key={naam}>· {naam}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-tekst-secundair mt-2">
                      Wil je liever alleen zelf weg zonder de rest van het gezin mee te verwijderen? Draag
                      eerst eigenaarschap over aan een gezinslid bij Gezinsleden hierboven.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-tekst-secundair mt-0.5">
                    Je account verdwijnt en je kan niet meer inloggen. Je ingevulde inkomen, kosten en doelen
                    blijven gewoon bestaan voor de rest van het gezin — dat is het verschil met &ldquo;Verlaat
                    gezin&rdquo; (dat laat enkel je account los, zonder het te verwijderen) en &ldquo;Alle data
                    wissen&rdquo; (dat wist juist de data terwijl je account blijft bestaan).
                  </p>
                )}
                <p className="text-xs text-tekst-secundair mt-2">
                  Download eerst je gegevens hierboven als je ze wil bewaren — dat kan hierna niet meer.
                </p>
              </div>
            </div>

            <VerwijderAccountFormulier onVerwijderen={onVerwijderen} />

            <button type="button" onClick={() => setVerwijderOpen(false)} className="knop-secundair w-full !min-h-[40px] !text-sm">
              Annuleren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
