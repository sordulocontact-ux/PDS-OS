"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConstraintDialog } from "@/components/framing/guide/constraint-dialog";
import { sourceLabel } from "@/components/framing/guide/source-quote";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { confirmProposed } from "@/lib/framing/actions/review";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

type Constraint = FramingData["constraints"][number];

/** Cadre & contraintes: one line per constraint, each corrected on its own. */
export function FrameStep({
  constraints,
  projectId,
  editable,
  nextHref,
}: {
  constraints: FramingData["constraints"];
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingGuide.frame;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  // undefined: closed; null: a new line; a line: editing it.
  const [editing, setEditing] = useState<Constraint | null | undefined>();
  const typeLabel = (type: string) =>
    t.types[type as keyof typeof t.types] ?? t.types.other;

  return (
    <FramingStepCard
      eyebrow={t.eyebrow}
      title={t.title}
      description={t.body}
      actions={
        editable && (
          <>
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                run(
                  () => confirmProposed(projectId, "frame"),
                  () => router.push(nextHref),
                )
              }
            >
              {t.confirm}
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(null)}
            >
              {t.add}
            </Button>
          </>
        )
      }
    >
      {constraints.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {constraints.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={!editable}
                onClick={() => setEditing(c)}
                className={cn(
                  "-mx-3 grid w-[calc(100%+1.5rem)] gap-1 rounded-lg px-3 py-2.5 text-left sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4",
                  editable &&
                    "hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                )}
              >
                <span className="text-body-md font-semibold">
                  {typeLabel(c.type)}
                </span>
                <span className="flex min-w-0 flex-col items-start gap-1">
                  <span className="text-body-md break-words">{c.text}</span>
                  {c.provenance && (
                    <span className="text-caption text-muted-foreground">
                      {sourceLabel(c.provenance)}
                    </span>
                  )}
                  {c.review_status === "proposed" && <ProposedBadge />}
                  <ProvenanceNote provenance={c.provenance} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConstraintDialog
        projectId={projectId}
        constraint={editing ?? null}
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
      />
    </FramingStepCard>
  );
}
