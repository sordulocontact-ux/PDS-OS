"use client";

import { useRouter } from "next/navigation";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { DimensionConfirm } from "@/components/ui/dimension-list";
import { routes } from "@/lib/auth/redirects";
import { confirmDimension } from "@/lib/framing/actions/questions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * « Confirmer les n » under a dimension's proposals (proto « Suite du
 * Cadrage », Sacha 29/10/2026): what PO understood of the exchange,
 * confirmed in one gesture once read, each line keeping its source. One
 * quiet line says it in the dimension (`at`, ResultLine); when it was the
 * last thing left, the Brief de cadrage opens with the banner, as after the
 * last answer (useNextQuestion).
 */
export function ConfirmDimension({
  projectId,
  dimension,
  name,
  count,
  briefHref,
  at,
}: {
  projectId: string;
  dimension: string;
  name: string;
  count: number;
  // Where its confirmation is said.
  at: string;
  // Set when nothing else is left in the six dimensions.
  briefHref: string | null;
}) {
  const t = fr.framingJourney;
  const { pending, run } = useFramingAction();
  const publish = usePublishResult();
  const router = useRouter();
  const confirm = () =>
    run(
      () => confirmDimension(projectId, dimension),
      () => {
        publish(
          {
            ok: true,
            done: t.dimensions.confirmedAll(count, name),
            ...(briefHref
              ? {
                  open: {
                    href: briefHref,
                    step: `${t.module} › ${t.steps.brief.title}`,
                  },
                }
              : { at }),
          },
          undefined,
          { toast: !!briefHref },
        );
        // The dimension stays open, where its confirmation is said.
        if (!briefHref)
          router.replace(
            routes.projectFramingLine(projectId, null, null, dimension),
            { scroll: false },
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
