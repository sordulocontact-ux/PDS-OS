"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { StartChoices } from "@/components/ui/start-choices";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { strategyJourney } from "@/lib/i18n/fr/strategy-journey";
import { routes } from "@/lib/auth/redirects";
import { startStrategyDirect } from "@/lib/strategy/actions/add-line";
import { cn } from "@/lib/utils";

const fr = { strategyJourney };

/**
 * The two ways in (proto stratEntry / prepGate « strat »): « Commencer la
 * stratégie » (straight on the 8 dimensions) and « Préparer un échange »
 * (the common call form, in the step). « Recommandé » on the one the code
 * chose, its reason under the cards. The form's « Revenir au choix » goes back to
 * the cards until the exchange is created (as the Cadrage, Sacha 29/10).
 * Once started directly (`started`), the cards stay while the strategy is
 * open: « Reprendre la stratégie » or an exchange after all — the way in
 * can always change, as the Cadrage's (Sacha 06/11/2026).
 */
export function StrategyStartWays({
  projectId,
  recommended,
  reason,
  callDefaults,
  started = false,
  startedOn = null,
}: {
  projectId: string;
  recommended: "call" | "po";
  reason: string | null;
  callDefaults: CallPrepDefaults;
  started?: boolean;
  // « 28/10 »: when it was started, said on « Reprendre la stratégie ».
  startedOn?: string | null;
}) {
  const t = fr.strategyJourney.start;
  const [way, setWay] = useState<"call" | null>(null);
  const { pending, error, run } = useWriteSubmit(() => undefined, t.started);
  const startDirectly = () => run(() => startStrategyDirect(projectId));
  const po = started ? t.choices.resume : t.choices.po;

  if (way === "call")
    return (
      <CallPrepForm defaults={callDefaults} stay onBack={() => setWay(null)} />
    );

  return (
    <div
      // Started, « Continuer ou changer de départ » is a new section, set
      // apart from the step's title (as the Cadrage).
      className={cn("flex flex-col gap-2", started && "pt-6")}
      aria-busy={pending || undefined}
    >
      <StartChoices
        legend={started ? t.changeLegend : undefined}
        recommended={recommended}
        reason={reason}
        pending={pending ? "po" : null}
        choices={[
          {
            value: "po",
            title: po.title,
            body: po.body,
            badge: startedOn
              ? t.choices.resume.startedOn(startedOn)
              : undefined,
            // Started, its dimensions are where it resumes.
            ...(started
              ? { href: routes.projectStrategyStep(projectId, "dimensions") }
              : { onChoose: startDirectly }),
          },
          {
            value: "call",
            title: t.choices.call.title,
            body: t.choices.call.body,
            onChoose: () => setWay("call"),
          },
        ]}
      />
      {pending && (
        <p
          role="status"
          className="text-caption text-[color:var(--text-secondary)]"
        >
          {t.starting}
        </p>
      )}
      <FieldError id="strategy-start-error">{error ?? undefined}</FieldError>
    </div>
  );
}
