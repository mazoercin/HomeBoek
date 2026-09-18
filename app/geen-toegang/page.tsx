import Link from "next/link";
import { Lock } from "lucide-react";

/** Nette foutpagina voor AUTH_002 — nooit een crash of witte pagina. */
export default function GeenToegangPagina() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 text-center bg-gradient-to-br from-slate-50 to-tekort-bg">
      <div className="max-w-sm animate-fade-in-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-tekort-bg mb-4">
          <Lock size={28} color="#F43F5E" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-extrabold text-tekst-primair mb-2 tracking-tight">
          Geen toegang tot deze pagina
        </h1>
        <p className="text-tekst-secundair mb-6">
          Je hebt niet de juiste rechten om dit te bekijken. Neem contact op met een beheerder
          als je denkt dat dit niet klopt.
        </p>
        <Link href="/dashboard" className="knop-primair">
          Terug naar dashboard
        </Link>
      </div>
    </main>
  );
}
