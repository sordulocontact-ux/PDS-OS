// The brand behind a sender's address, for its icon in « Mails »
// (lib/integrations/favicon.ts reads it; the list asks /api/mailbox/icon).
// Shared by the server and the browser: no secret, no call.

const DOMAIN =
  /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

// Mailboxes of people, not brands: their initials say more than a logo.
const PERSONAL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.fr",
  "live.com",
  "live.fr",
  "msn.com",
  "yahoo.com",
  "yahoo.fr",
  "icloud.com",
  "me.com",
  "mac.com",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "proton.me",
  "protonmail.com",
  "gmx.fr",
  "gmx.com",
]);

/** The brand's domain of an address: « notifications@mail.vercel.com » →
 * « vercel.com », « x@shop.co.uk » → « shop.co.uk »; null for a person's
 * mailbox or anything that is not a domain. */
export function brandDomainOf(address: string | null): string | null {
  const host = address?.split("@")[1]?.trim().toLowerCase();
  if (!host || !DOMAIN.test(host)) return null;
  const labels = host.split(".");
  // A two-letter country code under a short second level (co.uk, com.au).
  const keep =
    labels.length > 2 &&
    labels[labels.length - 1].length === 2 &&
    labels[labels.length - 2].length <= 3
      ? 3
      : 2;
  const domain = labels.slice(-keep).join(".");
  return PERSONAL.has(domain) ? null : domain;
}

export const isIconDomain = (domain: string) =>
  DOMAIN.test(domain) && !PERSONAL.has(domain);
