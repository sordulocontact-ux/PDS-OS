// The name of an exported contract. Client-safe.

/** "Cession compositeur — Ever.pdf", safe for any file system. */
export function documentFileName(title: string): string {
  const clean = title.replace(/[\\/:*?"<>|]+/g, " ").trim();
  return `${clean || "contrat"}.pdf`;
}
