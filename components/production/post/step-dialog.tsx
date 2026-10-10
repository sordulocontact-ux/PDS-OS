"use client";

import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { stepLabel } from "@/lib/production/post/labels";
import type { PostStepKey } from "@/lib/production/post/rules";
import type {
  PostPeople,
  PostScope,
  PostStep,
} from "@/lib/production/post/types";

import { StepForm } from "./step-form";

const t = fr.productionPost;

/** The dialog of a step: added (from scratch or a suggestion) or modified. */
export function StepDialog({
  scope,
  people,
  open,
  step,
  initialKey,
  onClose,
}: {
  scope: PostScope;
  people: PostPeople;
  open: boolean;
  step: PostStep | null;
  initialKey: PostStepKey;
  onClose: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={step ? t.steps.editTitle(stepLabel(step)) : t.steps.addTitle}
      description={t.steps.formDescription}
      closeLabel={t.close}
    >
      <StepForm
        scope={scope}
        step={step}
        initialKey={initialKey}
        members={people.members}
        contacts={people.contacts}
        onDone={onClose}
      />
    </FormDialog>
  );
}
