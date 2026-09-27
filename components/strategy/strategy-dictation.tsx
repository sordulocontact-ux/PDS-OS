"use client";

import type { ReactNode } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
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
 * Header of the strategy: the title, then on its right the owner's actions
 * (`actions`, then "Remplir en dictant"), and the dictation panel right
 * under it. Rendered inside the page's EditAccessProvider, so the buttons
 * only show to the owner while the strategy is in progress.
 */
export function StrategyDictation({
  projectId,
  actions,
  children,
}: {
  projectId: string;
  /** Buttons before the dictation one ("Proposer des réponses"). */
  actions?: ReactNode;
  /** Title and status. */
  children: ReactNode;
}) {
  const dictation = useDictation<StrategyProposal>(
    "launch_strategy",
    projectId,
  );
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">{children}</div>
        {canEdit && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions}
            <DictationButton
              dictation={dictation}
              label={fr.voice.fill}
              size="lg"
            />
          </div>
        )}
      </div>
      {canEdit && dictation.phase.name !== "idle" && (
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
      )}
    </div>
  );
}
