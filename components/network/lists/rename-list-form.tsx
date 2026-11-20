"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import { renameNetworkList } from "@/lib/network/lists-actions";

const fr = { networkLists };

/** « Renommer » a list, in the modal of its page's « ⋯ ». */
export function RenameListForm({
  listId,
  name,
  onDone,
}: {
  listId: string;
  name: string;
  onDone: () => void;
}) {
  const t = fr.networkLists;
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.rename.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const next = String(
          new FormData(event.currentTarget).get("name") ?? "",
        ).trim();
        setMissing(!next);
        if (!next) return void document.getElementById("list-rename")?.focus();
        run(() => renameNetworkList({ listId, name: next }));
      }}
    >
      <Field
        id="list-rename"
        // Back to normal as soon as it is filled (docs/DESIGN.md).
        onChange={(event) =>
          event.currentTarget.value.trim() && setMissing(false)
        }
        name="name"
        label={t.new.name}
        required
        defaultValue={name}
        maxLength={120}
        autoFocus
        autoComplete="off"
        error={missing ? t.new.nameRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.rename.submit}
        onCancel={onDone}
      />
    </form>
  );
}
