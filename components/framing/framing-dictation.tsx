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
 * Header of the framing card with the dictation button, and the dictation
 * panel right under it, next to the Brief it changes.
 */
export function FramingDictation({
  projectId,
  children,
}: {
  projectId: string;
  /** Card title and description. */
  children: ReactNode;
}) {
  const dictation = useDictation<FramingProposal>("framing", projectId);
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
              run(() => applyDictation(projectId, proposals), dictation.reset)
            }
          />
        </CardContent>
      )}
    </>
  );
}
