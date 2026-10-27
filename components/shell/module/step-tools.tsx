"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { stepTools } from "@/lib/i18n/fr/step-tools";
import type { StepChoice, StepNote, StepRef } from "@/lib/step-tools/model";

import { BlockerForm, type BlockerDefaults } from "./blocker-form";
import { NoteForm, type NoteDefaults } from "./note-form";

const fr = { stepTools };

const t = fr.stepTools;

/**
 * « Signaler un blocage » and « Noter une information », side by side at the
 * bottom of a step (proto `detail`), each opening its form in place on a
 * soft card. The caller shows them to the team only, never on a locked step
 * (`StepToolsBlock` does both checks). `open` + `defaults`: opened already
 * filled (a draft of PO).
 */
export function StepTools({
  stepRef,
  steps,
  notes,
  open: initial = null,
  blockerDefaults,
  noteDefaults,
}: {
  stepRef: StepRef;
  steps?: StepChoice[];
  notes: StepNote[];
  open?: "blocker" | "note" | null;
  blockerDefaults?: BlockerDefaults;
  noteDefaults?: NoteDefaults;
}) {
  const [open, setOpen] = useState(initial);
  const close = () => setOpen(null);
  if (open === "blocker")
    return (
      <BlockerForm
        stepRef={stepRef}
        defaults={blockerDefaults}
        onDone={close}
      />
    );
  if (open === "note")
    return (
      <NoteForm
        stepRef={stepRef}
        steps={steps}
        notes={notes}
        defaults={noteDefaults}
        onDone={close}
      />
    );
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen("blocker")}
      >
        {t.report}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen("note")}
      >
        {t.note}
      </Button>
    </div>
  );
}
