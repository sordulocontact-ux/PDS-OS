import { DocumentCard } from "@/components/ui/document-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Tone } from "@/lib/ui/state-tones";

/**
 * A version of the Brief de cadrage as the documents of the Master and the
 * Juridique (Sacha 05/11/2026 : « c'est pareil, c'est un document »): the
 * shared `DocumentCard` — name, its state, « Copier le lien » and
 * « Télécharger le PDF » —, what changed since the version before on its
 * info strip, the six dimensions as its body; who made and validated it in
 * small under the card, then the gesture on it (send, decide). Server-safe:
 * the direction's review (client) uses it too.
 */
export function BriefDocument({
  title,
  meta,
  status,
  actions,
  changes,
  footer,
  children,
}: {
  title: string;
  meta?: string | null;
  status: { tone: Tone; label: string };
  actions?: React.ReactNode;
  // « Changé depuis la version 1 : … ».
  changes?: string | null;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <DocumentCard
        name={title}
        action={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone} size="sm">
              {status.label}
            </StatusBadge>
            {actions}
          </span>
        }
        change={changes}
      >
        <div className="px-3.5 pt-2.5 pb-1">{children}</div>
      </DocumentCard>
      {/* Who made and validated it: secondary, under the Brief (Sacha
          05/11/2026, « on s'en fiche un peu »), not in its head. */}
      {meta && (
        <p className="-mt-2 text-caption text-[color:var(--text-secondary)]">
          {meta}
        </p>
      )}
      {footer && <div className="flex flex-col gap-3.5">{footer}</div>}
    </div>
  );
}
