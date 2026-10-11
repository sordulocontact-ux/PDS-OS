/**
 * A ready e-mail (`mailto:`), opened in the person's own mail app: PDS OS
 * sends no e-mail itself (no mail provider, docs/CONTEXTE-PROJET.md).
 * Several addresses: separated by commas, kept as such (RFC 6068).
 */
export function mailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to).replace(/%40/g, "@").replace(/%2C/g, ",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
