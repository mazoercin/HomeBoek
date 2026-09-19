import Link from "next/link";
import { Info } from "lucide-react";

/**
 * Blijvend (niet wegklikbaar) bannertje bovenaan het gast-dashboard: het
 * moet altijd duidelijk zijn dat deze gegevens enkel lokaal op dit
 * toestel staan, zodat niemand denkt dat ze "ergens veilig" bewaard zijn
 * tot ze bewust een account maken.
 */
export function GastBanner() {
  return (
    <div className="rounded-2xl bg-secundair-light border border-secundair/20 px-4 py-3 flex items-center gap-3 flex-wrap">
      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/70 dark:bg-white/10 shrink-0">
        <Info size={16} color="#D97706" strokeWidth={2.25} />
      </span>
      <p className="text-sm text-tekst-primair flex-1 min-w-[200px]">
        <span className="font-bold">Je probeert dit uit zonder account.</span> Alles wat je invult wordt enkel op dit
        toestel bewaard, in deze browser.
      </p>
      <Link href="/registreren" className="knop-primair !min-h-[38px] !px-4 !text-sm shrink-0">
        Account maken &amp; bewaren
      </Link>
    </div>
  );
}
