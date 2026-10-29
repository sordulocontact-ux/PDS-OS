"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { confirmDimension } from "@/lib/framing/actions/questions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * « Confirmer les n » under a dimension's proposals (proto « Suite du
 * Cadrage », Sacha 29/10/2026): what PO understood of the exchange,
 * confirmed in one gesture once read, each line keeping its source. The
 * banner says it; when it was the last thing left, the Brief de cadrage
 * opens, as after the last answer (useNextQuestion).
 */
export function ConfirmDimension({
  projectId,
  dimension,
  name,
  count,
  briefHref,
}: {
  projectId: string;
  dimension: string;
  name: string;
  count: number;
  // Set when nothing else is left in the six dimensions.
  briefHref: string | null;
}) {
  const t = fr.framingJourney;
  const { pending, run } = useFramingAction();
  const publish = usePublishResult();
  const confirm = () =>
    run(
      () => confirmDimension(projectId, dimension),
      () => {
        publish(
          {
            ok: true,
            done: t.dimensions.confirmedAll(count, name),
            ...(briefHref && {
              open: {
                href: briefHref,
                step: `${t.module} › ${t.steps.brief.title}`,
              },
            }),
          },
          undefined,
          { toast: !!briefHref },
        );
      },
    );
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-3.5 py-3">
      <Button
        size="sm"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={confirm}
      >
        {pending
          ? fr.framingIntel.guide.confirming
          : t.dimensions.confirmAll(count)}
      </Button>
      <p className="min-w-48 flex-1 text-caption text-[color:var(--text-secondary)]">
        {t.dimensions.confirmAllHint(count)}
      </p>
    </div>
  );
}
