"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Receipt, Target, TrendingUp, CalendarDays, Users, Menu, X, LogOut, ShieldCheck } from "lucide-react";
import type { HouseholdRol } from "@/types/database";
import { Logo } from "@/components/ui/Logo";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { uitloggen } from "@/app/(dashboard)/logout-action";

const LINKS = [
  { pad: "", label: "Dashboard", icoon: LayoutDashboard },
  { pad: "#inkomen", label: "Inkomen", icoon: Wallet },
  { pad: "#uitgaven", label: "Uitgaven", icoon: Receipt },
  { pad: "#doelen", label: "Spaarpot", icoon: Target },
  { pad: "#investeringen", label: "Investeringen", icoon: TrendingUp },
];

const MAAND_IN_PAD = /^\/dashboard\/(\d{4}-\d{2})/;

/**
 * Eén dunne, vaste kopbalk met het HuisBalans-logo, altijd zichtbaar.
 * Op desktop staan de nav-links gewoon rechts in diezelfde balk. Op
 * mobiel zit alle navigatie achter een hamburger-knop: die klapt
 * vloeiend een menu open onder de kopbalk (i.p.v. een drukke tab-bar
 * onderaan), en sluit meteen weer zodra je een link aantikt — de
 * pagina scrollt daarna vloeiend naar het juiste kader.
 */
export function NavigatieBalk({ rol, isAdmin = false }: { rol: HouseholdRol; isAdmin?: boolean }) {
  const [gescrold, setGescrold] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function opScroll() {
      setGescrold(window.scrollY > 8);
    }
    opScroll();
    window.addEventListener("scroll", opScroll, { passive: true });
    return () => window.removeEventListener("scroll", opScroll);
  }, []);

  // Sluit het menu automatisch als er van pagina gewisseld wordt.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const maandMatch = pathname.match(MAAND_IN_PAD);
  const dashboardBasis = maandMatch ? `/dashboard/${maandMatch[1]}` : "/dashboard";

  const alleLinks = [
    ...LINKS.map((link) => ({ ...link, href: `${dashboardBasis}${link.pad}` })),
    { href: "/overzicht", label: "Overzicht", icoon: CalendarDays, pad: "" },
    // `rol` bepaalt binnen de Gezin-pagina zelf welke acties zichtbaar
    // zijn (rol wijzigen, uitnodigen, ...) — de link is voor elk lid nuttig.
    { href: "/instellingen", label: "Gezin", icoon: Users, pad: "" },
    // Enkel zichtbaar voor het vaste admin-account (zie lib/auth/admin.ts).
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icoon: ShieldCheck, pad: "" }] : []),
  ];

  return (
    <header className={`sticky top-0 z-30 transition-all duration-300 ${gescrold || menuOpen ? "navbalk-scrolled" : "navbalk-boven"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 h-14 flex items-center justify-between">
        <Link href={dashboardBasis} className="transition-opacity hover:opacity-80">
          <Logo compact />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <ul className="flex items-center gap-1">
            {alleLinks.map((link) => {
              const Icoon = link.icoon;
              const actief = pathname === link.href.split("#")[0] && !link.href.includes("#");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-2 py-2 px-4 min-h-[40px] rounded-full text-sm font-semibold transition-colors duration-150 ${
                      actief ? "text-primair bg-primair-light" : "text-tekst-secundair hover:text-primair hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icoon size={17} strokeWidth={2.25} aria-hidden />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-rand">
            <form action={uitloggen}>
              <button
                type="submit"
                aria-label="Uitloggen"
                title="Uitloggen"
                className="flex items-center gap-2 py-2 px-3 min-h-[40px] rounded-full text-sm font-semibold text-tekst-secundair hover:text-tekort hover:bg-tekort-bg transition-colors duration-150"
              >
                <LogOut size={17} strokeWidth={2.25} aria-hidden />
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center gap-0.5 md:hidden">
          <button
            type="button"
            aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-tekst-primair hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {menuOpen ? <X size={22} strokeWidth={2.25} /> : <Menu size={22} strokeWidth={2.25} />}
          </button>
        </div>
      </div>

      <Uitklapbaar open={menuOpen}>
        <nav aria-label="Hoofdnavigatie" className="md:hidden border-t border-rand/70 px-4 pb-3">
          <ul className="py-2">
            {alleLinks.map((link) => {
              const Icoon = link.icoon;
              const actief = pathname === link.href.split("#")[0] && !link.href.includes("#");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 min-h-[48px] px-3 rounded-xl text-[15px] font-semibold transition-colors duration-150 ${
                      actief ? "text-primair bg-primair-light" : "text-tekst-primair hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icoon size={19} strokeWidth={2.25} aria-hidden />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <form action={uitloggen} className="border-t border-rand/70 pt-2">
            <button
              type="submit"
              className="flex items-center gap-3 min-h-[48px] px-3 rounded-xl text-[15px] font-semibold text-tekort hover:bg-tekort-bg transition-colors duration-150 w-full"
            >
              <LogOut size={19} strokeWidth={2.25} aria-hidden />
              Uitloggen
            </button>
          </form>
        </nav>
      </Uitklapbaar>
    </header>
  );
}
