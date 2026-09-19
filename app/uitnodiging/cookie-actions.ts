"use server";

import { bewaarUitnodigingTokenServer } from "@/lib/auth/uitnodiging-cookie";

/** Client-aanroepbare server action — zie lib/auth/uitnodiging-cookie.ts voor waarom dit een apart bestand is. */
export async function bewaarUitnodigingToken(token: string): Promise<void> {
  bewaarUitnodigingTokenServer(token);
}
