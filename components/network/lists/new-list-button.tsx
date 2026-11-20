"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  NEW_LIST_NAME_ID,
  NewListFields,
  readNewList,
} from "@/components/network/lists/new-list-fields";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import { createNetworkList } from "@/lib/network/lists-actions";
import { networkListRoutes } from "@/lib/network/lists-types";

const fr = { networkLists, dialogs };

/** « Nouvelle liste »: its name and sharing, in the modal; the new list's
 * page opens, to add its people. */
export function NewListButton() {
  const t = fr.networkLists.new;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        {open && <NewListForm onDone={() => setOpen(false)} />}
      </FormDialog>
    </>
  );
}

function NewListForm({ onDone }: { onDone: () => void }) {
  const t = fr.networkLists.new;
  const router = useRouter();
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const { name, shared } = readNewList(event.currentTarget);
        setMissing(!name);
        if (!name)
          return void document.getElementById(NEW_LIST_NAME_ID)?.focus();
        run(async () => {
          const result = await createNetworkList({
            name,
            shared,
            contactIds: [],
          });
          if (result.ok) router.push(networkListRoutes.list(result.id));
          return result;
        });
      }}
    >
      <NewListFields
        missing={missing}
        onNameFilled={() => setMissing(false)}
        autoFocus
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
