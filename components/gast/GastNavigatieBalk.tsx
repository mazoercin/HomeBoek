import Link from "next/link";
import { UserPlus, LogIn } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemaToggle } from "@/components/ui/ThemaToggle";

/**
 * Sterk vereenvoudigde kopbalk voor gast-modus: geen gezin/instellingen/
 * uitloggen (die bestaan pas na een account), enkel het logo en een
 * duidelijke uitnodiging om een account te maken.
 */
export function GastNavigatieBalk() {
  return (
    <header className="sticky top-0 z-30 navbalk-boven">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 h-14 flex items-center justify-between">
        <Link href="/gast" className="transition-opacity hover:opacity-80">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemaToggle />
          <Link
            href="/login"
            className="hidden sm:flex items-center gap-1.5 py-2 px-3 min-h-[40px] rounded-full text-sm font-semibold text-tekst-secundair hover:text-primair hover:bg-primair-light transition-colors duration-150"
          >
            <LogIn size={16} strokeWidth={2.25} aria-hidden /> Inloggen
          </Link>
          <Link href="/registreren" className="knop-primair !min-h-[38px] !px-4 !text-sm gap-1.5">
            <UserPlus size={16} strokeWidth={2.25} aria-hidden /> Account maken
          </Link>
        </div>
      </div>
    </header>
  );
}
