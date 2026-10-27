"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { usePublishResult } from "@/components/shell/module/result-banner";
import type { QuestionKey } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

const t = fr.framingJourney;

/**
 * After an answer in « Les 6 dimensions » (lot 3 of Ibé's feedback): the
 * banner says what was just recorded (« Réponse confirmée · Date cible »)
 * above the next question, without a toast — a Cadrage has dozens of
 * answers. After the last one, the Brief de cadrage, the same person's next
 * step, opens by itself with the banner and the toast.
 */
export function useNextQuestion(nextHref: string, key: QuestionKey) {
  const router = useRouter();
  const pathname = usePathname();
  const publish = usePublishResult();
  return useCallback(
    (done: string) => {
      const leaving =
        new URL(nextHref, "http://pds.local").pathname !== pathname;
      const result = {
        ok: true as const,
        done: t.dimensions.answered(done, fr.framingIntel.questions[key].label),
        ...(leaving && {
          open: {
            href: nextHref,
            step: `${t.module} › ${t.steps.brief.title}`,
          },
        }),
      };
      publish(result, undefined, { toast: leaving });
      if (!leaving) router.push(nextHref);
    },
    [nextHref, key, pathname, publish, router],
  );
}
