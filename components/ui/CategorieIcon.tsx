import { Home, Zap, Flame, Droplet, Wifi, Shield, CreditCard, FileText, type LucideIcon } from "lucide-react";
import type { Categorie } from "@/types/database";

/**
 * Vector-icoon + kleur per kostencategorie, zodat je in één oogopslag
 * (zonder te moeten lezen) ziet wat voor kost iets is — vervangt de
 * eerdere emoji-iconen door consistente, professionele Lucide-iconen.
 */
const CATEGORIE_ICOON: Record<Categorie, { icoon: LucideIcon; kleur: string; achtergrond: string }> = {
  huis: { icoon: Home, kleur: "#6366F1", achtergrond: "#EEF2FF" },
  energie: { icoon: Zap, kleur: "#F59E0B", achtergrond: "#FFFBEB" },
  mazout_gas: { icoon: Flame, kleur: "#F43F5E", achtergrond: "#FFF1F2" },
  water: { icoon: Droplet, kleur: "#0EA5E9", achtergrond: "#F0F9FF" },
  internet: { icoon: Wifi, kleur: "#8B5CF6", achtergrond: "#F5F3FF" },
  verzekering: { icoon: Shield, kleur: "#10B981", achtergrond: "#ECFDF5" },
  krediet: { icoon: CreditCard, kleur: "#EC4899", achtergrond: "#FDF2F8" },
  andere: { icoon: FileText, kleur: "#64748B", achtergrond: "#F1F5F9" },
};

export function categorieInfo(categorie: Categorie) {
  return CATEGORIE_ICOON[categorie];
}

export function CategorieIcon({ categorie, size = 20 }: { categorie: Categorie; size?: number }) {
  const { icoon: Icoon, kleur, achtergrond } = CATEGORIE_ICOON[categorie];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: size + 20, height: size + 20, backgroundColor: achtergrond }}
      aria-hidden
    >
      <Icoon size={size} color={kleur} strokeWidth={2.25} />
    </span>
  );
}
