"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { CallFacts, CallSource } from "@/components/calls/call-facts";
import { ConceptionCallPrep } from "@/components/design/conception-call-prep";
import { DesignBlock } from "@/components/design/design-block";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { StartChoices } from "@/components/ui/start-choices";
import { chooseDesignStart } from "@/lib/design/actions/home";
import type { DesignCallSheetData } from "@/lib/design/call-prep";
import { fr } from "@/lib/i18n/fr";

const t = fr.designSteps.home.start;

/**
 * « Comment commencer » (proto de0, depath): « Préparer un échange
 * créatif » (Recommandé) or « Commencer directement », no reason asked.
 * Once the exchange is chosen: « Départ · … choisi par … le … », « Changer »
 * until it is created, and the common call form in the step.
 */
export function DesignStartWays({
  projectId,
  chosen,
  reason,
  callData,
}: {
  projectId: string;
  // The call way chosen (« Départ »), by whom and when; null: to choose.
  chosen: { by: string; at: string } | null;
  reason: string;
  callData: DesignCallSheetData | null;
}) {
  const [pending, start] = useTransition();
  const publish = usePublishResult();
  const choose = (path: "direct" | "call" | null) =>
    start(async () => {
      const result = await chooseDesignStart(projectId, path);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (path) publish(result, path === "call" ? t.callChosen : undefined);
    });

  if (chosen)
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
                    {t.chosenCall}{" "}
                    <CallSource>{t.chosenBy(chosen.by, chosen.at)}</CallSource>
                  </>
                ),
              },
            ]}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => choose(null)}
          >
            {t.change}
          </Button>
        </div>
        {callData && <ConceptionCallPrep data={callData} stay />}
      </div>
    );

  return (
    <DesignBlock title={t.title}>
      <div aria-busy={pending || undefined}>
        <StartChoices
          fixedOrder
          recommended="call"
          reason={reason}
          choices={[
            {
              value: "call",
              title: t.call.title,
              body: t.call.body,
              onChoose: pending ? undefined : () => choose("call"),
            },
            {
              value: "direct",
              title: t.direct.title,
              body: t.direct.body,
              onChoose: pending ? undefined : () => choose("direct"),
            },
          ]}
        />
      </div>
    </DesignBlock>
  );
}
