import { fr } from "@/lib/i18n/fr";
import type { ExternalDoc } from "@/lib/strategy/documents/model";
import { documentHtml } from "@/lib/strategy/documents/render";

/**
 * A generated Plan de sortie or Dossier de presse, page by page, as it will
 * be shared and printed: the same HTML, in a sandboxed frame (no script).
 */
export function DocumentPreview({ doc }: { doc: ExternalDoc }) {
  return (
    <iframe
      title={`${fr.strategyDocs.kinds[doc.kind]} · ${doc.project.title}`}
      srcDoc={documentHtml(doc)}
      sandbox=""
      className="h-[80dvh] w-full rounded-2xl border border-border bg-[var(--surface-tint)]"
    />
  );
}
