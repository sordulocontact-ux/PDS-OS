"use client";

import { IconUnorderedList } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  NEW_LIST_NAME_ID,
  NewListFields,
  readNewList,
} from "@/components/network/lists/new-list-fields";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useRowSelection } from "@/components/ui/row-selection";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import {
  addContactsToNetworkList,
  createNetworkList,
} from "@/lib/network/lists-actions";
import {
  networkListRoutes,
  type NetworkListOption,
} from "@/lib/network/lists-types";

const fr = { networkLists, dialogs };

// The choice of the select that makes a new list.
const NEW = "new";

/**
 * « Ajouter à une liste », in the Réseau's selection bar (Ibé, 18/11/2026:
 * « je clique sur les 3 et je fais créer une nouvelle liste »): the people
 * ticked go to one of the viewer's lists or to a new one (its name, shared
 * or not), whose page then opens. The selection is let go once added.
 */
export function AddToListButton({ lists }: { lists: NetworkListOption[] }) {
  const t = fr.networkLists.addTo;
  const { selected, clear } = useRowSelection();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <IconUnorderedList aria-hidden data-icon="inline-start" />
        {t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(selected.length)}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <AddToListForm
            lists={lists}
            contactIds={selected.map((row) => row.id)}
            onCancel={() => setOpen(false)}
            onDone={() => {
              setOpen(false);
              clear();
            }}
          />
        )}
      </FormDialog>
    </>
  );
}

function AddToListForm({
  lists,
  contactIds,
  onCancel,
  onDone,
}: {
  lists: NetworkListOption[];
  contactIds: string[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const t = fr.networkLists;
  const router = useRouter();
  // No list yet: a new one, without asking.
  const [listId, setListId] = useState(lists.length === 0 ? NEW : "");
  const [missing, setMissing] = useState<"list" | "name" | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.new.done);
  const isNew = listId === NEW;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!listId) {
          setMissing("list");
          return void document.getElementById("add-to-list")?.focus();
        }
        if (isNew) {
          const { name, shared } = readNewList(event.currentTarget);
          setMissing(name ? null : "name");
          if (!name)
            return void document.getElementById(NEW_LIST_NAME_ID)?.focus();
          return run(async () => {
            const result = await createNetworkList({
              name,
              shared,
              contactIds,
            });
            if (result.ok) router.push(networkListRoutes.list(result.id));
            return result;
          });
        }
        const list = lists.find((l) => l.id === listId);
        run(() =>
          addContactsToNetworkList({
            listId,
            listName: list?.name ?? "",
            contactIds,
          }),
        );
      }}
    >
      {lists.length > 0 && (
        <OptionSelect
          id="add-to-list"
          name="list"
          label={t.addTo.list}
          required
          placeholder={t.addTo.placeholder}
          items={{
            [NEW]: t.addTo.newList,
            ...Object.fromEntries(
              lists.map((l) => [l.id, `${l.name} · ${t.states[l.state]}`]),
            ),
          }}
          onValueChange={(value) => {
            setListId(value);
            setMissing(null);
          }}
          error={missing === "list" ? t.addTo.listRequired : undefined}
        />
      )}
      {isNew && (
        <NewListFields
          missing={missing === "name"}
          onNameFilled={() => setMissing(null)}
          autoFocus={lists.length === 0}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={isNew ? t.new.submit : t.addTo.submit}
        onCancel={onCancel}
      />
    </form>
  );
}
