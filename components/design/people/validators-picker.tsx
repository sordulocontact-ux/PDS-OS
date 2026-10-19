"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { setDesignValidators } from "@/lib/design/actions/people";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

/**
 * The validators of the artistic direction or of a Fiche Livrable: named
 * by the owner as a whole (« Choisir les validateurs »). Without one, the
 * submission of that scope only is blocked (ticket, cas limites).
 */
export function ValidatorsPicker({
  projectId,
  scope,
  sheetId,
  validators,
  members,
  canEdit,
  compact = false,
}: {
  projectId: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  validators: Member[];
  members: Member[];
  canEdit: boolean;
  // The « Changer » of « Qui fait quoi » (RolesPanel): the button alone.
  compact?: boolean;
}) {
  const t = fr.conceptionIntents.people;
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className={compact ? "hidden" : "flex min-w-0 flex-col gap-0.5"}>
        <p className="text-body-md font-medium">{t.validatorsTitle}</p>
        <p className="text-caption text-muted-foreground">
          {validators.length
            ? validators.map((v) => v.name).join(", ")
            : t.noValidators}
        </p>
      </div>
      {canEdit && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {compact ? fr.roles.change : t.editValidators}
        </Button>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.validatorsDialogTitle}
        description={t.validatorsDialogBody}
        closeLabel={t.close}
      >
        <ValidatorsForm
          save={(ids) => setDesignValidators(projectId, scope, sheetId, ids)}
          members={members}
          current={validators.map((v) => v.personId)}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </div>
  );
}

function ValidatorsForm({
  save,
  members,
  current,
  onDone,
}: {
  save: (ids: string[]) => ReturnType<typeof setDesignValidators>;
  members: Member[];
  current: string[];
  onDone: () => void;
}) {
  const t = fr.conceptionIntents.people;
  const { pending, run } = useDesignAction();
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        let ids: string[] = [];
        try {
          const raw = new FormData(e.currentTarget).get("validators");
          const parsed: unknown = JSON.parse(String(raw ?? "[]"));
          if (Array.isArray(parsed)) ids = parsed.map(String);
        } catch {
          ids = [];
        }
        run(() => save(ids), { success: t.validatorsSaved, onSuccess: onDone });
      }}
    >
      <OptionSelect
        multiple
        name="validators"
        label={t.validatorsLabel}
        placeholder={t.validatorsPlaceholder}
        max={10}
        items={Object.fromEntries(
          members.filter((m) => m.name).map((m) => [m.personId, m.name]),
        )}
        defaultValue={current}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.saving} busy={pending}>
          {t.save}
        </SubmitButton>
      </div>
    </form>
  );
}
