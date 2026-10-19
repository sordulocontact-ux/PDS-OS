"use client";

import { useState, useTransition } from "react";

import { CallFacts, CallSource } from "@/components/calls/call-facts";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { Button } from "@/components/ui/button";
import { StartChoices } from "@/components/ui/start-choices";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { startFramingWithPo } from "@/lib/framing/actions/start";
import { fr } from "@/lib/i18n/fr";

/**
 * The two ways in (proto frEntry / prepGate « frame »): « Commencer le
 * cadrage » (PO reads the initial context, then asks one question at a
 * time) and « Préparer un échange » (the common call form, in the step).
 * Cards in a fixed order, « Recommandé » on the one the code chose, its
 * reason under them. « Changer » goes back to the choice until the call is
 * created; the form can also start directly.
 */
export function StartWays({
  projectId,
  recommended,
  reason,
  callDefaults,
  ownerName,
}: {
  projectId: string;
  recommended: "call" | "po";
  reason: string | null;
  callDefaults: CallPrepDefaults;
  ownerName: string | null;
}) {
  const t = fr.framingJourney.start;
  const [way, setWay] = useState<"call" | null>(null);
  const [starting, start] = useTransition();
  const startDirectly = () => start(() => startFramingWithPo(projectId));

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
          onStartDirectly={starting ? undefined : startDirectly}
        />
      </div>
    );

  return (
    <div className="flex flex-col gap-2" aria-busy={starting || undefined}>
      <StartChoices
        fixedOrder
        recommended={recommended}
        reason={reason}
        choices={[
          {
            value: "po",
            title: t.choices.po.title,
            body: t.choices.po.body,
            onChoose: starting ? undefined : startDirectly,
          },
          {
            value: "call",
            title: t.choices.call.title,
            body: t.choices.call.body,
            onChoose: () => setWay("call"),
          },
        ]}
      />
      {starting && (
        <p
          role="status"
          className="text-caption text-[color:var(--text-secondary)]"
        >
          {fr.framingIntel.entry.starting}
        </p>
      )}
    </div>
  );
}
