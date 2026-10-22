"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useNextQuestion } from "@/components/framing/dimensions/use-next-question";
import { ConstraintDialog } from "@/components/framing/guide/constraint-dialog";
import { sourceLabel } from "@/components/framing/guide/source-quote";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { confirmQuestion } from "@/lib/framing/actions/questions";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

type Constraint = FramingData["constraints"][number];

/**
 * The constraint lines of « Budget & contraintes » (financial, creative,
 * human, operational), or the known blockers of « Cadre juridique » (rights
 * lines): each corrected on its own, the proposed ones confirmed together.
 */
export function ConstraintLines({
  constraints,
  scope,
  projectId,
  editable,
  nextHref,
}: {
  constraints: FramingData["constraints"];
  scope: "budget" | "legal";
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingGuide.frame;
  const types = fr.framingIntel.constraintTypes as Record<string, string>;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [editing, setEditing] = useState<Constraint | null | undefined>();
  const lines = constraints.filter((c) =>
    scope === "legal" ? c.type === "rights" : c.type !== "rights",
  );
  const proposed = lines.some((c) => c.review_status === "proposed");
  const key = scope === "legal" ? "legal_blockers" : "constraints";
  const goNext = useNextQuestion(nextHref, key);

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 && (
        <ul className="flex flex-col gap-1">
          {lines.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={!editable}
                onClick={() => setEditing(c)}
                className={cn(
                  "-mx-3 grid w-[calc(100%+1.5rem)] gap-1 rounded-lg px-3 py-2.5 text-left",
                  scope === "budget" &&
                    "sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4",
                  editable &&
                    "hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {scope === "budget" && (
                  <span className="text-body-md font-semibold">
                    {types[c.type] ?? types.other}
                  </span>
                )}
                <span className="flex min-w-0 flex-col items-start gap-1">
                  <span className="text-body-md break-words">{c.text}</span>
                  {c.provenance && (
                    <span className="text-caption text-muted-foreground">
                      {sourceLabel(c.provenance)}
                    </span>
                  )}
                  {c.review_status === "proposed" && (
                    <ProposedBadge provenance={c.provenance} />
                  )}
                  <ProvenanceNote provenance={c.provenance} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="flex flex-wrap gap-2">
          {lines.length > 0 && (
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                proposed
                  ? run(
                      () => confirmQuestion(projectId, key),
                      () =>
                        goNext(fr.framingJourney.dimensions.gesture.confirmed),
                    )
                  : router.push(nextHref)
              }
            >
              {proposed
                ? fr.framingIntel.guide.confirm
                : fr.framingIntel.guide.next}
            </Button>
          )}
          <Button
            size="lg"
            variant={lines.length > 0 ? "outline" : "default"}
            disabled={pending}
            onClick={() => setEditing(null)}
          >
            {t.add}
          </Button>
        </div>
      )}
      <ConstraintDialog
        projectId={projectId}
        constraint={editing ?? null}
        scope={scope}
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
      />
    </div>
  );
}
