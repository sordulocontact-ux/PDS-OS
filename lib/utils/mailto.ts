/**
 * A ready e-mail (`mailto:`), opened in the person's own mail app: PDS OS
 * sends no e-mail itself (no mail provider, docs/CONTEXTE-PROJET.md).
 */
export function mailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
