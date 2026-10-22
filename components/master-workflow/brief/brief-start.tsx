"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { StartChoices } from "@/components/ui/start-choices";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { startBrief } from "@/lib/master-workflow/brief-fact-actions";

const t = fr.masterBrief.start;

/**
 * « Comment voulez-vous remplir le Brief ? » (proto `briefStartChoice`):
 * two cards, the one the code recommends first with its reason.
 */
export function BriefStart({
  projectId,
  validator,
  missing,
}: {
  projectId: string;
  // The creative director PO asks the direction, when there is one.
  validator: string | null;
  missing: string[];
}) {
  const submit = useWriteSubmit(() => undefined, t.started);
  const [chosen, setChosen] = useState<"direct" | "exchange" | null>(null);
  const recommended = missing.length >= 2 ? "exchange" : "direct";
  const choose = (mode: "direct" | "exchange") => () => {
    setChosen(mode);
    submit.run(() => startBrief(projectId, mode));
  };
  return (
    <div className="flex flex-col gap-2">
      <StartChoices
        legend={t.legend}
        recommended={recommended}
        pending={submit.pending ? chosen : null}
        reason={
          recommended === "exchange" ? t.reason(missing.join(", ")) : null
        }
        choices={[
          {
            value: "direct",
            title: t.direct,
            body: t.directBody(validator),
            onChoose: choose("direct"),
          },
          {
            value: "exchange",
            title: t.exchange,
            body: t.exchangeBody,
            onChoose: choose("exchange"),
          },
        ]}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
    </div>
  );
}
