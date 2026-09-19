"use client";

import { useState, useTransition } from "react";
import { UserPlus, Copy, Check, X } from "lucide-react";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import type { HouseholdUitnodiging } from "@/types/database";

type ActieResultaat<T = { gelukt: boolean; foutmelding?: string }> = Promise<T>;

interface Props {
  openstaandeUitnodigingen: HouseholdUitnodiging[];
  onAanmaken: (input: {
    rol: "editor" | "viewer";
    email: string | null;
    geldigheidUren: number;
    maxGebruik: number;
  }) => ActieResultaat<{ gelukt: boolean; foutmelding?: string; link?: string }>;
  onIntrekken: (id: string) => ActieResultaat;
}

function formatteerDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

export function UitnodigenKaart({ openstaandeUitnodigingen, onAanmaken, onIntrekken }: Props) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setFout(null);
    setLink(null);
    const rol = String(formData.get("rol") ?? "viewer") as "editor" | "viewer";
    const email = String(formData.get("email") ?? "").trim() || null;
    const geldigheidUren = Number(formData.get("geldigheid"));
    const maxGebruik = Number(formData.get("gebruik"));

    startTransition(async () => {
      const res = await onAanmaken({ rol, email, geldigheidUren, maxGebruik });
      if (res.gelukt && res.link) {
        setLink(res.link);
      } else {
        setFout(res.foutmelding ?? "Kon de uitnodiging niet aanmaken.");
      }
    });
  }

  function kopieer() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
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
            <h2 className="text-lg font-bold tracking-tight leading-tight">Gezinslid uitnodigen</h2>
            <p className="text-xs text-tekst-secundair">Deel een link — geldig voor beperkte tijd en gebruik.</p>
          </div>
        </div>
        {!open && (
          <button type="button" className="knop-secundair !min-h-[38px] !px-4 !text-sm" onClick={() => setOpen(true)}>
            Uitnodigen
          </button>
        )}
      </div>

      <Uitklapbaar open={open}>
        {link ? (
          <div className="rounded-xl bg-succes-bg border border-succes/20 p-4 space-y-3">
            <p className="text-sm text-tekst-primair font-semibold">Link aangemaakt — deel hem nu, hij wordt niet opnieuw getoond:</p>
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="veld-input !min-h-[38px] text-xs flex-1" onFocus={(e) => e.target.select()} />
              <button type="button" onClick={kopieer} className="knop-secundair !min-h-[38px] !px-3 shrink-0">
                {gekopieerd ? <Check size={16} strokeWidth={2.5} className="text-succes" /> : <Copy size={16} strokeWidth={2.25} />}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(link)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="knop-secundair !min-h-[38px] !px-3 !text-sm shrink-0"
              >
                WhatsApp
              </a>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-tekst-secundair hover:text-tekst-primair"
              onClick={() => {
                setLink(null);
                setOpen(false);
              }}
            >
              Sluiten
            </button>
          </div>
        ) : (
          <form action={submit} className="space-y-3 border-t border-rand pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="veld-label">Rol</label>
                <select name="rol" className="veld-input" defaultValue="viewer">
                  <option value="viewer">Viewer — kijkt mee</option>
                  <option value="editor">Editor — mag invullen</option>
                </select>
              </div>
              <div>
                <label className="veld-label">Geldigheid</label>
                <select name="geldigheid" className="veld-input" defaultValue="24">
                  <option value="24">24 uur</option>
                  <option value="168">7 dagen</option>
                  <option value="720">30 dagen</option>
                </select>
              </div>
            </div>
            <div>
              <label className="veld-label">E-mailadres (optioneel — bindt de link aan dat adres)</label>
              <input name="email" type="email" className="veld-input" placeholder="naam@voorbeeld.be" />
            </div>
            <div>
              <label className="veld-label">Gebruik</label>
              <select name="gebruik" className="veld-input" defaultValue="1">
                <option value="1">Eén keer</option>
                <option value="5">Tot 5 keer</option>
              </select>
            </div>
            {fout && <p className="veld-fout">{fout}</p>}
            <div className="flex gap-2">
              <button type="submit" className="knop-primair flex-1" disabled={isPending}>
                {isPending ? "Bezig…" : "Link aanmaken"}
              </button>
              <button type="button" className="knop-secundair" onClick={() => setOpen(false)}>
                Annuleren
              </button>
            </div>
          </form>
        )}
      </Uitklapbaar>

      {openstaandeUitnodigingen.length > 0 && (
        <ul className="space-y-2 mt-4 border-t border-rand pt-4">
          {openstaandeUitnodigingen.map((u) => {
            const verlopen = new Date(u.expires_at) < new Date();
            const opgebruikt = u.use_count >= u.max_uses;
            return (
              <li key={u.id} className="flex items-center gap-3 rounded-xl border border-rand/70 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-tekst-primair">
                    {u.role === "editor" ? "Editor" : "Viewer"}
                    {u.email ? ` · ${u.email}` : ""}
                  </p>
                  <p className="text-xs text-tekst-secundair">
                    {verlopen ? "Verlopen" : opgebruikt ? "Opgebruikt" : `Verloopt ${formatteerDatum(u.expires_at)}`} ·{" "}
                    {u.use_count}/{u.max_uses} gebruikt
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Intrekken"
                  title="Intrekken"
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await onIntrekken(u.id); })}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full text-tekst-secundair hover:text-tekort hover:bg-tekort-bg transition"
                >
                  <X size={15} strokeWidth={2.25} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
