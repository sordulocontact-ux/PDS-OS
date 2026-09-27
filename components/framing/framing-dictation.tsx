"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import {
  DictationButton,
  DictationPanel,
} from "@/components/voice/dictation-panel";
import type { ReviewItem } from "@/components/voice/dictation-review";
import { useDictation } from "@/components/voice/use-dictation";
import { applyDictation } from "@/lib/framing/actions/voice";
import type { FramingProposal } from "@/lib/framing/voice-proposal";
import { fr } from "@/lib/i18n/fr";

/** Words a framing proposal for review: what changes, and to what. */
function toItem(
  p: FramingProposal,
): ReviewItem & { proposal: FramingProposal } {
  const t = fr.framing;
  const kinds = t.dictation.kinds;
  const base = { id: p.id, located: p.located, before: p.before, proposal: p };
  switch (p.kind) {
    case "brief":
      return {
        ...base,
        title: kinds.brief(t.fields[p.field], p.before !== null),
        after: p.value,
      };
    case "need":
      return {
        ...base,
        title: kinds.need(t.needs.families[p.family]),
        after: p.label,
      };
    case "constraint":
      return { ...base, title: kinds.constraint, after: p.text };
    case "team":
      return {
        ...base,
        title: kinds.team,
        after: `${p.name} · ${p.role ?? t.dictation.noRole}`,
      };
    case "open_point":
      return { ...base, title: kinds.open_point, after: p.question };
  }
}

/**
 * "Remplir en dictant": the owner says what to fill or change, PO turns it
 * into proposals for any point of the Framing, reviewed in the panel that
 * opens right under the button before anything is saved. Sits above the
 * current screen, whichever point it is.
 */
export function FramingDictation({ projectId }: { projectId: string }) {
  const dictation = useDictation<FramingProposal>("framing", projectId);
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();

  if (!canEdit) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DictationButton
          dictation={dictation}
          label={fr.framing.dictation.fill}
          size="lg"
        />
      </div>
      {dictation.phase.name !== "idle" && (
        <DictationPanel
          dictation={dictation}
          toItems={(proposals) => proposals.map(toItem)}
          pending={pending}
          onApply={(proposals) =>
            run(() => applyDictation(projectId, proposals), dictation.reset)
          }
        />
      )}
    </div>
  );
}
