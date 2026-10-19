"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CallFacts, CallSource } from "@/components/calls/call-facts";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { Button } from "@/components/ui/button";
import { StartChoices } from "@/components/ui/start-choices";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import { startStrategyDirect } from "@/lib/strategy/actions/add-line";

/**
 * The two ways in (proto stratEntry / prepGate « strat »): « Commencer la
 * stratégie » (straight on the 8 dimensions) and « Préparer un échange »
 * (the common call form, in the step). « Recommandé » on the one the code
 * chose, its reason under the cards. « Changer » goes back to the choice
 * until the exchange is created; the form can also start directly.
 */
export function StrategyStartWays({
  projectId,
  recommended,
  reason,
  callDefaults,
  ownerName,
}: {
  projectId: string;
  recommended: "call" | "po";
  reason: string;
  callDefaults: CallPrepDefaults;
  ownerName: string | null;
}) {
  const t = fr.strategyJourney.start;
  const [way, setWay] = useState<"call" | null>(null);
  const { pending, error, run } = useWriteSubmit(() => undefined, t.started);
  const startDirectly = () => run(() => startStrategyDirect(projectId));

  if (way === "call")
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CallFacts
            className="min-w-0 flex-1"
            facts={[
              {
                label: t.departure,
                value: (
                  <>
                    {t.choseCall}{" "}
                    {ownerName && (
                      <CallSource>{t.chosenBy(ownerName)}</CallSource>
                    )}
                  </>
                ),
              },
            ]}
          />
          <Button size="sm" variant="ghost" onClick={() => setWay(null)}>
            {t.change}
          </Button>
        </div>
        <CallPrepForm
          defaults={callDefaults}
          stay
          onStartDirectly={pending ? undefined : startDirectly}
        />
        <FieldError id="strategy-start-error">{error ?? undefined}</FieldError>
      </div>
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
