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

// "contact@mail.fr", "mailto:booking@x.com", "📩 nom@gmail.com": the
// candidates, then checked one by one by `isEmail`.
const CANDIDATE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * The e-mail addresses written in a free text (a TikTok bio, a screenshot's
 * lines, a Linktree's links), in order, each once, lowercased. Read by the
 * code, never guessed.
 */
export function emailsIn(text: string): string[] {
  const found = (text.match(CANDIDATE) ?? [])
    .map((value) => value.replace(/\.+$/, "").toLowerCase())
    .filter(isEmail);
  return [...new Set(found)];
}
