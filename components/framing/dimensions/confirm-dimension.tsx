"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { DimensionConfirm } from "@/components/ui/dimension-list";
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
    <DimensionConfirm
      label={t.dimensions.confirmAll(count)}
      pendingLabel={fr.framingIntel.guide.confirming}
      hint={t.dimensions.confirmAllHint(count)}
      pending={pending}
      onConfirm={confirm}
    />
  );
}
