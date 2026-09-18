"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OnboardingVoortgang } from "./OnboardingVoortgang";
import { Stap1Inkomen } from "./Stap1Inkomen";
import { StapKosten } from "./StapKosten";
import { Stap4ExtraUitgaven } from "./Stap4ExtraUitgaven";
import { Stap5Doelen } from "./Stap5Doelen";
import { slaOnboardingOp, type OnboardingData } from "@/lib/data/onboarding";

const LEEG: OnboardingData = {
  vast_inkomen: [],
  flexibel_inkomen: [],
  vaste_kosten: [],
  facturen: [],
  extra_uitgaven: [],
  doelen: [],
};

export function OnboardingWizard() {
  const router = useRouter();
  const [stap, setStap] = useState(0);
  const [data, setData] = useState<OnboardingData>(LEEG);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function volgende() {
    setFout(null);
    if (stap === 0 && data.vast_inkomen.length === 0) {
      setFout("Voeg minstens 1 bron van vast inkomen toe.");
      return;
    }
    if (stap < 4) {
      setStap(stap + 1);
      return;
    }
    // Laatste stap: alles in één transactie opslaan.
    startTransition(async () => {
      const resultaat = await slaOnboardingOp(data);
      if (resultaat.gelukt) {
        router.push("/dashboard");
      } else {
        setFout(resultaat.foutmelding ?? "Er ging iets mis. Probeer opnieuw.");
      }
    });
  }

  function vorige() {
    setFout(null);
    setStap(Math.max(0, stap - 1));
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">💰</div>
        <h1 className="text-xl font-extrabold">Welkom bij Saldo</h1>
        <p className="text-tekst-secundair text-sm">Laten we jullie basisgegevens instellen.</p>
      </div>

      <OnboardingVoortgang huidigeStap={stap} />

      <div className="kaart">
        {stap === 0 && (
          <Stap1Inkomen
            vastInkomen={data.vast_inkomen}
            flexibelInkomen={data.flexibel_inkomen}
            onWijzigVast={(items) => setData((d) => ({ ...d, vast_inkomen: items }))}
            onWijzigFlexibel={(items) => setData((d) => ({ ...d, flexibel_inkomen: items }))}
            fout={fout}
            setFout={setFout}
          />
        )}
        {stap === 1 && (
          <StapKosten
            titel="Vaste kosten"
            toelichting="Niet-stopbare kosten: huis, verzekering, kredieten."
            items={data.vaste_kosten}
            onWijzig={(items) => setData((d) => ({ ...d, vaste_kosten: items }))}
            fout={fout}
            setFout={setFout}
          />
        )}
        {stap === 2 && (
          <StapKosten
            titel="Facturen"
            toelichting="Elektriciteit, mazout/gas, water, internet."
            items={data.facturen}
            onWijzig={(items) => setData((d) => ({ ...d, facturen: items }))}
            fout={fout}
            setFout={setFout}
          />
        )}
        {stap === 3 && (
          <Stap4ExtraUitgaven
            items={data.extra_uitgaven}
            onWijzig={(items) => setData((d) => ({ ...d, extra_uitgaven: items }))}
            fout={fout}
            setFout={setFout}
          />
        )}
        {stap === 4 && (
          <Stap5Doelen
            items={data.doelen}
            onWijzig={(items) => setData((d) => ({ ...d, doelen: items }))}
            fout={fout}
            setFout={setFout}
          />
        )}

        <div className="flex gap-2 mt-6 border-t border-rand pt-4">
          {stap > 0 && (
            <button type="button" className="knop-secundair" onClick={vorige} disabled={isPending}>
              Vorige
            </button>
          )}
          <button type="button" className="knop-primair flex-1" onClick={volgende} disabled={isPending}>
            {isPending ? "Bezig met opslaan…" : stap === 4 ? "Afronden" : "Volgende"}
          </button>
        </div>
      </div>
    </div>
  );
}
