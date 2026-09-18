"use server";

import { redirect } from "next/navigation";
import { verwijderSessieCookie } from "@/lib/auth/session";

export async function uitloggen(): Promise<void> {
  verwijderSessieCookie();
  redirect("/login");
}
