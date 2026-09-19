"use server";

import { revalidatePath } from "next/cache";
import { wisLogbestand } from "@/lib/logger.server";
import { vereisHouseholdRol } from "@/lib/auth/household";

export async function wisLogboek(): Promise<void> {
  await vereisHouseholdRol("owner");
  await wisLogbestand();
  revalidatePath("/instellingen");
}
