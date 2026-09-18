/** Merk-lockup: het app-icoon + de naam "HomeBoek", herbruikbaar in de navbar en op auth-pagina's. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span
        className={`inline-flex items-center justify-center rounded-[9px] bg-gradient-primair shadow-sm shrink-0 ${
          compact ? "h-7 w-7" : "h-8 w-8"
        }`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width={compact ? 15 : 17} height={compact ? 15 : 17} fill="none">
          <path
            d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7.5Z"
            fill="#fff"
            fillOpacity="0.96"
          />
          <circle cx="12" cy="14" r="2.3" fill="#6366F1" />
        </svg>
      </span>
      <span className={`font-extrabold tracking-tight text-tekst-primair ${compact ? "text-[15px]" : "text-lg"}`}>
        Home<span className="text-primair">Boek</span>
      </span>
    </span>
  );
}
