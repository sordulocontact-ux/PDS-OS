"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { routes } from "@/lib/auth/redirects";
import { isStrategyTextField } from "@/lib/framing/brief";
import { framing } from "@/lib/i18n/fr/framing";
import { strategy } from "@/lib/i18n/fr/strategy";
import { strategyDraft } from "@/lib/i18n/fr/strategy-draft";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import { prepareStrategyDraft } from "@/lib/strategy/actions/draft";
import type { DraftField, PriorityQuestions } from "@/lib/strategy/draft-plan";

const fr = { framing, strategy, strategyPilot, strategyDraft };

/** The name of a drafted field, as its question or part is titled. */
export function draftFieldLabel(field: DraftField): string {
  if (isStrategyTextField(field)) return fr.strategy.choices.questions[field];
  const positioning: Record<string, string> =
    fr.strategyPilot.positioning.parts;
  const narrative: Record<string, string> = fr.strategyPilot.narrative.parts;
  return positioning[field] ?? narrative[field] ?? field;
}

/**
 * « Préparer un brouillon » (MKT-S1-09): PO drafts the empty texts from the
 * validated Cadrage and the calls, each a proposal with its source; the
 * outcome is a toast, then the points nothing answered, grouped by
 * dimension, each a link to where it is answered. Owner only, while the
 * strategy is editable.
 */
export function StrategyDraftButton({ projectId }: { projectId: string }) {
  const t = fr.strategyDraft.draft;
  const canEdit = useCanEditProject();
  const [pending, startTransition] = useTransition();
  const [questions, setQuestions] = useState<PriorityQuestions>([]);

  if (!canEdit) return null;

  function prepare() {
    startTransition(async () => {
      const result = await prepareStrategyDraft(projectId);
      if (result.ok) {
        toast(t.created(result.created));
        setQuestions(result.questions);
      } else if (result.error === "no_sources") toast(t.noSources);
      else if (result.error === "stage_locked")
        toast.error(fr.framing.errors.stage_locked);
      else toast.error(result.error === "quota" ? result.message : t.failed);
    });
  }

  const dimensions: Record<string, string> = fr.strategyPilot.dimensions;
  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        onClick={prepare}
        disabled={pending}
        aria-busy={pending || undefined}
        title={t.hint}
      >
        {pending ? t.working : t.button}
      </Button>
      <Dialog
        open={questions.length > 0}
        onOpenChange={(open) => !open && setQuestions([])}
      >
        <DialogContent closeLabel={t.close}>
          <DialogHeader>
            <DialogTitle>{t.questionsTitle}</DialogTitle>
            <DialogDescription>{t.questionsHint}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {questions.map((group) => (
              <section key={group.dimension} className="flex flex-col gap-2">
                <h3 className="text-body-md font-semibold">
                  {dimensions[group.dimension]}
                </h3>
                <ul className="flex flex-col gap-1">
                  {group.fields.map((field) => (
                    <li key={field}>
                      <Link
                        href={`${routes.projectStrategy(projectId)}?d=${group.dimension}#answer-${field}`}
                        onClick={() => setQuestions([])}
                        className="flex items-baseline justify-between gap-3 rounded-md py-1 text-body-md hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="break-words">
                          {draftFieldLabel(field)}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {t.open}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="lg" onClick={() => setQuestions([])}>
              {t.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
