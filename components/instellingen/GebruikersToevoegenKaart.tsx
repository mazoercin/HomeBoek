"use client";

import { useState, useTransition } from "react";
import { UserPlus, Copy, Check } from "lucide-react";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";

const MAX_EXTRA_LEDEN = 2;

interface Props {
  aantalExtraLeden: number;
  onAanmaken: (input: {
    gebruikersnaam: string;
    wachtwoord: string;
    rol: "editor" | "viewer";
    email: string | null;
  }) => Promise<{ gelukt: boolean; foutmelding?: string }>;
}

/**
 * Vervangt de vroegere deelbare uitnodigingslink: de eigenaar maakt hier
 * zélf een account (gebruikersnaam + wachtwoord + rol) voor een gezinslid
 * aan. Dat account bestaat meteen mét toegang tot dit huishouden — geen
 * registratie, e-mailbevestiging of aparte toetreed-stap voor de andere
 * persoon nodig. Max. 2 extra gebruikers per huishouden.
 */
export function GebruikersToevoegenKaart({ aantalExtraLeden, onAanmaken }: Props) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [aangemaakt, setAangemaakt] = useState<{ gebruikersnaam: string; wachtwoord: string } | null>(null);
  const [gekopieerd, setGekopieerd] = useState<"gebruikersnaam" | "wachtwoord" | null>(null);
  const [isPending, startTransition] = useTransition();

  const limietBereikt = aantalExtraLeden >= MAX_EXTRA_LEDEN;

  function submit(formData: FormData) {
    setFout(null);
    const gebruikersnaam = String(formData.get("gebruikersnaam") ?? "").trim();
    const wachtwoord = String(formData.get("wachtwoord") ?? "");
    const rol = String(formData.get("rol") ?? "viewer") as "editor" | "viewer";
    const email = String(formData.get("email") ?? "").trim() || null;

    startTransition(async () => {
      const res = await onAanmaken({ gebruikersnaam, wachtwoord, rol, email });
      if (res.gelukt) {
        setAangemaakt({ gebruikersnaam, wachtwoord });
      } else {
        setFout(res.foutmelding ?? "Kon het account niet aanmaken.");
      }
    });
  }

  function kopieer(veld: "gebruikersnaam" | "wachtwoord", waarde: string) {
    navigator.clipboard.writeText(waarde).then(() => {
      setGekopieerd(veld);
      setTimeout(() => setGekopieerd(null), 2000);
    });
  }

  return (
    <div className="kaart">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primair-light shrink-0">
            <UserPlus size={17} color="#4F46E5" strokeWidth={2.25} />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight leading-tight">Gezinslid toevoegen</h2>
            <p className="text-xs text-tekst-secundair">
              {limietBereikt
                ? `Max. ${MAX_EXTRA_LEDEN} extra gebruikers bereikt.`
                : "Maak zelf een account aan: geef gebruikersnaam en wachtwoord door."}
            </p>
          </div>
        </div>
        {!open && !limietBereikt && (
          <button type="button" className="knop-secundair !min-h-[38px] !px-4 !text-sm" onClick={() => setOpen(true)}>
            Toevoegen
          </button>
        )}
      </div>

      <Uitklapbaar open={open && !limietBereikt}>
        {aangemaakt ? (
          <div className="rounded-xl bg-succes-bg border border-succes/20 p-4 space-y-3">
            <p className="text-sm text-tekst-primair font-semibold">Account aangemaakt, geef dit door:</p>
            <div className="space-y-2">
              <div>
                <label className="veld-label">Gebruikersnaam</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={aangemaakt.gebruikersnaam} className="veld-input !min-h-[38px] text-sm flex-1" onFocus={(e) => e.target.select()} />
                  <button type="button" onClick={() => kopieer("gebruikersnaam", aangemaakt.gebruikersnaam)} className="knop-secundair !min-h-[38px] !px-3 shrink-0">
                    {gekopieerd === "gebruikersnaam" ? <Check size={16} strokeWidth={2.5} className="text-succes" /> : <Copy size={16} strokeWidth={2.25} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="veld-label">Wachtwoord</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={aangemaakt.wachtwoord} className="veld-input !min-h-[38px] text-sm flex-1" onFocus={(e) => e.target.select()} />
                  <button type="button" onClick={() => kopieer("wachtwoord", aangemaakt.wachtwoord)} className="knop-secundair !min-h-[38px] !px-3 shrink-0">
                    {gekopieerd === "wachtwoord" ? <Check size={16} strokeWidth={2.5} className="text-succes" /> : <Copy size={16} strokeWidth={2.25} />}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-tekst-secundair hover:text-tekst-primair"
              onClick={() => {
                setAangemaakt(null);
                setOpen(false);
              }}
            >
              Sluiten
            </button>
          </div>
        ) : (
          <form action={submit} className="space-y-3 border-t border-rand pt-4">
            <div>
              <label className="veld-label">Gebruikersnaam</label>
              <input name="gebruikersnaam" type="text" autoComplete="off" className="veld-input" placeholder="bv. Guleser" required minLength={3} maxLength={24} />
            </div>
            <div>
              <label className="veld-label">Wachtwoord</label>
              <input name="wachtwoord" type="text" autoComplete="off" className="veld-input" placeholder="minstens 8 tekens" required minLength={8} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="veld-label">Rol</label>
                <select name="rol" className="veld-input" defaultValue="editor">
                  <option value="editor">Editor: mag invullen</option>
                  <option value="viewer">Viewer: kijkt mee</option>
                </select>
              </div>
              <div>
                <label className="veld-label">E-mail (optioneel)</label>
                <input name="email" type="email" className="veld-input" placeholder="voor wachtwoord-herstel" />
              </div>
            </div>
            {fout && <p className="veld-fout">{fout}</p>}
            <div className="flex gap-2">
              <button type="submit" className="knop-primair flex-1" disabled={isPending}>
                {isPending ? "Bezig…" : "Account aanmaken"}
              </button>
              <button type="button" className="knop-secundair" onClick={() => setOpen(false)}>
                Annuleren
              </button>
            </div>
          </form>
        )}
      </Uitklapbaar>
    </div>
  );
}
