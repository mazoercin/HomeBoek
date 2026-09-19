"use client";

import { Plus } from "lucide-react";

interface Props {
  onKlik: () => void;
}

/**
 * Ronde, altijd zichtbare knop rechtsonder om snel een extra kost toe
 * te voegen. `env(safe-area-inset-*)` zorgt dat hij op een iPhone niet
 * onder de systeem-thuisbalk/rand verdwijnt; de vaste positie ligt
 * bewust los van de scroll-container zodat hij nooit met de kop- of
 * navigatiebalk kan overlappen.
 */
export function ExtraKostFAB({ onKlik }: Props) {
  return (
    <button
      type="button"
      onClick={onKlik}
      aria-label="Extra kost toevoegen"
      title="Extra kost toevoegen (sneltoets: N)"
      style={{
        bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        right: "calc(1.25rem + env(safe-area-inset-right, 0px))",
      }}
      className="fixed z-40 h-14 w-14 flex items-center justify-center rounded-full bg-gradient-primair text-white
        shadow-lg shadow-primair/30 transition-transform duration-150 motion-reduce:transition-none
        hover:brightness-105 hover:scale-105 active:scale-95
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primair"
    >
      <Plus size={26} strokeWidth={2.5} aria-hidden />
    </button>
  );
}
