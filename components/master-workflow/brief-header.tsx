"use client";

import { ProjectPageActions } from "@/components/projects/project-page-actions";
import {
  toBriefItem,
  useApplyBrief,
} from "@/components/master-workflow/use-apply-brief";
import {
  DictationButton,
  DictationPanel,
} from "@/components/voice/dictation-panel";
import { useDictation } from "@/components/voice/use-dictation";
import { fr } from "@/lib/i18n/fr";
import type { BriefProposal } from "@/lib/master-workflow/brief-proposals";

/**
 * Header of the Brief Mix/Master: title, then on its right the owner's
 * actions (`actions`, then "Remplir en dictant"), and the dictation panel
 * right under it. What is kept is written into the brief; the form shows it
 * once the page refreshes.
 */
export function BriefHeader({
  projectId,
  canEdit,
  actions,
}: {
  projectId: string;
  canEdit: boolean;
  actions?: React.ReactNode;
}) {
  const t = fr.masterWorkflow.brief;
  const dictation = useDictation<BriefProposal>("master_brief", projectId);
  const { pending, apply } = useApplyBrief(projectId);
  return (
    <div className="flex flex-col gap-4">
      <ProjectPageActions>
        {canEdit && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions}
            <DictationButton dictation={dictation} label={t.dictate} />
          </div>
        )}
      </ProjectPageActions>
      {canEdit && dictation.phase.name !== "idle" && (
        <DictationPanel
          dictation={dictation}
          toItems={(proposals) => proposals.map(toBriefItem)}
          pending={pending}
          onApply={(proposals) => apply(proposals, dictation.reset)}
        />
      )}
    </div>
  );
}
