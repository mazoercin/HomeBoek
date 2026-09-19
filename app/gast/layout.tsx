import { GastNavigatieBalk } from "@/components/gast/GastNavigatieBalk";

export default function GastLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <GastNavigatieBalk />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">{children}</div>
    </div>
  );
}
