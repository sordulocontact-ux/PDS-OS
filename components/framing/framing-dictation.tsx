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
import { framing } from "@/lib/i18n/fr/framing";

const fr = { framing };

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
 * The dictation button, and the dictation panel right under it, next to the
 * Brief it changes. No title lives here: the page title is the project's own
 * (project layout) and "Cadrage" is already the active step in the workflow
 * breadcrumb just above — repeating it a third time inside the card would
 * only restate what the page already says.
 */
export function FramingDictation({
  projectId,
  children,
}: {
  projectId: string;
  /** Extra header content (title, description), if the caller has any. */
  children?: ReactNode;
}) {
  const dictation = useDictation<FramingProposal>("framing", projectId);
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();

  if (!canEdit) return children ? <CardHeader>{children}</CardHeader> : null;

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
