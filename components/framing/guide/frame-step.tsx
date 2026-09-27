"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConstraintDialog } from "@/components/framing/guide/constraint-dialog";
import {
  OptionContent,
  optionClass,
} from "@/components/framing/guide/guide-row";
import { SourceDetail } from "@/components/framing/guide/source-quote";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { confirmProposed } from "@/lib/framing/actions/review";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

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
      title={t.title}
      actions={
        editable && (
          <>
            <Button
              size="lg"
              variant="ghost"
              disabled={pending}
              onClick={() => setEditing(null)}
            >
              {t.add}
            </Button>
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
          </>
        )
      }
    >
      {constraints.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {constraints.map((c) => (
            <li key={c.id} className="flex flex-col gap-2">
              <span className="text-body-md font-medium text-foreground">
                {typeLabel(c.type)}
              </span>
              <button
                type="button"
                disabled={!editable}
                onClick={() => setEditing(c)}
                className={optionClass(false)}
              >
                <OptionContent
                  detail={
                    <SourceDetail
                      provenance={c.provenance}
                      proposed={c.review_status === "proposed"}
                    />
                  }
                >
                  {c.text}
                </OptionContent>
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
