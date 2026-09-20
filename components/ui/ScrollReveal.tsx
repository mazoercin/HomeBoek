"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Laat zijn kind vloeiend "in beeld glijden" (fade-in-up) zodra het de
 * viewport voor het eerst binnenkomt — eenmalig, blijft daarna zichtbaar.
 *
 * Voorheen faded het ook weer wég zodra je even omhoog scrolde (elke
 * keer opnieuw), wat voelde als "de pagina reageert vreemd" bij gewoon
 * normaal gebruik: een klik op een link naar een sectie verderop (bv.
 * "Vul in bij Vaste kosten →") kon die sectie tijdens het scrollen kort
 * laten verdwijnen/verschuiven doordat hij nog niet als "zichtbaar"
 * gemarkeerd was. Eenmalig onthullen en de observer meteen loskoppelen
 * lost dat op, en is ook het gangbare patroon voor dit soort effect.
 */
export function ScrollReveal({
  children,
  className = "",
  vertraging = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Optionele vertraging in ms, voor een getrapt effect bij meerdere kaarten naast elkaar. */
  vertraging?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [zichtbaar, setZichtbaar] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setZichtbaar(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "-40px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: zichtbaar ? `${vertraging}ms` : "0ms" }}
      className={`transition-all duration-500 ease-out motion-reduce:transition-none ${
        zichtbaar ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}
