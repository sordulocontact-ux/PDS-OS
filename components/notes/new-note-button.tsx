"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { NewNoteSheet } from "@/components/notes/new-note-sheet";
import { Button } from "@/components/ui/button";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLinkChoices } from "@/lib/notes/options";

const fr = { notes };

/**
 * « Nouvelle note » of a page (Notes, a project's notes): a blank note in
 * its side sheet (NewNoteSheet). `projectId` (a project's door) links it to
 * the project beforehand, still changeable; the choices are read by the page.
 */
export function NewNoteButton({
  choices,
  projectId,
  variant = "default",
}: {
  choices: NoteLinkChoices;
  projectId?: string;
  // « outline » beside another primary action (docs/DESIGN.md).
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const project = projectId
    ? choices.project.find((p) => p.id === projectId)
    : undefined;
  return (
    <>
      <Button variant={variant} size="lg" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden />
        {fr.notes.newNote}
      </Button>
      {open && (
        <NewNoteSheet
          choices={choices}
          initial={
            projectId
              ? {
                  link: {
                    kind: "project",
                    id: projectId,
                    label: project?.label ?? "",
                  },
                }
              : undefined
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
