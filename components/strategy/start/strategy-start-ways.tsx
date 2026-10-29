"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { StartChoices } from "@/components/ui/start-choices";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { strategyJourney } from "@/lib/i18n/fr/strategy-journey";
import { startStrategyDirect } from "@/lib/strategy/actions/add-line";

const fr = { strategyJourney };

/**
 * The two ways in (proto stratEntry / prepGate « strat »): « Commencer la
 * stratégie » (straight on the 8 dimensions) and « Préparer un échange »
 * (the common call form, in the step). « Recommandé » on the one the code
 * chose, its reason under the cards. The form's « Revenir au choix » goes back to
 * the cards until the exchange is created (as the Cadrage, Sacha 29/10).
 */
export function StrategyStartWays({
  projectId,
  recommended,
  reason,
  callDefaults,
}: {
  projectId: string;
  recommended: "call" | "po";
  reason: string;
  callDefaults: CallPrepDefaults;
}) {
  const t = fr.strategyJourney.start;
  const [way, setWay] = useState<"call" | null>(null);
  const { pending, error, run } = useWriteSubmit(() => undefined, t.started);
  const startDirectly = () => run(() => startStrategyDirect(projectId));

  if (way === "call")
    return (
      <CallPrepForm defaults={callDefaults} stay onBack={() => setWay(null)} />
    );

  return (
    <div className="flex flex-col gap-2" aria-busy={pending || undefined}>
      <StartChoices
        recommended={recommended}
        reason={reason}
        choices={[
          {
            value: "po",
            title: t.choices.po.title,
            body: t.choices.po.body,
            onChoose: pending ? undefined : startDirectly,
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
