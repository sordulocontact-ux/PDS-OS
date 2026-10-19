"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { CallFacts, CallSource } from "@/components/calls/call-facts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";

/**
 * « Envoyé avec l'invitation »: the objective (computed, « Modifier » on the
 * spot), the documents (to tick when the module offers some), what the
 * module adds (Sujets, Points ouverts with their source) and its note.
 */
export function CallPrepSent({
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
  const [editing, setEditing] = useState(false);
  const goalField =
    editing || goalError ? (
      <span className="flex flex-col gap-1">
        <Textarea
          id="call-prep-goal"
          aria-label={t.goal}
          aria-invalid={goalError ? true : undefined}
          rows={2}
          maxLength={500}
          value={goal}
          onChange={(e) => onGoal(e.target.value)}
          className="font-normal"
        />
        <FieldError id="call-prep-goal-error">{goalError}</FieldError>
      </span>
    ) : (
      <span>
        {goal}{" "}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
        >
          {t.editGoal}
        </Button>
      </span>
    );
  const documents = defaults.documents
    ? defaults.documents.length === 0
      ? [
          {
            label: t.documents,
            value: <CallSource>{t.noDocuments}</CallSource>,
          },
        ]
      : [
          {
            label: t.documents,
            value: (
              <span className="flex flex-col gap-1.5">
                {defaults.documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2.5 font-normal"
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
              </span>
            ),
          },
        ]
    : [];

  return (
    <section aria-labelledby="call-prep-sent" className="flex flex-col gap-3">
      <h3 id="call-prep-sent" className="text-body-md font-semibold">
        {t.sent}
      </h3>
      <CallFacts
        facts={[
          { label: t.goal, value: goalField },
          ...documents,
          ...defaults.facts.map((fact) => ({
            label: fact.label,
            value: (
              <>
                {fact.value}
                {fact.source && <CallSource> · {fact.source}</CallSource>}
              </>
            ),
          })),
        ]}
      />
      {defaults.note && (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {defaults.note}
        </p>
      )}
    </section>
  );
}
