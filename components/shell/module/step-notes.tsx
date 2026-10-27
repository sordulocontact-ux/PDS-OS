import { stepTools } from "@/lib/i18n/fr/step-tools";
import { openContradictions, type StepNote } from "@/lib/step-tools/model";

import { NoteGroup } from "./note-group";
import { NoteRow } from "./note-row";

const fr = { stepTools };

const t = fr.stepTools.notes;

/**
 * « Informations notées » of a step (proto stepDecisions): its notes still
 * standing, a contradiction said so, « Fait foi » for the owner. Nothing
 * when the step has none.
 */
export function StepNotes({
  projectId,
  notes,
  allNotes,
  canDecide,
}: {
  projectId: string;
  // The step's notes.
  notes: StepNote[];
  // The project's, to find the contradictions (they may cross steps).
  allNotes: StepNote[];
  canDecide: boolean;
}) {
  const list = notes.filter((n) => !n.discarded);
  if (list.length === 0) return null;
  const contra = new Set(
    openContradictions(allNotes)
      .flat()
      .map((n) => n.id),
  );
  return (
    <NoteGroup title={t.inStep}>
      <ul>
        {list.map((n) => (
          <NoteRow
            key={n.id}
            projectId={projectId}
            note={n}
            inContradiction={contra.has(n.id)}
            canDecide={canDecide}
          />
        ))}
      </ul>
      {list.some((n) => contra.has(n.id)) && (
        <p className="text-caption text-muted-foreground">
          {t.inStepContradiction}
        </p>
      )}
    </NoteGroup>
  );
}
