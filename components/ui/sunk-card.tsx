import { StatusBadge } from "@/components/ui/status-badge";
import type { Tone } from "@/lib/ui/state-tones";

/**
 * A document or a proposal inside a step's card (proto « Suite du Cadrage »,
 * Sacha 29/10/2026): sunk to the page's surface, its name and where it
 * comes from (« Proposée par PO à partir du Brief… », « Créée par … »), its
 * state and its actions (« Copier le lien », PDF, « Ajouter une étape »), a
 * rule across the whole width under that head, the content, then the
 * gesture on it (`footer`: send, decide, launch) under a rule. The Brief de
 * cadrage and the Plan du projet. Server-safe.
 */
export function SunkCard({
  id,
  title,
  meta,
  status,
  actions,
  children,
  footer,
}: {
  // Its heading's id (aria-labelledby), unique on the page.
  id: string;
  title: string;
  meta?: string | null;
  status?: { tone: Tone; label: string } | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)] p-4.5"
    >
      <header className="-mx-4.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[color:var(--border-hairline)] px-4.5 pb-3.5">
        <div className="flex min-w-0 flex-col">
          <h3 id={id} className="text-body-lg font-semibold">
            {title}
          </h3>
          {meta && (
            <p className="text-caption text-[color:var(--text-secondary)]">
              {meta}
            </p>
          )}
        </div>
        {(status || actions) && (
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            )}
            {actions}
          </div>
        )}
      </header>
      {children}
      {footer && (
        <div className="flex flex-col gap-3.5 border-t border-[color:var(--border-hairline)] pt-4">
          {footer}
        </div>
      )}
    </article>
  );
}
