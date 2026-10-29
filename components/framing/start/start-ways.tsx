"use client";

import { useState, useTransition } from "react";

import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { StartChoices } from "@/components/ui/start-choices";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { startFramingWithPo } from "@/lib/framing/actions/start";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * The two ways in (proto frEntry / prepGate « frame »): « Commencer le
 * cadrage » (PO reads the initial context, then asks one question at a
 * time) and « Préparer un échange » (the common call form, in the step).
 * « Recommandé » on the one the code chose, on the right, its reason under
 * it (Figma PDS OS 304:20801). The form's « Revenir au choix »
 * goes back to the cards until the call is created.
 */
export function StartWays({
  projectId,
  recommended,
  reason,
  callDefaults,
}: {
  projectId: string;
  recommended: "call" | "po";
  reason: string | null;
  callDefaults: CallPrepDefaults;
}) {
  const t = fr.framingJourney.start;
  const [way, setWay] = useState<"call" | null>(null);
  const [starting, start] = useTransition();
  const startDirectly = () => start(() => startFramingWithPo(projectId));

  if (way === "call")
    return (
      <CallPrepForm defaults={callDefaults} stay onBack={() => setWay(null)} />
    );

  return (
    <div className="flex flex-col gap-2" aria-busy={starting || undefined}>
      <StartChoices
        recommended={recommended}
        reason={reason}
        choices={[
          {
            value: "po",
            title: t.choices.po.title,
            body: t.choices.po.body,
            action: t.choices.po.title,
            onChoose: starting ? undefined : startDirectly,
          },
          {
            value: "call",
            title: t.choices.call.title,
            body: t.choices.call.body,
            action: t.choices.call.title,
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
