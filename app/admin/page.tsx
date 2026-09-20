import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { haalAlleGebruikers } from "@/lib/data/admin";
import { AdminGebruikersTabel } from "@/components/admin/AdminGebruikersTabel";
import { Logo } from "@/components/ui/Logo";
import { uitloggen } from "@/app/(dashboard)/logout-action";

export const dynamic = "force-dynamic";

/**
 * Los van de (dashboard)-route-groep (die vereisHousehold() vereist):
 * het admin-account hoeft niet van een huishouden af te hangen om dit
 * te mogen bekijken. Enkel bereikbaar voor het vaste admin-e-mailadres
 * (zie lib/auth/require-admin.ts) — puur read-only, enkel de
 * gebruikerslijst, geen andere beheerdersacties.
 */
export default async function AdminPagina() {
  await requireAdmin();
  const gebruikers = await haalAlleGebruikers();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 navbalk-boven">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo compact />
            <span className="text-[11px] font-bold text-primair bg-primair-light rounded-full px-2 py-0.5">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="knop-secundair !min-h-[38px] !px-4 !text-sm">
              Naar dashboard
            </Link>
            <form action={uitloggen}>
              <button type="submit" className="knop-secundair !min-h-[38px] !px-4 !text-sm">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 space-y-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primair-light shrink-0">
            <ShieldCheck size={17} color="#4F46E5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin — Gebruikers</h1>
            <p className="text-sm text-tekst-secundair">
              {gebruikers.length} {gebruikers.length === 1 ? "account" : "accounts"} aangemaakt.
            </p>
          </div>
        </div>

        <AdminGebruikersTabel gebruikers={gebruikers} />
      </div>
    </div>
  );
}
