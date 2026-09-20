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
    <div className="rounded-2xl bg-secundair-light border border-secundair/20 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/70 dark:bg-white/10 shrink-0">
          <Info size={16} color="#D97706" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-tekst-primair leading-snug">Je probeert dit uit zonder account</p>
          <p className="text-xs text-tekst-secundair leading-snug mt-1">
            Alles blijft lokaal in je browser: er wordt niets naar een server verstuurd. Wissen kan via &ldquo;Alle
            data wissen&rdquo; verderop, of door de browsergegevens van deze site te wissen.
          </p>
        </div>
      </div>
      <Link href="/registreren" className="knop-primair !min-h-[38px] !px-4 !text-sm mt-3 w-full sm:w-auto">
        Account maken &amp; bewaren
      </Link>
    </div>
  );
}
