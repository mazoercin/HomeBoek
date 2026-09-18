"use client";

/**
 * Laat zijn kind vloeiend openklappen/inklappen door de rij-hoogte van
 * een CSS-grid te animeren (0fr → 1fr) i.p.v. abrupt te tonen/verbergen.
 * Zo "groeit" een kader zacht open zodra je op Toevoegen klikt, in
 * plaats van dat het formulier met een harde sprong verschijnt.
 */
export function Uitklapbaar({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}
