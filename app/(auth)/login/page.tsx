import Link from "next/link";
import { Home, PiggyBank } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default function LoginPagina() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
      <div className="w-full max-w-sm animate-fade-in-up">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-tekst-secundair hover:text-tekst-primair mb-4"
        >
          <Home size={15} strokeWidth={2.25} /> Startpagina
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primair shadow-lg shadow-primair/25 mb-4">
            <PiggyBank size={30} color="#ffffff" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-extrabold text-tekst-primair tracking-tight">HuisBalans</h1>
          <p className="text-tekst-secundair mt-1">je digitale huishoudboekje voor het hele gezin</p>
        </div>

        <div className="kaart shadow-card-hover">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-tekst-secundair mt-5">
          Nog geen account?{" "}
          <Link href="/registreren" className="font-semibold text-primair hover:underline">
            Registreer hier
          </Link>
        </p>
      </div>
    </main>
  );
}
