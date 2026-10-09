// Names of the Strategy documents' files. Client-safe.

import { fr } from "@/lib/i18n/fr";
import type { DocumentKind } from "@/lib/strategy/workspace";

/** "Plan de sortie V2 - Piégée.pdf", safe for any file system. */
export function documentFileName(
  kind: DocumentKind,
  projectTitle: string,
  version: number,
): string {
  const title = projectTitle.replace(/[\\/:*?"<>|]+/g, " ").trim();
  return `${fr.strategyDocs.kinds[kind]} ${fr.strategyDocs.version(version)} - ${title || "projet"}.pdf`;
}
