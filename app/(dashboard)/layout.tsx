import { requireSessie } from "@/lib/auth/require-role";
import { NavigatieBalk } from "@/components/NavigatieBalk";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessie = requireSessie();

  return (
    <div className="min-h-screen">
      <NavigatieBalk rol={sessie.rol} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">{children}</div>
    </div>
  );
}
