import { z } from "zod";

const email = z.email().max(320);

/**
 * An e-mail address as the server accepts it (zod's rule), shared by the
 * browser and the server so a typed address is never accepted by one and
 * refused by the other ("nom@domaine.fr`" with a stray backtick, 10/10/2026).
 */
export function isEmail(value: string): boolean {
  return email.safeParse(value).success;
}
