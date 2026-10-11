"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { DECLARATIONS, type ShootRecord } from "@/lib/production/shoot/rules";
import { saveShootDeclarations } from "@/lib/production/shoot/shoot-actions";

import { ShootFormActions } from "./shoot-form-actions";

const t = fr.productionShoot.files;

/** « Modifier » the three declarations and where the files are. Ticking is
 * a person's word: who and when are stamped by the database. */
export function DeclarationsDialog({
  projectId,
  sheetId,
  shoot,
}: {
  projectId: string;
  sheetId: string;
  shoot: ShootRecord;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {fr.productionShoot.edit}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={fr.productionShoot.close}
      >
        <DeclarationsForm
          projectId={projectId}
          sheetId={sheetId}
          shoot={shoot}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function DeclarationsForm({
  projectId,
  sheetId,
  shoot,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  shoot: ShootRecord;
  onDone: () => void;
}) {
  const { pending, error, run } = useDialogSubmit(onDone, t.done);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    run(() =>
      saveShootDeclarations({
        projectId,
        sheetId,
        videoRushes: data.has("video_rushes"),
        audioSources: data.has("audio_sources"),
        backupVerified: data.has("backup_verified"),
        filesLocation: String(data.get("filesLocation") ?? ""),
      }),
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="flex flex-col gap-3">
        {DECLARATIONS.map((key) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-3 text-sm font-medium"
          >
            <Checkbox
              name={key}
              size="md"
              defaultChecked={shoot.declarations[key].done}
            />
            {t.declarations[key]}
          </label>
        ))}
      </div>
      <Field
        id="shoot-files-location"
        name="filesLocation"
        label={t.location}
        autoComplete="off"
        maxLength={1000}
        placeholder={t.locationPlaceholder}
        hint={t.locationHint}
        defaultValue={shoot.filesLocation ?? ""}
      />
      <ShootFormActions
        pending={pending}
        error={error}
        submitLabel={fr.productionShoot.save}
        onCancel={onDone}
      />
    </form>
  );
}
