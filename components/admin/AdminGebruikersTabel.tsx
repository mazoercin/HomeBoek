import type { HouseholdRol } from "@/types/database";
import type { AdminGebruikersRij } from "@/lib/data/admin";

const ROL_LABEL: Record<HouseholdRol, string> = { owner: "Eigenaar", editor: "Mag invullen", viewer: "Kijkt mee" };

function formatteerDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

/** Statische tabel (Server Component, geen interactiviteit nodig) — enkel bedoeld om te weten wie er bestaat. */
export function AdminGebruikersTabel({ gebruikers }: { gebruikers: AdminGebruikersRij[] }) {
  if (gebruikers.length === 0) {
    return <div className="kaart text-center text-tekst-secundair">Nog geen gebruikers.</div>;
  }

  return (
    <div className="kaart !p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-tekst-secundair border-b border-rand/70">
            <th className="px-4 py-3 font-semibold">Gebruikersnaam</th>
            <th className="px-4 py-3 font-semibold">E-mailadres</th>
            <th className="px-4 py-3 font-semibold">Huishouden</th>
            <th className="px-4 py-3 font-semibold">Rol</th>
            <th className="px-4 py-3 font-semibold">Account aangemaakt</th>
          </tr>
        </thead>
        <tbody>
          {gebruikers.map((g) => (
            <tr key={g.userId} className="border-b border-rand/40 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3 font-semibold text-tekst-primair whitespace-nowrap">{g.gebruikersnaam}</td>
              <td className="px-4 py-3 text-tekst-secundair whitespace-nowrap">
                {g.email ?? <span className="italic">Geen (intern adres)</span>}
              </td>
              <td className="px-4 py-3 text-tekst-secundair whitespace-nowrap">{g.huishoudenNaam ?? "n.v.t."}</td>
              <td className="px-4 py-3 text-tekst-secundair whitespace-nowrap">{g.rol ? ROL_LABEL[g.rol] : "n.v.t."}</td>
              <td className="px-4 py-3 text-tekst-secundair whitespace-nowrap">{formatteerDatum(g.aangemaaktOp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
