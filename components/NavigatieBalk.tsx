"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Receipt, Target, Coins, Settings } from "lucide-react";
import type { Rol } from "@/types/database";
import { Logo } from "@/components/ui/Logo";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icoon: LayoutDashboard },
  { href: "/dashboard#inkomen", label: "Inkomen", icoon: Wallet },
  { href: "/dashboard#uitgaven", label: "Uitgaven", icoon: Receipt },
  { href: "/dashboard#doelen", label: "Doelen", icoon: Target },
  { href: "/dashboard#goud", label: "Goud", icoon: Coins },
];

/**
 * Twee stukken navigatie die samen altijd zichtbaar blijven:
 * - Een dunne kopbalk bovenaan met het HomeBoek-logo (mobiel én
 *   desktop) — op desktop bevat die balk ook meteen de nav-links.
 * - Een aparte duimvriendelijke tab-bar onderaan, enkel op mobiel.
 * Beide krijgen bij scrollen vloeiend een glazen achtergrond + schaduw
 * i.p.v. abrupt te "springen".
 */
export function NavigatieBalk({ rol }: { rol: Rol }) {
  const [gescrold, setGescrold] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function opScroll() {
      setGescrold(window.scrollY > 8);
    }
    opScroll();
    window.addEventListener("scroll", opScroll, { passive: true });
    return () => window.removeEventListener("scroll", opScroll);
  }, []);

  const alleLinks = rol === "admin" ? [...LINKS, { href: "/instellingen", label: "Instellingen", icoon: Settings }] : LINKS;

  return (
    <>
      <header
        className={`sticky top-0 z-30 transition-all duration-300 ${gescrold ? "navbalk-scrolled" : "navbalk-boven"}`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80">
            <Logo compact />
          </Link>

          <ul className="hidden md:flex items-center gap-1">
            {alleLinks.map((link) => {
              const Icoon = link.icoon;
              const actief = pathname === link.href.split("#")[0] && !link.href.includes("#");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-2 py-2 px-4 min-h-[40px] rounded-full text-sm font-semibold transition-colors duration-150 ${
                      actief ? "text-primair bg-primair-light" : "text-tekst-secundair hover:text-primair hover:bg-slate-100"
                    }`}
                  >
                    <Icoon size={17} strokeWidth={2.25} aria-hidden />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-rand/70 shadow-nav md:hidden"
        aria-label="Hoofdnavigatie"
      >
        <ul className="flex justify-around">
          {alleLinks.map((link) => {
            const Icoon = link.icoon;
            const actief = pathname === link.href.split("#")[0] && !link.href.includes("#");
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex flex-col items-center gap-0.5 py-2 px-3 min-h-[44px] transition-colors duration-150 ${
                    actief ? "text-primair" : "text-tekst-secundair hover:text-primair"
                  }`}
                >
                  <Icoon size={22} strokeWidth={2.25} aria-hidden />
                  <span className="text-[11px] font-semibold">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
