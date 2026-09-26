"use client";

import type { ReactNode } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { CardAction, CardContent, CardHeader } from "@/components/ui/card";
import {
  DictationButton,
  DictationPanel,
} from "@/components/voice/dictation-panel";
import type { ReviewItem } from "@/components/voice/dictation-review";
import { useDictation } from "@/components/voice/use-dictation";
import { fr } from "@/lib/i18n/fr";
import { applyStrategyDictation } from "@/lib/strategy/actions/voice";
import type { StrategyProposal } from "@/lib/strategy/voice-proposal";

/** Words a strategy proposal for review: what changes, and to what. */
function toItem(
  p: StrategyProposal,
): ReviewItem & { proposal: StrategyProposal } {
  const kinds = fr.strategy.dictation.kinds;
  const base = { id: p.id, located: p.located, before: p.before, proposal: p };
  return p.kind === "field"
    ? {
        ...base,
        title: kinds.field(fr.strategy.fields[p.field], p.before !== null),
        after: p.value,
      }
    : {
        ...base,
        title: kinds.lever(fr.framing.needs.families[p.family]),
        after: p.label,
      };
}

/**
 * Header of the strategy card with the dictation button, and the dictation
 * panel right under it. Rendered inside the page's EditAccessProvider, so
 * the button only shows to the owner while the strategy is in progress.
 */
export function StrategyDictation({
  projectId,
  children,
}: {
  projectId: string;
  /** Card title, description and status. */
  children: ReactNode;
}) {
  const dictation = useDictation<StrategyProposal>(
    "launch_strategy",
    projectId,
  );
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();

  if (!canEdit) return <CardHeader>{children}</CardHeader>;

  return (
    <>
      <CardHeader>
        {children}
        <CardAction>
          <DictationButton dictation={dictation} />
        </CardAction>
      </CardHeader>
      {dictation.phase.name !== "idle" && (
        <CardContent>
          <DictationPanel
            dictation={dictation}
            toItems={(proposals) => proposals.map(toItem)}
            pending={pending}
            onApply={(proposals) =>
              run(
                () => applyStrategyDictation(projectId, proposals),
                dictation.reset,
              )
            }
          />
        </CardContent>
      )}
    </>
  );
}
