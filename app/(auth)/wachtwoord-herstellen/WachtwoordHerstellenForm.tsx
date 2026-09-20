"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { maakBrowserClient } from "@/lib/supabase/client";

type Status = "bezig_met_laden" | "klaar" | "ongeldige_link" | "opgeslagen";

/**
 * De link uit de reset-mail geeft een tijdelijke "recovery"-sessie mee
 * via de URL — Supabase's browser-client pikt die automatisch op.
 * Pas als die sessie er is mogen we een nieuw wachtwoord laten zetten.
 */
export function WachtwoordHerstellenForm() {
  const [status, setStatus] = useState<Status>("bezig_met_laden");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = maakBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "klaar" : "ongeldige_link");
    });
  }, []);

  async function submit(formData: FormData) {
    setFout(null);
    const wachtwoord = String(formData.get("wachtwoord") ?? "");
    const bevestiging = String(formData.get("wachtwoord_bevestiging") ?? "");

    if (wachtwoord.length < 8) return setFout("Wachtwoord moet minstens 8 tekens lang zijn.");
    if (wachtwoord !== bevestiging) return setFout("Wachtwoorden komen niet overeen.");

    setBezig(true);
    const supabase = maakBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: wachtwoord });
    await supabase.auth.signOut();
    setBezig(false);

    if (error) {
      setFout("ongeldig");
      return;
    }

    setStatus("opgeslagen");
    setTimeout(() => router.push("/login?wachtwoord_gewijzigd=1"), 2000);
  }

  if (status === "bezig_met_laden") {
    return <p className="text-sm text-tekst-secundair text-center">Bezig met laden…</p>;
  }

  if (status === "ongeldige_link" || fout === "ongeldig") {
    return (
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-tekort-bg mb-3">
          <CircleAlert size={24} color="#F43F5E" strokeWidth={2.25} />
        </div>
        <p className="font-semibold text-tekst-primair">Deze link werkt niet meer</p>
        <p className="text-sm text-tekst-secundair mt-1">Verlopen of al gebruikt. Vraag gerust een nieuwe aan.</p>
        <Link href="/wachtwoord-vergeten" className="knop-primair w-full mt-4">
          Vraag een nieuwe link aan
        </Link>
      </div>
    );
  }

  if (status === "opgeslagen") {
    return (
      <div className="text-center py-2 animate-fade-in">
        <p className="font-semibold text-succes">Wachtwoord opgeslagen!</p>
        <p className="text-sm text-tekst-secundair mt-1">Je wordt doorgestuurd naar de inlogpagina…</p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="wachtwoord" className="veld-label">
          Nieuw wachtwoord
        </label>
        <input
          id="wachtwoord"
          name="wachtwoord"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="veld-input"
        />
      </div>
      <div>
        <label htmlFor="wachtwoord_bevestiging" className="veld-label">
          Bevestig wachtwoord
        </label>
        <input
          id="wachtwoord_bevestiging"
          name="wachtwoord_bevestiging"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="veld-input"
        />
      </div>
      {fout && (
        <p className="veld-fout" role="alert">
          {fout}
        </p>
      )}
      <button type="submit" className="knop-primair w-full" disabled={bezig}>
        {bezig ? "Bezig met opslaan…" : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}
