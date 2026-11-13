"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/projects/option-select";
import { ChipMultiChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setMarketingTitleScope } from "@/lib/projects/title-scope-actions";
import {
  TITLE_SCOPES,
  titleScopeKindOf,
  titleScopeLabel,
  type ActionTitleScope,
  type ScopeTitle,
  type TitleScopeKind,
} from "@/lib/projects/title-scope-rules";

const fr = { dialogs, projectTitles };

/** The action a scope belongs to: a deliverable of the Stratégie or an
 * activation, with its name for the dialog. */
export type ScopedAction = {
  projectId: string;
  deliverableId?: string;
  activationId?: string;
  name: string;
};

type Props = {
  action: ScopedAction;
  scope: ActionTitleScope;
  titles: ScopeTitle[];
  canEdit: boolean;
};

/**
 * « Titres visés · Néons, Lumière » on an action's page (lot 10 of
 * docs/pds-mic-plan.md), with « Modifier » for the project's owner. A
 * collective only: the caller renders nothing for any other project.
 */
export function TitleScopeLine({ action, scope, titles, canEdit }: Props) {
  const t = fr.projectTitles.scope;
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
      <span className="text-[color:var(--text-secondary)]">
        {t.label}{" "}
        <b className="font-semibold text-[color:var(--text-primary)]">
          {titleScopeLabel(scope, titles)}
        </b>
      </span>
      {canEdit && (
        <>
          <Button
            size="xs"
            variant="ghost"
            // Its text aligned with the line's when it wraps (a phone).
            className="-ml-2.5"
            aria-label={t.editLabel(action.name)}
            onClick={() => setOpen(true)}
          >
            {t.edit}
          </Button>
          <TitleScopeDialog
            open={open}
            onOpenChange={setOpen}
            action={action}
            scope={scope}
            titles={titles}
          />
        </>
      )}
    </div>
  );
}

/** « Titres » beside an action's other gestures (a deliverable of the
 * Stratégie), opening the same dialog. */
export function TitleScopeButton({
  action,
  scope,
  titles,
  disabled,
}: Omit<Props, "canEdit"> & { disabled?: boolean }) {
  const t = fr.projectTitles.scope;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled}
        aria-label={t.editLabel(action.name)}
        onClick={() => setOpen(true)}
      >
        {t.button}
      </Button>
      <TitleScopeDialog
        open={open}
        onOpenChange={setOpen}
        action={action}
        scope={scope}
        titles={titles}
      />
    </>
  );
}

function TitleScopeDialog({
  open,
  onOpenChange,
  ...props
}: Omit<Props, "canEdit"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.projectTitles.scope;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title(props.action.name)}
      description={t.description}
      closeLabel={fr.dialogs.close}
    >
      {open && <TitleScopeForm {...props} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
}

/** One scope among four; « Certains titres » opens the titles (the live
 * ones, plus an abandoned one already targeted). Nothing ticked: said in
 * red at the first try. */
function TitleScopeForm({
  action,
  scope,
  titles,
  onDone,
}: Omit<Props, "canEdit"> & { onDone: () => void }) {
  const t = fr.projectTitles.scope;
  const [kind, setKind] = useState<TitleScopeKind>(scope.kind);
  const [picked, setPicked] = useState<string[]>(scope.titleIds);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const offered = titles.filter(
    (title) => !title.abandoned || scope.titleIds.includes(title.id),
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (kind === "titles" && picked.length === 0) return setMissing(true);
        run(() =>
          setMarketingTitleScope({
            projectId: action.projectId,
            deliverableId: action.deliverableId ?? null,
            activationId: action.activationId ?? null,
            scope: kind,
            titleIds: kind === "titles" ? picked : [],
          }),
        );
      }}
    >
      {/* Four choices with long words: a select, never two lines of
          segments in the dialog. */}
      <OptionSelect
        id={`title-scope-${action.deliverableId ?? action.activationId}`}
        name="scope"
        label={t.choice}
        required
        items={Object.fromEntries(
          TITLE_SCOPES.map((value) => [value, t.kinds[value]]),
        )}
        defaultValue={scope.kind}
        onValueChange={(next) => {
          setKind(titleScopeKindOf(next));
          setMissing(false);
        }}
      />
      {kind === "titles" &&
        (offered.length > 0 ? (
          <ChipMultiChoice
            name="titleIds"
            legend={t.pick}
            required
            options={offered.map((title) => ({
              value: title.id,
              label: title.abandoned ? t.abandoned(title.label) : title.label,
            }))}
            value={picked}
            onChange={(next) => {
              setPicked(next);
              setMissing(false);
            }}
            summary={t.picked}
            error={missing ? t.errors.titlesRequired : undefined}
          />
        ) : (
          <FormMessage kind="error">{t.noTitle}</FormMessage>
        ))}
      {kind === "all_titles" && offered.length === 0 && (
        <p className="text-caption text-muted-foreground">{t.noTitle}</p>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
