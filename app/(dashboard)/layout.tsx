import { requireSessie } from "@/lib/auth/require-role";
import { NavigatieBalk } from "@/components/NavigatieBalk";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessie = requireSessie();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <NavigatieBalk rol={sessie.rol} />
      <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
