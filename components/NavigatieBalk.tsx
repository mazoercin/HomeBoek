"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Receipt, Target, TrendingUp, Settings, Menu, X, LogOut } from "lucide-react";
import type { Rol } from "@/types/database";
import { Logo } from "@/components/ui/Logo";
import { Uitklapbaar } from "@/components/ui/Uitklapbaar";
import { uitloggen } from "@/app/(dashboard)/logout-action";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icoon: LayoutDashboard },
  { href: "/dashboard#inkomen", label: "Inkomen", icoon: Wallet },
  { href: "/dashboard#uitgaven", label: "Uitgaven", icoon: Receipt },
  { href: "/dashboard#doelen", label: "Doelen", icoon: Target },
  { href: "/dashboard#investeringen", label: "Investeringen", icoon: TrendingUp },
];

/**
 * Eén dunne, vaste kopbalk met het HomeBoek-logo, altijd zichtbaar.
 * Op desktop staan de nav-links gewoon rechts in diezelfde balk. Op
 * mobiel zit alle navigatie achter een hamburger-knop: die klapt
 * vloeiend een menu open onder de kopbalk (i.p.v. een drukke tab-bar
 * onderaan), en sluit meteen weer zodra je een link aantikt — de
 * pagina scrollt daarna vloeiend naar het juiste kader.
 */
export function NavigatieBalk({ rol }: { rol: Rol }) {
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

  const alleLinks = rol === "admin" ? [...LINKS, { href: "/instellingen", label: "Instellingen", icoon: Settings }] : LINKS;

  return (
    <header className={`sticky top-0 z-30 transition-all duration-300 ${gescrold || menuOpen ? "navbalk-scrolled" : "navbalk-boven"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="transition-opacity hover:opacity-80">
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
          <form action={uitloggen} className="ml-1 pl-2 border-l border-rand">
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

        <button
          type="button"
          aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-tekst-primair hover:bg-slate-100 transition"
        >
          {menuOpen ? <X size={22} strokeWidth={2.25} /> : <Menu size={22} strokeWidth={2.25} />}
        </button>
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
                      actief ? "text-primair bg-primair-light" : "text-tekst-primair hover:bg-slate-100"
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
