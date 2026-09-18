import Link from "next/link";
import type { Rol } from "@/types/database";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icoon: "🏠" },
  { href: "/dashboard#inkomen", label: "Inkomen", icoon: "💶" },
  { href: "/dashboard#uitgaven", label: "Uitgaven", icoon: "🧾" },
  { href: "/dashboard#doelen", label: "Doelen", icoon: "🎯" },
  { href: "/dashboard#goud", label: "Goud", icoon: "🪙" },
];

/** Onderaan vaste tab-bar op mobiel, bovenaan horizontale navbar vanaf md:. */
export function NavigatieBalk({ rol }: { rol: Rol }) {
  const alleLinks =
    rol === "admin" ? [...LINKS, { href: "/instellingen", label: "Instellingen", icoon: "⚙️" }] : LINKS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-rand md:static md:border-t-0 md:border-b"
      aria-label="Hoofdnavigatie"
    >
      <ul className="flex justify-around md:justify-start md:gap-6 md:px-6 md:max-w-4xl md:mx-auto">
        {alleLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex flex-col md:flex-row items-center gap-0.5 md:gap-2 py-2 md:py-4 px-2 min-h-[44px] text-tekst-secundair hover:text-primair transition"
            >
              <span className="text-xl md:text-base" aria-hidden>
                {link.icoon}
              </span>
              <span className="text-xs md:text-sm font-bold">{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
