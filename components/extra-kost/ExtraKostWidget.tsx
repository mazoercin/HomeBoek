"use client";

import { useEffect, useState } from "react";
import { ExtraKostFAB } from "./ExtraKostFAB";
import { ExtraKostSheet, type ExtraKostInvoer } from "./ExtraKostSheet";
import { Toast } from "./Toast";
import { formatteerEuro } from "@/lib/calculations/geld";
import type { HouseholdRol } from "@/types/database";

export interface ExtraKostToevoegResultaat {
  gelukt: boolean;
  foutmelding?: string;
  /** True als de gekozen datum in een andere maand valt dan de bekeken maand. */
  andereMaand?: boolean;
}

interface Props {
  rol: HouseholdRol;
  onVoegToe: (invoer: ExtraKostInvoer & { id: string }) => Promise<ExtraKostToevoegResultaat>;
  onMaakOngedaan: (id: string) => void;
}

/**
 * Orchestreert de floating knop, het snel-invoerscherm en de bevestigings-
 * toast. De echte data-mutatie (optimistisch invoegen, opslaan, evt.
 * terugrollen) gebeurt in DashboardClient — dit component kent enkel UI-
 * status (open/dicht, toast) en genereert de client-UUID voor idempotente
 * dubbele-verzending-bescherming.
 */
export function ExtraKostWidget({ rol, onVoegToe, onMaakOngedaan }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ bericht: string; ongedaanMakenId: string | null } | null>(null);

  // Sneltoets N op desktop — niet als een tekstveld/textarea al focus heeft
  // (anders zou "n" typen in een ander formulier per ongeluk dit openen).
  useEffect(() => {
    function opToetsenbord(e: KeyboardEvent) {
      if (open || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() !== "n") return;
      const doel = e.target as HTMLElement | null;
      if (doel && (doel.tagName === "INPUT" || doel.tagName === "TEXTAREA" || doel.tagName === "SELECT")) return;
      if (doel?.isContentEditable) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", opToetsenbord);
    return () => window.removeEventListener("keydown", opToetsenbord);
  }, [open]);

  if (rol === "viewer") return null;

  async function voegToe(invoer: ExtraKostInvoer): Promise<{ gelukt: boolean; foutmelding?: string }> {
    const id = crypto.randomUUID();
    const resultaat = await onVoegToe({ ...invoer, id });

    if (!resultaat.gelukt) {
      return { gelukt: false, foutmelding: resultaat.foutmelding };
    }

    setToast({
      bericht: `${formatteerEuro(invoer.bedrag)} toegevoegd${resultaat.andereMaand ? ` aan ${invoer.maand}` : ""}`,
      ongedaanMakenId: id,
    });
    return { gelukt: true };
  }

  return (
    <>
      <ExtraKostFAB onKlik={() => setOpen(true)} />
      <ExtraKostSheet open={open} onSluiten={() => setOpen(false)} onVoegToe={voegToe} />
      {toast && (
        <Toast
          bericht={toast.bericht}
          onOngedaanMaken={toast.ongedaanMakenId ? () => onMaakOngedaan(toast.ongedaanMakenId as string) : undefined}
          onSluiten={() => setToast(null)}
        />
      )}
    </>
  );
}
