import { RotateCcw } from "lucide-react";
import { requireSessie } from "@/lib/auth/require-role";
import { haalMaandOverzicht } from "@/lib/data/overzicht";
import { maandSleutel } from "@/lib/calculations/maand";
import { OverzichtClient } from "@/components/overzicht/OverzichtClient";

export const dynamic = "force-dynamic";

export default async function OverzichtPagina() {
  requireSessie();
  const [{ maanden, fout }, vandaag] = [await haalMaandOverzicht(), maandSleutel(new Date())];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-tekst-primair">Overzicht</h1>
          <p className="text-sm text-tekst-secundair mt-0.5">Al je maanden in één oogopslag.</p>
        </div>
        <a href={`/dashboard/${vandaag}`} className="knop-secundair gap-1.5">
          <RotateCcw size={16} strokeWidth={2.25} /> Naar huidige maand
        </a>
      </div>

      {fout ? (
        <div className="kaart text-center">
          <p className="text-tekst-primair font-bold mb-2">Kon het overzicht niet laden</p>
          <p className="text-tekst-secundair mb-4">Probeer het opnieuw.</p>
          <a href="/overzicht" className="knop-primair">
            Opnieuw proberen
          </a>
        </div>
      ) : (
        <OverzichtClient maanden={maanden} />
      )}
    </div>
  );
}
