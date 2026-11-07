"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { CallFacts, CallSource } from "@/components/calls/call-facts";
import { ConceptionCallPrep } from "@/components/design/conception-call-prep";
import { DesignBlock } from "@/components/design/design-block";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { StartChoices } from "@/components/ui/start-choices";
import { routes } from "@/lib/auth/redirects";
import { chooseDesignStart } from "@/lib/design/actions/home";
import type { DesignCallSheetData } from "@/lib/design/call-prep";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

const t = fr.designSteps.home.start;

/**
 * « Comment commencer » (proto de0, depath): « Préparer un échange
 * créatif » (Recommandé) or « Commencer directement », no reason asked.
 * Once the exchange is chosen: « Départ · … choisi par … le … », « Changer »
 * until it is created, and the common call form in the step. Started
 * directly (`started`), the cards stay until the direction is submitted:
 * « Reprendre la Conception » or an exchange after all — the way in can
 * always change, as the Cadrage's and the Stratégie's (Sacha 06/11/2026).
 */
export function DesignStartWays({
  projectId,
  chosen,
  reason,
  callData,
  started = false,
  startedOn = null,
}: {
  projectId: string;
  // The call way chosen (« Départ »), by whom and when; null: to choose.
  chosen: { by: string; at: string } | null;
  reason: string | null;
  callData: DesignCallSheetData | null;
  started?: boolean;
  // « 28/10 »: when it was started, said on « Reprendre la Conception ».
  startedOn?: string | null;
}) {
  const [pending, start] = useTransition();
  const [chosenWay, setChosenWay] = useState<"direct" | "call" | null>(null);
  const publish = usePublishResult();
  const choose = (path: "direct" | "call" | null) => {
    setChosenWay(path);
    start(async () => {
      const result = await chooseDesignStart(projectId, path);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (path) publish(result, path === "call" ? t.callChosen : undefined);
    });
  };

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
    <DesignBlock title={started ? t.changeLegend : t.title}>
      <div aria-busy={pending || undefined}>
        <StartChoices
          recommended="call"
          reason={reason}
          pending={pending ? chosenWay : null}
          choices={[
            {
              value: "call",
              title: t.call.title,
              body: t.call.body,
              onChoose: () => choose("call"),
            },
            started
              ? {
                  value: "direct",
                  title: t.resume.title,
                  body: t.resume.body,
                  badge: startedOn ? t.resume.startedOn(startedOn) : undefined,
                  // Started, its intentions are where it resumes.
                  href: routes.projectDesignStep(projectId, "intentions"),
                }
              : {
                  value: "direct",
                  title: t.direct.title,
                  body: t.direct.body,
                  onChoose: () => choose("direct"),
                },
          ]}
        />
      </div>
    </DesignBlock>
  );
}
