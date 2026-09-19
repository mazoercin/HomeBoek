import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { RegistreerForm } from "./RegistreerForm";

export default function RegistrerenPagina() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primair-light via-white dark:via-kaart to-secundair-light">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primair shadow-lg shadow-primair/25 mb-4">
            <PiggyBank size={30} color="#ffffff" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-extrabold text-tekst-primair tracking-tight">Account aanmaken</h1>
          <p className="text-tekst-secundair mt-1">Voor jou en je gezin.</p>
        </div>

        <div className="kaart shadow-card-hover">
          <RegistreerForm />
        </div>

        <p className="text-center text-sm text-tekst-secundair mt-5">
          Heb je al een account?{" "}
          <Link href="/login" className="font-semibold text-primair hover:underline">
            Log hier in
          </Link>
        </p>
      </div>
    </main>
  );
}
