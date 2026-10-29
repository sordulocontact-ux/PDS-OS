"use client";

import { TextareaField } from "@/components/auth/textarea-field";
import { Checkbox } from "@/components/ui/checkbox";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

const fr = { callPrep };

/**
 * The form's last fields (Figma PDS OS 304:20801, screen 3): « Objectif de
 * l'échange », computed by the module and editable as it stands, then the
 * documents to send when the module offers some. The module's own lines
 * (Sujets, Points ouverts) are no longer shown here: they go in the
 * invitation's description (lib/calls/prep/invitation.ts).
 */
export function CallPrepGoal({
  defaults,
  goal,
  onGoal,
  goalError,
  documentIds,
  onDocuments,
}: {
  defaults: CallPrepDefaults;
  goal: string;
  onGoal: (value: string) => void;
  goalError?: string;
  documentIds: string[];
  onDocuments: (ids: string[]) => void;
}) {
  const t = fr.callPrep;
  const documents = defaults.documents ?? [];
  return (
    <>
      <TextareaField
        id="call-prep-goal"
        name="goal"
        label={t.goal}
        rows={2}
        maxLength={500}
        required
        value={goal}
        onChange={(e) => onGoal(e.target.value)}
        error={goalError}
      />
      {documents.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">{t.documents}</legend>
          {documents.map((doc) => (
            <label
              key={doc.id}
              className="flex items-center gap-2.5 text-body-md font-medium"
            >
              <Checkbox
                checked={documentIds.includes(doc.id)}
                onChange={() =>
                  onDocuments(
                    documentIds.includes(doc.id)
                      ? documentIds.filter((id) => id !== doc.id)
                      : [...documentIds, doc.id],
                  )
                }
              />
              <span className="min-w-0 break-words">{doc.name}</span>
            </label>
          ))}
        </fieldset>
      )}
      {defaults.note && (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {defaults.note}
        </p>
      )}
    </>
  );
}
