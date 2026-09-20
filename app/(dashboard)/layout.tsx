import { vereisHousehold } from "@/lib/auth/household";
import { haalGebruikersProfiel } from "@/lib/auth/gebruiker";
import { isAdminEmail } from "@/lib/auth/admin";
import { NavigatieBalk } from "@/components/NavigatieBalk";
import { GastImportBridge } from "@/components/GastImportBridge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await vereisHousehold();
  const profiel = await haalGebruikersProfiel(context.gebruikerId);

  return (
    <div className="min-h-screen">
      <GastImportBridge />
      <NavigatieBalk rol={context.rol} isAdmin={isAdminEmail(profiel?.email)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">{children}</div>
    </div>
  );
}
