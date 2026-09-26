"use client";

import Link from "next/link";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DraftProposal } from "@/lib/assistant/drafts";
import { fr } from "@/lib/i18n/fr";
import { reviewTone } from "@/lib/ui/state-tones";

/**
 * A PO draft in the conversation: what it would write (written by code, the
 * previous value struck through), what PO could not fill, and the button that
 * opens the real form. Nothing is saved before that form is.
 */
export function DraftCard({
  toolCallId,
  proposal,
}: {
  toolCallId: string;
  proposal: DraftProposal;
}) {
  const t = fr.assistant.drafts;
  const { saved, review } = useAssistant();
  const link = saved[toolCallId];

  return (
    <section
      aria-label={proposal.title}
      className="grid gap-3 rounded-xl border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{proposal.title}</p>
        <StatusBadge
          tone={reviewTone[link ? "confirmed" : "proposed"]}
          size="sm"
        >
          {link ? t.saved : t.badge}
        </StatusBadge>
      </div>

      {proposal.changes.length > 0 ? (
        <dl className="grid gap-2 text-xs">
          {proposal.changes.map((c) => (
            <div key={c.label} className="grid gap-0.5">
              <dt className="text-muted-foreground">{c.label}</dt>
              <dd className="line-clamp-3 whitespace-pre-wrap">
                {c.before && (
                  <>
                    <del className="text-muted-foreground">{c.before}</del>{" "}
                  </>
                )}
                {c.after}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">{t.empty}</p>
      )}

      {proposal.warnings.length > 0 && (
        <ul className="grid list-disc gap-1 pl-4 text-xs text-[color:var(--tone-warning-fg)]">
          {proposal.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {link ? (
        <Link
          href={link.href}
          className="w-fit text-sm font-medium underline underline-offset-4"
        >
          {t.open} : {link.label}
        </Link>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button size="sm" onClick={() => review(toolCallId, proposal)}>
            {t.review}
          </Button>
          <span className="text-caption text-muted-foreground">
            {t.notSaved}
          </span>
        </div>
      )}
    </section>
  );
}
