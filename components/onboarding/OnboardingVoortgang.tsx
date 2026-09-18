const STAPPEN = ["Inkomen", "Vaste kosten", "Facturen", "Extra uitgaven", "Doelen"];

export function OnboardingVoortgang({ huidigeStap }: { huidigeStap: number }) {
  return (
    <div className="mb-6">
      <div className="flex justify-center gap-2 mb-2">
        {STAPPEN.map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i <= huidigeStap ? "bg-primair" : "bg-rand"
            }`}
            aria-hidden
          />
        ))}
      </div>
      <p className="text-center text-sm font-bold text-tekst-secundair">
        Stap {huidigeStap + 1} van {STAPPEN.length}: {STAPPEN[huidigeStap]}
      </p>
    </div>
  );
}
