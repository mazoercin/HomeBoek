"use client";

import { Plus } from "lucide-react";

interface Props {
  onKlik: () => void;
}

/**
 * Ronde, altijd zichtbare knop rechtsonder om snel een extra kost toe
 * te voegen. `env(safe-area-inset-*)` zorgt dat hij op een iPhone niet
 * onder de systeem-thuisbalk/rand verdwijnt.
 *
 * De buitenste laag is bewust `position: fixed` met een expliciete
 * `100dvh`-hoogte (met `h-screen`/`100vh` als fallback voor browsers
 * zonder dvh-steun) i.p.v. de knop zelf simpelweg `fixed; bottom: ...`
 * te geven: een `fixed`-element zonder eigen hoogte wordt door de
 * browser gepositioneerd t.o.v. de "grote" viewport (inclusief de
 * ruimte die een mobiele adresbalk NORMAAL inneemt, ook als die
 * ingeklapt is) — dan kan de knop letterlijk buiten het zichtbare,
 * aanklikbare gebied vallen. `dvh` volgt wél de echt zichtbare
 * viewport, dus de knop zit altijd waar je hem ziet.
 */
export function ExtraKostFAB({ onKlik }: Props) {
  return (
    <div className="fixed top-0 left-0 w-full h-screen z-40 pointer-events-none" style={{ height: "100dvh" }}>
      <button
        type="button"
        onClick={onKlik}
        aria-label="Extra kost toevoegen"
        title="Extra kost toevoegen (sneltoets: N)"
        style={{
          bottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))",
          right: "calc(1.25rem + env(safe-area-inset-right, 0px))",
        }}
        className="absolute pointer-events-auto h-14 w-14 flex items-center justify-center rounded-full bg-gradient-primair text-white
          shadow-lg shadow-primair/30 transition-transform duration-150 motion-reduce:transition-none
          hover:brightness-105 hover:scale-105 active:scale-95
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primair"
      >
        <Plus size={26} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
