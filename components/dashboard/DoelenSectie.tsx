"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, Pause, Play, Target, PiggyBank } from "lucide-react";
import type { Doel, DoelBijdrage } from "@/types/database";
import { berekenDoelProjectie } from "@/lib/calculations/doelen";
import { StapTip } from "@/components/ui/StapTip";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { Switch } from "@/components/ui/Switch";

type ActieResultaat = Promise<{ gelukt: boolean; foutmelding?: string }>;

interface Props {
  doelen: Doel[];
  bijdragen: DoelBijdrage[];
  huidigeMaand: string;
  onToevoegen: (data: {
    naam: string;
    target_bedrag: number;
    maandelijks_bedrag: number;
    prioriteit: number;
  }) => ActieResultaat;
  onVerwijderen: (id: string) => ActieResultaat;
  onPauzeren: (id: string, gepauzeerd: boolean) => ActieResultaat;
  onHerschikken: (doelIdsInNieuweVolgorde: string[]) => ActieResultaat;
  onBijdrageToevoegen: (data: {
    doel_id: string;
    bedrag: number;
    datum: string;
    notitie: string | null;
    aftrekken_van_inkomen: boolean;
  }) => ActieResultaat;
  /** Een viewer mag niets toevoegen — de knoppen/formulieren verschijnen dan niet. */
  magToevoegen?: boolean;
}

/** Doelen zijn goud-vrij hier — investeringen krijgen hun eigen sectie op het dashboard. */
export function DoelenSectie({
  doelen,
  bijdragen,
  huidigeMaand,
  onToevoegen,
  onVerwijderen,
  onPauzeren,
  onHerschikken,
  onBijdrageToevoegen,
  magToevoegen = true,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // We bewaren lokaal enkel de VOLGORDE van id's (voor instante sleep-feedback);
  // de eigenlijke doel-data komt telkens vers uit `doelen`, zodat een pauzeer-
  // of verwijder-actie elders nooit een verouderde rij laat zien.
  const [volgordeIds, setVolgordeIds] = useState(() =>
    [...doelen].sort((a, b) => a.prioriteit - b.prioriteit).map((d) => d.id)
  );

  useEffect(() => {
    const huidigeIds = new Set(volgordeIds);
    const nieuweIds = new Set(doelen.map((d) => d.id));
    const zelfdeSet = huidigeIds.size === nieuweIds.size && [...huidigeIds].every((id) => nieuweIds.has(id));
    if (!zelfdeSet) {
      setVolgordeIds([...doelen].sort((a, b) => a.prioriteit - b.prioriteit).map((d) => d.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doelen]);

  const doelPerId = new Map(doelen.map((d) => [d.id, d]));
  const volgorde = volgordeIds.map((id) => doelPerId.get(id)).filter((d): d is Doel => d !== undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  function opDragEinde(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const vanIndex = volgordeIds.indexOf(String(active.id));
    const naarIndex = volgordeIds.indexOf(String(over.id));
    if (vanIndex === -1 || naarIndex === -1) return;

    const nieuweVolgordeIds = arrayMove(volgordeIds, vanIndex, naarIndex);
    setVolgordeIds(nieuweVolgordeIds); // instant visuele feedback, geen wachttijd op het netwerk
    startTransition(async () => {
      await onHerschikken(nieuweVolgordeIds);
    });
  }

  function submit(formData: FormData) {
    setFout(null);
    const naam = String(formData.get("naam") ?? "").trim();
    const targetBedrag = Number(formData.get("target_bedrag"));
    const maandelijksBedrag = Number(formData.get("maandelijks_bedrag"));

    if (!naam) {
      setFout("Vul een naam in.");
      return;
    }
    if (!Number.isFinite(targetBedrag) || targetBedrag <= 0) {
      setFout("Doelbedrag moet een positief getal zijn.");
      return;
    }
    if (!Number.isFinite(maandelijksBedrag) || maandelijksBedrag < 0) {
      setFout("Bedrag per maand moet 0 of hoger zijn.");
      return;
    }

    startTransition(async () => {
      const resultaat = await onToevoegen({
        naam,
        target_bedrag: targetBedrag,
        maandelijks_bedrag: maandelijksBedrag,
        prioriteit: doelen.length,
      });
      if (resultaat.gelukt) setFormOpen(false);
      else setFout(resultaat.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="doelen">
      <h2 className="text-lg font-bold tracking-tight mb-1">Spaarpot voor doelen</h2>
      <p className="text-xs text-tekst-secundair mb-4">Houd het grip-icoon vast om de volgorde te verslepen.</p>

      {volgorde.length === 0 && !formOpen && magToevoegen && (
        <StapTip
          stapNummer={5}
          titel="Stel je eerste spaardoel in (optioneel)"
          uitleg="Iets om voor te sparen, met een doelbedrag en hoeveel je er per maand voor opzij zet."
          voorbeeld="Iphone 18: €1200,00 doel, €100,00/maand"
        />
      )}
      {volgorde.length === 0 && !magToevoegen && <p className="text-sm text-tekst-secundair">Nog niets ingevuld.</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={opDragEinde}>
        <SortableContext items={volgorde.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3 mb-4">
            {volgorde.map((doel) => {
              const bijdragenVoorDoel = bijdragen.filter((b) => b.doel_id === doel.id);
              const reedsGespaard = doel.gepauzeerd ? 0 : bijdragenVoorDoel.reduce((s, b) => s + b.bedrag, 0);
              const voortgang = Math.min(100, Math.round((reedsGespaard / doel.target_bedrag) * 100));
              const projectie = berekenDoelProjectie(doel, reedsGespaard, huidigeMaand);

              return (
                <DoelRij
                  key={doel.id}
                  doel={doel}
                  reedsGespaard={reedsGespaard}
                  voortgang={voortgang}
                  projectie={projectie}
                  isPending={isPending}
                  onPauzeren={onPauzeren}
                  onVerwijderen={onVerwijderen}
                  onBijdrageToevoegen={onBijdrageToevoegen}
                  startTransition={startTransition}
                  magToevoegen={magToevoegen}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {magToevoegen && (
        <>
          <Uitklapbaar open={formOpen}>
            <form action={submit} className="space-y-3 border-t border-rand pt-4">
              <div>
                <label className="veld-label">Naam</label>
                <input name="naam" className="veld-input" required />
              </div>
              <div>
                <label className="veld-label">Doelbedrag (€)</label>
                <input name="target_bedrag" type="number" inputMode="decimal" step="0.01" min="0.01" className="veld-input" required />
              </div>
              <div>
                <label className="veld-label">Bedrag per maand (€)</label>
                <input name="maandelijks_bedrag" type="number" inputMode="decimal" step="0.01" min="0" className="veld-input" required />
              </div>
              {fout && <p className="veld-fout">{fout}</p>}
              <div className="flex gap-2">
                <button type="submit" className="knop-primair flex-1" disabled={isPending}>
                  Opslaan
                </button>
                <button type="button" className="knop-secundair" onClick={() => setFormOpen(false)}>
                  Annuleren
                </button>
              </div>
            </form>
          </Uitklapbaar>
          {!formOpen && (
            <button type="button" className="knop-secundair w-full gap-1.5" onClick={() => setFormOpen(true)}>
              <Plus size={18} strokeWidth={2.5} /> Doel toevoegen
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface DoelRijProps {
  doel: Doel;
  reedsGespaard: number;
  voortgang: number;
  projectie: { maanden: number | null; datum: string | null };
  isPending: boolean;
  onPauzeren: Props["onPauzeren"];
  onVerwijderen: Props["onVerwijderen"];
  onBijdrageToevoegen: Props["onBijdrageToevoegen"];
  startTransition: React.TransitionStartFunction;
  magToevoegen: boolean;
}

function DoelRij({
  doel,
  reedsGespaard,
  voortgang,
  projectie,
  isPending,
  onPauzeren,
  onVerwijderen,
  onBijdrageToevoegen,
  startTransition,
  magToevoegen,
}: DoelRijProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doel.id });
  const [stortingOpen, setStortingOpen] = useState(false);
  const [stortingFout, setStortingFout] = useState<string | null>(null);
  const [aftrekken, setAftrekken] = useState(false);

  const stijl = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function submitStorting(formData: FormData) {
    setStortingFout(null);
    const bedrag = Number(formData.get("bedrag"));
    if (!Number.isFinite(bedrag) || bedrag <= 0) {
      setStortingFout("Bedrag moet een positief getal zijn.");
      return;
    }
    startTransition(async () => {
      const res = await onBijdrageToevoegen({
        doel_id: doel.id,
        bedrag,
        datum: new Date().toISOString().slice(0, 10),
        notitie: null,
        aftrekken_van_inkomen: aftrekken,
      });
      if (res.gelukt) {
        setStortingOpen(false);
        setAftrekken(false);
      } else {
        setStortingFout(res.foutmelding ?? "Kon niet opslaan.");
      }
    });
  }

  return (
    <li ref={setNodeRef} style={stijl} className="rounded-xl border border-rand/70 p-3 bg-white">
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Versleep "${doel.naam}" om de prioriteit te wijzigen`}
          className="mt-0.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={19} strokeWidth={2} />
        </button>

        <span className="inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 bg-primair-light mt-0.5">
          <Target size={18} color="#4F46E5" strokeWidth={2.25} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-tekst-primair truncate leading-tight">{doel.naam}</p>
          <p className="text-xs text-tekst-secundair mt-0.5">
            <span className="font-semibold text-tekst-primair">€{reedsGespaard.toFixed(2)}</span> / €
            {doel.target_bedrag.toFixed(2)} · €{doel.maandelijks_bedrag.toFixed(2)}/maand
          </p>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full bg-gradient-primair rounded-full transition-all duration-500"
          style={{ width: `${voortgang}%` }}
        />
      </div>

      <p className="text-xs text-tekst-secundair mt-1.5">
        {doel.gepauzeerd
          ? "Gepauzeerd"
          : projectie.maanden === null
            ? "Geen maandelijks bedrag ingesteld"
            : projectie.maanden === 0
              ? "Doel al bereikt! 🎉"
              : `Bereikt over ${projectie.maanden} maand${projectie.maanden === 1 ? "" : "en"} (${projectie.datum})`}
      </p>

      {magToevoegen && (
        <Uitklapbaar open={stortingOpen}>
          <form action={submitStorting} className="space-y-2 pt-2">
            <div className="flex gap-1.5">
              <input
                name="bedrag"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="Bedrag (€)"
                className="veld-input !min-h-[36px] text-sm flex-1"
                required
                autoFocus
              />
              <button type="submit" className="knop-primair !min-h-[36px] !px-4 !text-sm" disabled={isPending}>
                OK
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
              <span className="text-xs text-tekst-secundair leading-tight">
                Aftrekken van je inkomen deze maand?
              </span>
              <Switch
                aan={aftrekken}
                onWijzig={() => setAftrekken((v) => !v)}
                label={aftrekken ? "Niet meer aftrekken van je inkomen" : "Aftrekken van je inkomen deze maand"}
                kleurAan="primair"
              />
            </div>
          </form>
          {stortingFout && <p className="veld-fout !mt-1 !text-xs">{stortingFout}</p>}
        </Uitklapbaar>
      )}

      <div className="flex gap-2 mt-3">
        {magToevoegen && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setStortingOpen((v) => !v)}
            className="knop-secundair min-h-[34px] px-3 text-xs gap-1.5"
          >
            <PiggyBank size={13} strokeWidth={2.5} /> Storting
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await onPauzeren(doel.id, !doel.gepauzeerd);
            })
          }
          className="knop-secundair min-h-[34px] px-3 text-xs gap-1.5"
        >
          {doel.gepauzeerd ? <Play size={13} strokeWidth={2.5} /> : <Pause size={13} strokeWidth={2.5} />}
          {doel.gepauzeerd ? "Hervat" : "Pauzeer"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Doel "${doel.naam}" verwijderen?`)) {
              startTransition(async () => {
                await onVerwijderen(doel.id);
              });
            }
          }}
          className="min-h-[34px] px-3 text-xs flex items-center gap-1.5 text-tekst-secundair hover:text-tekort transition rounded-full ml-auto"
        >
          <Trash2 size={13} strokeWidth={2.5} /> Verwijderen
        </button>
      </div>
    </li>
  );
}
