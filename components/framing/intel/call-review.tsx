"use client";

import Link from "next/link";

import { FramingStepCard } from "@/components/framing/guide/step-card";
import { SourceLine } from "@/components/framing/source-line";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { confirmQuestion } from "@/lib/framing/actions/questions";
import type { QuestionStatus } from "@/lib/framing/assess";
import type { Provenance } from "@/lib/framing/brief";
import type { Dimension } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";
import { factTone } from "@/lib/ui/state-tones";

export type ReviewRow = {
  key: string;
  dimension: Dimension;
  label: string;
  status: QuestionStatus;
  value: string | null;
  quote: string | null;
  provenance: Provenance | null;
  sourceState: "proposed" | "record" | "known";
  confirmed?: { by: string | null; at: string | null };
  // A sentence to structure before confirming (objective, items).
  needsStructure: boolean;
  // Proposed from this call: what PO understood, to confirm.
  fromCall: boolean;
  href: string;
};

/**
 * After a framing call (ticket § 6): PO's interpretation, dimension by
 * dimension. Each datum heard is confirmed or modified; each one missing
 * says so and opens its question. Nothing becomes true without a click.
 */
export function CallReview({
  projectId,
  callTitle,
  rows,
  editable,
  guideHref,
}: {
  projectId: string;
  callTitle: string;
  rows: ReviewRow[];
  editable: boolean;
  guideHref: string;
}) {
  const t = fr.framingIntel;
  const { pending, run } = useFramingAction();
  const heard = rows.some((r) => r.fromCall && r.status === "to_confirm");
  const dimensions = [...new Set(rows.map((r) => r.dimension))];

  return (
    <FramingStepCard
      eyebrow={t.guide.saidInCall}
      title={t.guide.review.title(callTitle)}
      description={heard ? t.guide.review.body : t.guide.review.empty}
      actions={
        <Link href={guideHref} className={buttonVariants({ size: "lg" })}>
          {t.guide.review.backToGuide}
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        {dimensions.map((dimension) => (
          <section key={dimension} className="flex flex-col gap-2">
            <h3 className="text-body-md font-semibold">
              {t.dimensions[dimension]}
            </h3>
            <ul className="flex flex-col gap-2">
              {rows
                .filter((r) => r.dimension === dimension)
                .map((row) => (
                  <li key={row.key} className="flex flex-col gap-1.5 py-2">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-caption text-muted-foreground">
                        {row.label}
                      </span>
                      <StatusBadge tone={factTone[row.status]} size="sm">
                        {t.statuses[row.status]}
                      </StatusBadge>
                    </span>
                    {row.status === "missing" ? (
                      <span className="text-body-md text-muted-foreground">
                        {t.guide.missingInfo}
                      </span>
                    ) : (
                      <span className="text-body-md break-words whitespace-pre-line">
                        {row.value}
                      </span>
                    )}
                    {row.fromCall && row.quote && (
                      <span className="text-caption text-muted-foreground">
                        « {row.quote} »
                      </span>
                    )}
                    {row.status !== "missing" && (
                      <SourceLine
                        projectId={projectId}
                        provenance={row.provenance}
                        state={row.sourceState}
                        confirmed={row.confirmed}
                      />
                    )}
                    {editable && row.status !== "known" && (
                      <span className="flex flex-wrap gap-2 pt-1">
                        {row.status === "to_confirm" && !row.needsStructure && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(() => confirmQuestion(projectId, row.key))
                            }
                          >
                            {t.guide.confirm}
                          </Button>
                        )}
                        <Link
                          href={row.href}
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                          })}
                        >
                          {row.status === "missing"
                            ? t.guide.complete
                            : row.needsStructure
                              ? t.guide.structure
                              : t.guide.modify}
                        </Link>
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </FramingStepCard>
  );
}
