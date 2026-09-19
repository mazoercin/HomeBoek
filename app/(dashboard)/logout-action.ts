"use server";

import { redirect } from "next/navigation";
import { maakServerClient } from "@/lib/supabase/server";
import { verwijderSessieCookie } from "@/lib/auth/session";

export async function uitloggen(): Promise<void> {
  const supabase = maakServerClient();
  await supabase.auth.signOut();
  verwijderSessieCookie();
  redirect("/login");
}
