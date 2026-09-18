import { redirect } from "next/navigation";
import { requireSessie } from "@/lib/auth/require-role";
import { heeftBasisdata } from "@/lib/auth/gebruiker";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPagina() {
  requireSessie();

  const heeftData = await heeftBasisdata();
  if (heeftData) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen">
      <OnboardingWizard />
    </main>
  );
}
