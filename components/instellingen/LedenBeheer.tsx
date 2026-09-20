"use client";

import { useState, useTransition } from "react";
import { Users, Crown, LogOut } from "lucide-react";
import type { HouseholdRol } from "@/types/database";
import type { HouseholdLidMetProfiel } from "@/lib/data/household";

type ActieResultaat = Promise<{ gelukt: boolean; foutmelding?: string }>;

interface Props {
  leden: HouseholdLidMetProfiel[];
  huidigeGebruikerId: string;
  isOwner: boolean;
  onRolWijzigen: (userId: string, rol: HouseholdRol) => ActieResultaat;
  onVerwijderen: (userId: string) => ActieResultaat;
  onEigenaarschapOverdragen: (userId: string) => ActieResultaat;
  onVerlaten: () => ActieResultaat;
  onWachtwoordResetten: (userId: string, nieuwWachtwoord: string) => ActieResultaat;
}

function formatteerDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

const ROL_LABEL: Record<HouseholdRol, string> = { owner: "Eigenaar", editor: "Mag invullen", viewer: "Kijkt mee" };

function LidRij({
  lid,
  isJezelf,
  isOwner,
  onRolWijzigen,
  onVerwijderen,
  onEigenaarschapOverdragen,
  onVerlaten,
  onWachtwoordResetten,
}: {
  lid: HouseholdLidMetProfiel;
  isJezelf: boolean;
  isOwner: boolean;
  onRolWijzigen: Props["onRolWijzigen"];
  onVerwijderen: Props["onVerwijderen"];
  onEigenaarschapOverdragen: Props["onEigenaarschapOverdragen"];
  onVerlaten: Props["onVerlaten"];
  onWachtwoordResetten: Props["onWachtwoordResetten"];
}) {
  const [isPending, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const naam = lid.profiel?.gebruikersnaam ?? lid.display_name ?? "Voormalig lid";

  return (
    <li className="rounded-xl border border-rand/70 p-3">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center rounded-full h-10 w-10 shrink-0 text-white font-bold text-sm"
          style={{ backgroundColor: lid.profiel?.avatar_color ?? "#94A3B8" }}
        >
          {naam.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-tekst-primair truncate leading-tight">{naam}</p>
            {isJezelf && <span className="text-[10px] font-bold text-primair bg-primair-light rounded-full px-1.5 py-0.5">Jij</span>}
            {lid.role === "owner" && <Crown size={13} className="text-goud" strokeWidth={2.25} />}
          </div>
          <p className="text-xs text-tekst-secundair truncate mt-0.5">
            {ROL_LABEL[lid.role]} · lid sinds {formatteerDatum(lid.joined_at)}
          </p>
        </div>
      </div>

      {(isOwner && lid.role !== "owner") || isJezelf ? (
        <div className="flex items-center gap-2 flex-wrap mt-2.5 pt-2.5 border-t border-rand/50">
          {isOwner && lid.role !== "owner" && (
            <select
              value={lid.role}
              disabled={isPending}
              onChange={(e) =>
                startTransition(async () => {
                  const res = await onRolWijzigen(lid.user_id, e.target.value as HouseholdRol);
                  if (!res.gelukt) setFout(res.foutmelding ?? "Kon rol niet wijzigen.");
                })
              }
              className="veld-input !min-h-[34px] !py-1 !w-auto text-xs"
            >
              <option value="editor">Mag invullen</option>
              <option value="viewer">Kijkt mee</option>
            </select>
          )}
          {isOwner && lid.role !== "owner" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (confirm(`Eigenaarschap overdragen aan ${naam}? Jij wordt dan editor.`)) {
                  startTransition(async () => {
                    const res = await onEigenaarschapOverdragen(lid.user_id);
                    if (!res.gelukt) setFout(res.foutmelding ?? "Kon niet overdragen.");
                  });
                }
              }}
              className="knop-secundair !min-h-[34px] !px-3 !text-xs"
            >
              Eigenaar maken
            </button>
          )}
          {isOwner && lid.role !== "owner" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const nieuw = prompt(`Nieuw wachtwoord voor ${naam} (minstens 8 tekens):`);
                if (!nieuw) return;
                if (nieuw.length < 8) {
                  setFout("Wachtwoord moet minstens 8 tekens lang zijn.");
                  return;
                }
                startTransition(async () => {
                  const res = await onWachtwoordResetten(lid.user_id, nieuw);
                  if (!res.gelukt) setFout(res.foutmelding ?? "Kon wachtwoord niet resetten.");
                });
              }}
              className="knop-secundair !min-h-[34px] !px-3 !text-xs"
            >
              Wachtwoord resetten
            </button>
          )}
          {isOwner && lid.role !== "owner" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (
                  confirm(
                    `${naam} uit het gezin verwijderen? Het account verdwijnt meteen (${naam} kan niet meer inloggen), maar de al ingevulde gegevens blijven gewoon bij het huishouden staan.`
                  )
                ) {
                  startTransition(async () => {
                    const res = await onVerwijderen(lid.user_id);
                    if (!res.gelukt) setFout(res.foutmelding ?? "Kon niet verwijderen.");
                  });
                }
              }}
              className="min-h-[34px] px-3 text-xs font-semibold text-tekort hover:bg-tekort-bg rounded-full transition"
            >
              Verwijderen
            </button>
          )}
          {isJezelf && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (confirm("Weet je zeker dat je dit gezin wil verlaten?")) {
                  startTransition(async () => {
                    const res = await onVerlaten();
                    if (!res.gelukt) setFout(res.foutmelding ?? "Kon niet verlaten.");
                  });
                }
              }}
              className="knop-secundair !min-h-[34px] !px-3 !text-xs gap-1"
            >
              <LogOut size={13} strokeWidth={2.25} /> Verlaat gezin
            </button>
          )}
        </div>
      ) : null}
      {fout && <p className="veld-fout !mt-2 !text-xs">{fout}</p>}
    </li>
  );
}

export function LedenBeheer({
  leden,
  huidigeGebruikerId,
  isOwner,
  onRolWijzigen,
  onVerwijderen,
  onEigenaarschapOverdragen,
  onVerlaten,
  onWachtwoordResetten,
}: Props) {
  return (
    <div className="kaart">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primair-light shrink-0">
          <Users size={17} color="#4F46E5" strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight">Gezinsleden</h2>
          <p className="text-xs text-tekst-secundair">Gedeeld met {leden.length} {leden.length === 1 ? "lid" : "leden"}.</p>
        </div>
      </div>

      <ul className="space-y-2">
        {leden.map((lid) => (
          <LidRij
            key={lid.user_id}
            lid={lid}
            isJezelf={lid.user_id === huidigeGebruikerId}
            isOwner={isOwner}
            onRolWijzigen={onRolWijzigen}
            onVerwijderen={onVerwijderen}
            onEigenaarschapOverdragen={onEigenaarschapOverdragen}
            onVerlaten={onVerlaten}
            onWachtwoordResetten={onWachtwoordResetten}
          />
        ))}
      </ul>
    </div>
  );
}
