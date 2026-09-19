import { PiggyBank } from "lucide-react";
import { WachtwoordHerstellenForm } from "./WachtwoordHerstellenForm";

export default function WachtwoordHerstellenPagina() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primair shadow-lg shadow-primair/25 mb-4">
            <PiggyBank size={30} color="#ffffff" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-extrabold text-tekst-primair tracking-tight">Nieuw wachtwoord</h1>
        </div>

        <div className="kaart shadow-card-hover">
          <WachtwoordHerstellenForm />
        </div>
      </div>
    </main>
  );
}
