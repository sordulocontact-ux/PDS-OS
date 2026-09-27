"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addConstraint,
  updateConstraint,
} from "@/lib/framing/actions/constraints";
import {
  isConstraintType,
  type ConstraintType,
} from "@/lib/framing/constraints";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

type Constraint = FramingData["constraints"][number];

/**
 * Adds a "Cadre & contraintes" line, or corrects one (type, text, removal).
 * Mounted per opening by FormDialog: it always starts from the saved line.
 */
export function ConstraintDialog({
  projectId,
  constraint,
  open,
  onOpenChange,
}: {
  projectId: string;
  // null: a new line.
  constraint: Constraint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.framingGuide.frame;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={constraint ? t.editTitle : t.add}
      description={constraint ? t.editDescription : t.addDescription}
      closeLabel={fr.framingGuide.close}
    >
      <ConstraintForm
        projectId={projectId}
        constraint={constraint}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

function ConstraintForm({
  projectId,
  constraint,
  onDone,
}: {
  projectId: string;
  constraint: Constraint | null;
  onDone: () => void;
}) {
  const t = fr.framingGuide.frame;
  const { pending, run } = useFramingAction();
  const [type, setType] = useState<ConstraintType>(
    constraint && isConstraintType(constraint.type)
      ? constraint.type
      : "budget",
  );
  const [text, setText] = useState(constraint?.text ?? "");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            constraint
              ? updateConstraint(projectId, constraint.id, {
                  type,
                  text,
                  review_status: "confirmed",
                })
              : addConstraint(projectId, type, text),
          onDone,
        );
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="constraint-type">{t.type}</Label>
        <OptionSelect
          id="constraint-type"
          label={t.type}
          options={t.types}
          value={type}
          onChange={(v) => isConstraintType(v) && setType(v)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="constraint-text">{t.text}</Label>
        <Textarea
          id="constraint-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending || text.trim() === ""}
        >
          {fr.framingGuide.save}
        </Button>
        {constraint && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  updateConstraint(projectId, constraint.id, {
                    review_status: "rejected",
                  }),
                onDone,
              )
            }
          >
            {t.remove}
          </Button>
        )}
      </div>
    </form>
  );
}
