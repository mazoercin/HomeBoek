"use client";

import { useState, useTransition } from "react";
import { TrendingUp, Coins, Plus } from "lucide-react";
import type { Investering, InvesteringTransactie } from "@/types/database";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";

type ActieResultaat = Promise<{ gelukt: boolean; foutmelding?: string }>;

interface Props {
  investeringen: Investering[];
  transacties: InvesteringTransactie[];
  onInvesteringToevoegen: (naam: string) => ActieResultaat;
  onTransactieToevoegen: (data: {
    investering_id: string;
    bedrag: number;
    datum: string;
    notitie: string | null;
  }) => ActieResultaat;
}

/** Eén investeringssoort (bv. Goud, Aandelen) met zijn eigen inleg-geschiedenis en "+ Inleg"-formulier. */
function InvesteringKaart({
  investering,
  transacties,
  onToevoegen,
}: {
  investering: Investering;
  transacties: InvesteringTransactie[];
  onToevoegen: Props["onTransactieToevoegen"];
}) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totaal = transacties.reduce((som, t) => som + t.bedrag, 0);

  function submit(formData: FormData) {
    setFout(null);
    const bedrag = Number(formData.get("bedrag"));
    const datum = String(formData.get("datum") ?? "");
    const notitie = String(formData.get("notitie") ?? "").trim();

    if (!Number.isFinite(bedrag) || bedrag <= 0) return setFout("Bedrag moet een positief getal zijn.");
    if (!datum) return setFout("Kies een datum.");

    startTransition(async () => {
      const res = await onToevoegen({ investering_id: investering.id, bedrag, datum, notitie: notitie || null });
      if (res.gelukt) setOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="rounded-xl border border-goud/20 bg-gradient-to-br from-goud-bg to-white p-3">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-flex items-center justify-center rounded-full h-9 w-9 shrink-0 bg-gradient-goud shadow-sm">
          <Coins size={16} color="#ffffff" strokeWidth={2.25} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-goud truncate">{investering.naam}</p>
          <p className="text-lg font-extrabold text-goud tabular-nums leading-tight">€{totaal.toFixed(2)}</p>
        </div>
      </div>

      {transacties.length > 0 && (
        <ul className="space-y-1 mb-2">
          {transacties.slice(0, 3).map((t) => (
            <li key={t.id} className="flex justify-between items-center text-xs bg-white/60 rounded-lg px-2.5 py-1.5">
              <span className="text-tekst-secundair truncate">
                {t.datum}
                {t.notitie ? ` — ${t.notitie}` : ""}
              </span>
              <span className="font-bold tabular-nums shrink-0 ml-2">€{t.bedrag.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <Uitklapbaar open={open}>
        <form action={submit} className="space-y-2 pt-1">
          <input
            name="bedrag"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="Bedrag (€)"
            className="veld-input !min-h-[38px] text-sm"
            required
          />
          <input name="datum" type="date" className="veld-input !min-h-[38px] text-sm" required />
          <input name="notitie" placeholder="Notitie (optioneel)" className="veld-input !min-h-[38px] text-sm" />
          {fout && <p className="veld-fout !mt-1 !text-xs">{fout}</p>}
          <div className="flex gap-1.5">
            <button type="submit" className="knop-primair !min-h-[36px] flex-1 !text-sm" disabled={isPending}>
              Opslaan
            </button>
            <button type="button" className="knop-secundair !min-h-[36px] !text-sm" onClick={() => setOpen(false)}>
              Annuleren
            </button>
          </div>
        </form>
      </Uitklapbaar>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-1 min-h-[36px] rounded-full border border-goud/30 text-xs font-semibold text-goud hover:bg-goud/10 transition"
        >
          <Plus size={14} strokeWidth={2.5} /> Inleg registreren
        </button>
      )}
    </div>
  );
}

/**
 * Investeringen: uitbreidbare lijst van investeringssoorten (Goud,
 * Aandelen, Crypto, ...), elk met eigen handmatige inleg-registratie
 * — geen live koers, gewoon wat je zelf invult, net als bij Goud.
 */
export function InvesteringenSectie({ investeringen, transacties, onInvesteringToevoegen, onTransactieToevoegen }: Props) {
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totaalAlleInvesteringen = transacties.reduce((s, t) => s + t.bedrag, 0);

  function submitNieuw(formData: FormData) {
    setFout(null);
    const naam = String(formData.get("naam") ?? "").trim();
    if (!naam) return setFout("Vul een naam in.");

    startTransition(async () => {
      const res = await onInvesteringToevoegen(naam);
      if (res.gelukt) setNieuwOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <div className="kaart" id="investeringen">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} color="#D4AF37" strokeWidth={2.25} />
          <h2 className="text-lg font-bold tracking-tight">Investeringen</h2>
        </div>
        {investeringen.length > 0 && (
          <span className="text-sm font-extrabold text-goud tabular-nums">€{totaalAlleInvesteringen.toFixed(2)}</span>
        )}
      </div>

      {investeringen.length === 0 && !nieuwOpen && (
        <p className="text-tekst-secundair text-sm mb-3">
          Nog geen investeringen — voeg er eentje toe, bv. &ldquo;Goud&rdquo; of &ldquo;Aandelen&rdquo;.
        </p>
      )}

      <div className="space-y-3 mb-3">
        {investeringen.map((inv) => (
          <InvesteringKaart
            key={inv.id}
            investering={inv}
            transacties={transacties.filter((t) => t.investering_id === inv.id)}
            onToevoegen={onTransactieToevoegen}
          />
        ))}
      </div>

      <Uitklapbaar open={nieuwOpen}>
        <form action={submitNieuw} className="space-y-2 border-t border-rand pt-3">
          <input name="naam" placeholder="Bv. Aandelen, Crypto, ..." className="veld-input" required />
          {fout && <p className="veld-fout">{fout}</p>}
          <div className="flex gap-2">
            <button type="submit" className="knop-primair flex-1" disabled={isPending}>
              Opslaan
            </button>
            <button type="button" className="knop-secundair" onClick={() => setNieuwOpen(false)}>
              Annuleren
            </button>
          </div>
        </form>
      </Uitklapbaar>
      {!nieuwOpen && (
        <button type="button" className="knop-secundair w-full gap-1.5" onClick={() => setNieuwOpen(true)}>
          <Plus size={18} strokeWidth={2.5} /> Nieuwe investering
        </button>
      )}
    </div>
  );
}
