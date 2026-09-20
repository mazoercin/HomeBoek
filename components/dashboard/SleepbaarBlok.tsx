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
 * enkele bestaande kaartcomponent aan: het legt enkel een grijpbaar
 * handvat over de rechterbovenhoek. Altijd zichtbaar (niet enkel bij
 * hover) zodat het ook op mobiel/touch werkt, waar "hover" niet bestaat.
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
    <div ref={setNodeRef} style={stijl} className="relative" data-testid={`dashboard-blok-${id}`}>
      {actief && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Versleep dit kader om de volgorde te wijzigen"
          data-testid={`dashboard-blok-${id}-handvat`}
          className="absolute right-3 top-3 z-10 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg bg-kaart/80 backdrop-blur-sm text-slate-300 hover:text-slate-500 hover:bg-slate-50 cursor-grab active:cursor-grabbing touch-none shadow-sm"
        >
          <GripVertical size={17} strokeWidth={2} />
        </button>
      )}
      {children}
    </div>
  );
}
