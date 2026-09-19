"use client";

import { useState, useTransition } from "react";
import { Users, KeyRound, Lock, Trash2, Check } from "lucide-react";
import type { Gebruiker } from "@/types/database";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";

type ActieResultaat = Promise<{ gelukt: boolean; foutmelding?: string }>;

interface Props {
  gebruikers: Gebruiker[];
  huidigeGebruikerId: string;
  onVerwijderen: (id: string) => ActieResultaat;
  onResetLinkSturen: (email: string) => ActieResultaat;
  onWachtwoordWijzigen: (id: string, nieuwWachtwoord: string) => ActieResultaat;
}

function formatteerDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

function GebruikerRij({
  gebruiker,
  isJezelf,
  onVerwijderen,
  onResetLinkSturen,
  onWachtwoordWijzigen,
}: {
  gebruiker: Gebruiker;
  isJezelf: boolean;
  onVerwijderen: Props["onVerwijderen"];
  onResetLinkSturen: Props["onResetLinkSturen"];
  onWachtwoordWijzigen: Props["onWachtwoordWijzigen"];
}) {
  const [isPending, startTransition] = useTransition();
  const [wachtwoordOpen, setWachtwoordOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [linkVerzonden, setLinkVerzonden] = useState(false);

  function submitWachtwoord(formData: FormData) {
    setFout(null);
    const wachtwoord = String(formData.get("wachtwoord") ?? "");
    const bevestiging = String(formData.get("wachtwoord_bevestiging") ?? "");

    if (wachtwoord.length < 8) return setFout("Wachtwoord moet minstens 8 tekens lang zijn.");
    if (wachtwoord !== bevestiging) return setFout("Wachtwoorden komen niet overeen.");

    startTransition(async () => {
      const res = await onWachtwoordWijzigen(gebruiker.id, wachtwoord);
      if (res.gelukt) setWachtwoordOpen(false);
      else setFout(res.foutmelding ?? "Kon niet opslaan.");
    });
  }

  return (
    <li className="rounded-xl border border-rand/70 p-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 ${
            gebruiker.rol === "admin" ? "bg-primair-light" : "bg-slate-100"
          }`}
        >
          <Users size={17} color={gebruiker.rol === "admin" ? "#4F46E5" : "#475569"} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-tekst-primair truncate leading-tight">{gebruiker.gebruikersnaam}</p>
            {isJezelf && <span className="text-[10px] font-bold text-primair bg-primair-light rounded-full px-1.5 py-0.5">Jij</span>}
            <span
              className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 uppercase tracking-wide ${
                gebruiker.rol === "admin" ? "text-primair bg-primair-light" : "text-tekst-secundair bg-slate-100"
              }`}
            >
              {gebruiker.rol}
            </span>
          </div>
          <p className="text-xs text-tekst-secundair truncate mt-0.5">
            {gebruiker.email} · lid sinds {formatteerDatum(gebruiker.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            aria-label={`Reset-link sturen naar ${gebruiker.email}`}
            title="Wachtwoord reset-link sturen"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await onResetLinkSturen(gebruiker.email);
                if (res.gelukt) {
                  setLinkVerzonden(true);
                  setTimeout(() => setLinkVerzonden(false), 3000);
                } else {
                  setFout(res.foutmelding ?? "Kon reset-link niet versturen.");
                }
              })
            }
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-primair hover:bg-primair-light transition"
          >
            {linkVerzonden ? <Check size={16} strokeWidth={2.5} color="#10B981" /> : <KeyRound size={16} strokeWidth={2.25} />}
          </button>
          <button
            type="button"
            aria-label={`Wachtwoord wijzigen voor ${gebruiker.gebruikersnaam}`}
            title="Wachtwoord zelf wijzigen"
            disabled={isPending}
            onClick={() => setWachtwoordOpen((v) => !v)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-primair hover:bg-primair-light transition"
          >
            <Lock size={16} strokeWidth={2.25} />
          </button>
          {!isJezelf && (
            <button
              type="button"
              aria-label={`${gebruiker.gebruikersnaam} verwijderen`}
              title="Account verwijderen"
              disabled={isPending}
              onClick={() => {
                if (confirm(`Account "${gebruiker.gebruikersnaam}" (${gebruiker.email}) volledig verwijderen?`)) {
                  startTransition(async () => {
                    const res = await onVerwijderen(gebruiker.id);
                    if (!res.gelukt) setFout(res.foutmelding ?? "Kon niet verwijderen.");
                  });
                }
              }}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekort hover:bg-tekort-bg transition"
            >
              <Trash2 size={16} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      <Uitklapbaar open={wachtwoordOpen}>
        <form action={submitWachtwoord} className="flex flex-col sm:flex-row gap-1.5 pt-3 border-t border-rand/70 mt-3">
          <input
            name="wachtwoord"
            type="password"
            placeholder="Nieuw wachtwoord"
            minLength={8}
            className="veld-input !min-h-[38px] text-sm flex-1"
            required
          />
          <input
            name="wachtwoord_bevestiging"
            type="password"
            placeholder="Bevestig wachtwoord"
            minLength={8}
            className="veld-input !min-h-[38px] text-sm flex-1"
            required
          />
          <button type="submit" className="knop-primair !min-h-[38px] !px-4 !text-sm" disabled={isPending}>
            Opslaan
          </button>
        </form>
      </Uitklapbaar>

      {fout && <p className="veld-fout !mt-2 !text-xs">{fout}</p>}
    </li>
  );
}

/** Admin-overzicht: alle geregistreerde accounts, met beheeracties per gebruiker. */
export function GebruikersBeheer({
  gebruikers,
  huidigeGebruikerId,
  onVerwijderen,
  onResetLinkSturen,
  onWachtwoordWijzigen,
}: Props) {
  return (
    <div className="kaart">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primair-light shrink-0">
          <Users size={17} color="#4F46E5" strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight">Gebruikers</h2>
          <p className="text-xs text-tekst-secundair">Alle accounts die toegang hebben tot dit dashboard.</p>
        </div>
      </div>

      {gebruikers.length === 0 ? (
        <p className="text-sm text-tekst-secundair">Nog geen gebruikers gevonden.</p>
      ) : (
        <ul className="space-y-2">
          {gebruikers.map((g) => (
            <GebruikerRij
              key={g.id}
              gebruiker={g}
              isJezelf={g.id === huidigeGebruikerId}
              onVerwijderen={onVerwijderen}
              onResetLinkSturen={onResetLinkSturen}
              onWachtwoordWijzigen={onWachtwoordWijzigen}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
