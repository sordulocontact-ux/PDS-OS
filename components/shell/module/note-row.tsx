"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { decideStepNote } from "@/lib/step-tools/actions";
import type { StepNote } from "@/lib/step-tools/model";
import { noteStatusTone } from "@/lib/ui/state-tones";
import { formatDayMonth } from "@/lib/utils/instant";
import { cn } from "@/lib/utils";

const t = fr.stepTools;

/**
 * One noted information (proto decRow): what was said, its source, who
 * noted it and when, its step; its status; the owner's « Confirmer » /
 * « Décider » and « Écarter », or « Fait foi » inside a contradiction.
 */
export function NoteRow({
  projectId,
  note: n,
  stepLabel,
  inContradiction = false,
  canDecide,
}: {
  projectId: string;
  note: StepNote;
  stepLabel?: string;
  inContradiction?: boolean;
  canDecide: boolean;
}) {
  const { pending, error, run } = useWriteSubmit(() => {}, "");
  const decide = (decision: "decide" | "discard" | "authoritative") =>
    run(
      () => decideStepNote({ projectId, noteId: n.id, decision }),
      decision === "decide"
        ? t.notes.doneDecide
        : decision === "discard"
          ? t.notes.doneDiscard
          : t.notes.doneAuthoritative,
    );
  const open = n.status === "to_confirm" || n.status === "pending_decision";
  const source = [
    t.notes.source(t.sources[n.source], n.notedBy, formatDayMonth(n.notedAt)),
    stepLabel,
    n.decided && t.notes.confirmed(n.decided.by, formatDayMonth(n.decided.at)),
    n.discarded && t.notes.discardedTag,
    n.authoritative && t.notes.authoritativeTag,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-t border-[color:var(--border-hairline)] py-3 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <b
          className={cn(
            "font-semibold",
            n.discarded && "text-muted-foreground line-through",
          )}
        >
          {n.body}
        </b>
        <span className="text-caption text-muted-foreground">{source}</span>
        {error && (
          <span role="alert" className="text-body-sm text-error">
            {error}
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {n.discarded ? (
          <StatusBadge size="sm">{t.notes.discarded}</StatusBadge>
        ) : (
          <StatusBadge size="sm" tone={noteStatusTone[n.status]}>
            {t.statuses[n.status]}
          </StatusBadge>
        )}
        {canDecide && inContradiction && !n.discarded && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => decide("authoritative")}
          >
            {t.notes.authoritative}
          </Button>
        )}
        {canDecide && !inContradiction && !n.discarded && open && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => decide("decide")}
            >
              {n.status === "pending_decision"
                ? t.notes.decide
                : t.notes.confirm}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => decide("discard")}
            >
              {t.notes.discard}
            </Button>
          </>
        )}
      </span>
    </li>
  );
}
