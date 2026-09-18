import Link from "next/link";

/** Nette foutpagina voor AUTH_002 — nooit een crash of witte pagina. */
export default function GeenToegangPagina() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 text-center">
      <div className="max-w-sm">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-extrabold text-tekst-primair mb-2">
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
