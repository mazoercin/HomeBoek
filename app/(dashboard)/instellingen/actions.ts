"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { wisLogbestand } from "@/lib/logger.server";

export async function wisLogboek(): Promise<void> {
  requireRole("admin");
  await wisLogbestand();
  revalidatePath("/instellingen");
}
