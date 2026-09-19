import { redirect } from "next/navigation";
import { requireSessie } from "@/lib/auth/require-role";
import { maakServerClient } from "@/lib/supabase/server";
import { uitloggen } from "@/app/(dashboard)/logout-action";
import { StartHouseholdForm } from "./StartHouseholdForm";

export const dynamic = "force-dynamic";

export default async function StartHouseholdPagina() {
  const sessie = await requireSessie();
  const supabase = maakServerClient();

  // Al lid van een huishouden? Dan hoort deze pagina niet meer getoond
  // te worden (bv. terug-knop na eerder al gestart te zijn).
  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", sessie.gebruikerId)
    .limit(1)
    .maybeSingle();

  if (data) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-tekst-primair tracking-tight">Welkom, {sessie.gebruikersnaam}!</h1>
          <p className="text-tekst-secundair mt-1">Hoe wil je beginnen?</p>
        </div>
        <StartHouseholdForm />

        <form action={uitloggen} className="text-center mt-6">
          <button type="submit" className="text-sm font-semibold text-tekst-secundair hover:text-tekst-primair">
            Niet {sessie.gebruikersnaam}? Uitloggen
          </button>
        </form>
      </div>
    </main>
  );
}
