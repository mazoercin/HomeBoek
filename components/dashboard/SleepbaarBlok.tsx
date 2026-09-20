"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Props {
  id: string;
  actief: boolean;
  children: React.ReactNode;
}

/**
 * Generieke sleep-wrapper voor een heel dashboard-kader — anders dan bij
 * DoelenSectie (die een individueel listitem versleept) raakt dit geen
 * enkele bestaande kaartcomponent aan.
 *
 * Het handvat krijgt een eigen dun strookje BOVEN de kaart i.p.v. erover
 * heen gelegd te worden: een eerdere versie overlapte de rechterbovenhoek
 * van de kaart zelf, wat bij kaarten die daar al iets tonen (bv. het
 * totaalbedrag boven "Investeringen") het handvat over die tekst heen
 * legde — onoverzichtelijk, en soms zelfs onklikbaar. Een eigen rij
 * kan nooit met de inhoud van een kaart botsen, ongeacht wat daarin
 * staat. Altijd zichtbaar (niet enkel bij hover) zodat het ook op
 * mobiel/touch werkt, waar "hover" niet bestaat.
 */
export function SleepbaarBlok({ id, actief, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !actief,
  });

  const stijl = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={stijl} data-testid={`dashboard-blok-${id}`}>
      {actief && (
        <div className="flex justify-end mb-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Versleep dit kader om de volgorde te wijzigen"
            data-testid={`dashboard-blok-${id}-handvat`}
            className="min-h-[28px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100/70 cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical size={16} strokeWidth={2} />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
