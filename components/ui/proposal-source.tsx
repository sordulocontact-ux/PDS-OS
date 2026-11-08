import Link from "next/link";
import type { ReactNode } from "react";

import { decisions } from "@/lib/i18n/fr/decisions";
import type { Proposal } from "@/lib/ui/proposal";

const fr = { decisions };

const t = fr.decisions.proposal;

/**
 * Where a proposal comes from, under its words (Sacha 07/11/2026, after
 * Vanta / Adaline: easier to read than one grey sentence): the exact quote
 * set apart on a soft ground with a rule on its left, then one quiet line — `lead` (the state in words),
 * « Modifié par … », the source (a link when it has a page, the call),
 * `after` (who decided). The quote stays after an edit.
 */
export function ProposalSource({
  proposal,
  lead,
  after,
}: {
  proposal: Pick<Proposal, "quote" | "from" | "href" | "editedBy">;
  lead?: ReactNode;
  after?: ReactNode;
}) {
  const { quote, from, href, editedBy } = proposal;
  const source =
    from && href ? (
      <Link
        href={href}
        className="underline decoration-[color:var(--border-default)] underline-offset-4 hover:text-foreground hover:decoration-current"
      >
        {from}
      </Link>
    ) : (
      from
    );
  const meta = [
    lead,
    editedBy && t.editedBy(editedBy),
    source,
    after,
  ].filter(Boolean);
  if (!quote && meta.length === 0) return null;
  return (
    <>
      {quote && (
        <blockquote className="rounded-r-md border-l-2 border-[color:var(--border-default)] bg-[var(--surface-soft)] px-3 py-2 text-body-sm break-words text-[color:var(--text-secondary)]">
          {t.quote(quote)}
        </blockquote>
      )}
      {meta.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-1.5 text-caption text-[color:var(--text-tertiary)]">
          {meta.map((part, i) => (
            <span key={i} className="flex items-center gap-x-1.5">
              {i > 0 && <span aria-hidden>·</span>}
              {part}
            </span>
          ))}
        </p>
      )}
    </>
  );
}
