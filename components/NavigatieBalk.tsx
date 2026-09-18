"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Receipt, Target, Coins, Settings } from "lucide-react";
import type { Rol } from "@/types/database";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icoon: LayoutDashboard },
  { href: "/dashboard#inkomen", label: "Inkomen", icoon: Wallet },
  { href: "/dashboard#uitgaven", label: "Uitgaven", icoon: Receipt },
  { href: "/dashboard#doelen", label: "Doelen", icoon: Target },
  { href: "/dashboard#goud", label: "Goud", icoon: Coins },
];

/**
 * Vaste navigatiebalk: onderaan op mobiel (duimvriendelijke tab-bar),
 * bovenaan op desktop/tablet. Blijft altijd zichtbaar ("fixed"/"sticky")
 * en krijgt bij scrollen vloeiend een glazen achtergrond + schaduw i.p.v.
 * abrupt te "springen" naar een kader.
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
    <nav
      className={`navbalk ${gescrold ? "navbalk-scrolled" : "navbalk-boven md:shadow-none"}`}
      aria-label="Hoofdnavigatie"
    >
      <div className="max-w-7xl mx-auto md:px-8 lg:px-10">
        <ul className="flex justify-around md:justify-start md:gap-1 md:py-2">
          {alleLinks.map((link) => {
            const Icoon = link.icoon;
            const actief = pathname === link.href.split("#")[0] && !link.href.includes("#");
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-2 py-2 md:py-2.5 px-3 md:px-4 min-h-[44px]
                    md:rounded-full transition-colors duration-150
                    ${actief ? "text-primair md:bg-primair-light" : "text-tekst-secundair hover:text-primair md:hover:bg-slate-100"}`}
                >
                  <Icoon size={22} strokeWidth={2.25} className="md:hidden" aria-hidden />
                  <Icoon size={18} strokeWidth={2.25} className="hidden md:block" aria-hidden />
                  <span className="text-[11px] md:text-sm font-semibold">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
