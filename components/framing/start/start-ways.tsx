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
 * « Recommandé » on the one the code chose, on the left, its reason under
 * the cards (Figma PDS OS 304:20801). The form's « Revenir au choix »
 * goes back to the cards until the call is created. Once started with PO
 * (`started`), the cards stay: « Reprendre avec PO » or an exchange after
 * all — the way in can always change (Sacha 01/11/2026).
 */
export function StartWays({
  projectId,
  recommended,
  reason,
  callDefaults,
  started = false,
}: {
  projectId: string;
  recommended: "call" | "po";
  reason: string | null;
  callDefaults: CallPrepDefaults;
  started?: boolean;
}) {
  const t = fr.framingJourney.start;
  const [way, setWay] = useState<"call" | null>(null);
  const [starting, start] = useTransition();
  // Idempotent: once started, it reopens the questions (and reads the
  // context PO could not read the first time).
  const startDirectly = () => start(() => startFramingWithPo(projectId));
  const po = started ? t.choices.resume : t.choices.po;

  if (way === "call")
    return (
      <CallPrepForm defaults={callDefaults} stay onBack={() => setWay(null)} />
    );

  return (
    <div className="flex flex-col gap-2" aria-busy={starting || undefined}>
      <StartChoices
        legend={started ? t.changeLegend : undefined}
        recommended={recommended}
        reason={reason}
        choices={[
          {
            value: "po",
            title: po.title,
            body: po.body,
            action: po.title,
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
