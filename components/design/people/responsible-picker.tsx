"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { formatDay } from "@/lib/assistant/facts";
import { assignDesignResponsible } from "@/lib/design/actions/people";
import type { DesignHolder } from "@/lib/design/people";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

/**
 * The responsible of the artistic direction or of a Fiche Livrable: who
 * holds it and since when; the owner designates (« Désigner »). PO's
 * suggestions come first in the list, marked as such, never pre-selected:
 * a suggestion is not an assignment (ticket § 5).
 */
export function ResponsiblePicker({
  projectId,
  scope,
  sheetId,
  current,
  members,
  suggestions,
  canAssign,
  title,
  compact = false,
}: {
  projectId: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  current: DesignHolder | null;
  members: Member[];
  suggestions: Member[];
  canAssign: boolean;
  // Defaults to « Responsable de la direction artistique » / « de la fiche ».
  title?: string;
  // The « Changer » of « Qui fait quoi » (RolesPanel): the button alone.
  compact?: boolean;
}) {
  const t = fr.conceptionIntents.people;
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className={compact ? "hidden" : "flex min-w-0 flex-col gap-0.5"}>
        <p className="text-body-md font-medium">
          {title ??
            (scope === "direction"
              ? t.responsibleTitle
              : t.sheetResponsibleTitle)}
        </p>
        <p className="text-caption text-muted-foreground">
          {current
            ? t.since(current.name, formatDay(current.since.slice(0, 10)))
            : t.none}
        </p>
      </div>
      {canAssign && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {compact && current
            ? fr.roles.change
            : current
              ? t.change
              : t.designate}
        </Button>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogBody}
        closeLabel={t.close}
      >
        <ResponsibleForm
          onDone={() => setOpen(false)}
          assign={(personId) =>
            assignDesignResponsible(projectId, scope, sheetId, personId)
          }
          members={members}
          suggestions={suggestions}
          current={current?.personId ?? null}
        />
      </FormDialog>
    </div>
  );
}

function ResponsibleForm({
  assign,
  members,
  suggestions,
  current,
  onDone,
}: {
  assign: (personId: string) => ReturnType<typeof assignDesignResponsible>;
  members: Member[];
  suggestions: Member[];
  current: string | null;
  onDone: () => void;
}) {
  const t = fr.conceptionIntents.people;
  const { pending, run } = useDesignAction();
  const suggested = new Set(suggestions.map((s) => s.personId));
  // Suggestions first (marked), then every other member, by name.
  const items = Object.fromEntries([
    ...suggestions
      .filter((s) => members.some((m) => m.personId === s.personId))
      .map((s) => [s.personId, t.suggestion(s.name)]),
    ...members
      .filter((m) => !suggested.has(m.personId) && m.name)
      .map((m) => [m.personId, m.name]),
  ]);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const personId = String(new FormData(e.currentTarget).get("personId"));
        if (!personId) return;
        run(() => assign(personId), { success: t.assigned, onSuccess: onDone });
      }}
    >
      <OptionSelect
        name="personId"
        label={t.personLabel}
        placeholder={t.personPlaceholder}
        required
        items={items}
        defaultValue={current}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.submitting} busy={pending}>
          {t.submit}
        </SubmitButton>
      </div>
    </form>
  );
}
