/**
 * A ready e-mail (`mailto:`), opened in the person's own mail app: what
 * PDS OS does not send itself (no SMTP, no address, lib/email/send.ts).
 * Several addresses: separated by commas, kept as such (RFC 6068).
 */
export function mailtoHref(
  to: string,
  subject: string,
  body: string,
  // Copies written in the card (Sacha 22/11/2026), separated by commas.
  copies: { cc?: string; bcc?: string } = {},
): string {
  const list = (value: string) =>
    encodeURIComponent(value).replace(/%40/g, "@").replace(/%2C/g, ",");
  const extra = [
    copies.cc ? `&cc=${list(copies.cc)}` : "",
    copies.bcc ? `&bcc=${list(copies.bcc)}` : "",
  ].join("");
  return `mailto:${list(to)}?subject=${encodeURIComponent(subject)}${extra}&body=${encodeURIComponent(body)}`;
}
