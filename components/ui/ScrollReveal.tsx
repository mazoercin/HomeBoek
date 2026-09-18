"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Laat zijn kind vloeiend "in beeld glijden" (fade-in-up) zodra het de
 * viewport binnenkomt tijdens het naar beneden scrollen, en laat het
 * weer wegzakken/faden (fade-out-down) zodra het weer uit beeld
 * verdwijnt bij het omhoog scrollen — telkens opnieuw, niet enkel bij
 * het laden van de pagina.
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

    const observer = new IntersectionObserver(([entry]) => setZichtbaar(entry?.isIntersecting ?? false), {
      threshold: 0.12,
      rootMargin: "-40px 0px -40px 0px",
    });
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
