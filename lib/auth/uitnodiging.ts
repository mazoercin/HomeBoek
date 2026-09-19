import { randomBytes, createHash } from "crypto";

/** 32 bytes cryptografisch veilige token — enkel dit (nooit de hash) staat in de link. */
export function genereerUitnodigingsToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256-hash van de token — dit, en enkel dit, wordt in de database bewaard. */
export function hashUitnodigingsToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
