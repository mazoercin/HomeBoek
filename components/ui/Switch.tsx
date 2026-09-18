"use client";

/**
 * iOS-stijl toggle-switch: een pil met een ronde knop die vloeiend
 * heen-en-weer glijdt. Vervangt de vorige "Betaald/Onbetaald"-knop met
 * tekst door een herkenbaar, direct scanbaar aan/uit-patroon.
 */
interface Props {
  aan: boolean;
  onWijzig: () => void;
  label: string;
  disabled?: boolean;
  kleurAan?: "succes" | "primair";
}

export function Switch({ aan, onWijzig, label, disabled, kleurAan = "succes" }: Props) {
  const achtergrondAan = kleurAan === "succes" ? "bg-succes" : "bg-primair";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      aria-label={label}
      disabled={disabled}
      onClick={onWijzig}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-200 ease-out
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primair
        disabled:opacity-40 disabled:pointer-events-none
        ${aan ? achtergrondAan : "bg-slate-200"}`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out
          ${aan ? "translate-x-7" : "translate-x-1"}`}
      />
    </button>
  );
}
