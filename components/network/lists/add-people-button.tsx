"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  SearchPicker,
  type PickerOption,
} from "@/components/catalog/search-picker";
import { CreateContactDialog } from "@/components/network/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { toast } from "@/components/ui/toast";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import { addContactsToNetworkList } from "@/lib/network/lists-actions";

const fr = { networkLists };

/**
 * « Ajouter des personnes » to a list: the Réseau searched as typed, each
 * person picked joins the list at once (those already in it are not
 * offered); « Créer « X » dans le Réseau » adds a contact without leaving,
 * then to the list. The main gesture of a list's page, and its empty
 * state's action.
 */
export function AddPeopleButton({
  listId,
  listName,
  options,
  inList,
  variant = "default",
}: {
  listId: string;
  listName: string;
  // The live contacts of the Réseau, with what they do.
  options: PickerOption[];
  inList: string[];
  variant?: "default" | "outline";
}) {
  const t = fr.networkLists.addPeople;
  return (
    <DialogButton
      label={t.button}
      icon={IconPlus}
      variant={variant}
      size="lg"
      title={t.title}
      description={t.description}
    >
      {(close) => (
        <AddPeople
          listId={listId}
          listName={listName}
          options={options}
          inList={inList}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function AddPeople({
  listId,
  listName,
  options,
  inList,
  onDone,
}: {
  listId: string;
  listName: string;
  options: PickerOption[];
  inList: string[];
  onDone: () => void;
}) {
  const t = fr.networkLists.addPeople;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Picked here: not offered again before the page comes back.
  const [added, setAdded] = useState<string[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  function add(contactId: string, name: string) {
    setError(null);
    setAdded((current) => [...current, contactId]);
    startTransition(async () => {
      const result = await addContactsToNetworkList({
        listId,
        listName,
        contactIds: [contactId],
      });
      if (!result.ok) {
        setAdded((current) => current.filter((id) => id !== contactId));
        return setError(result.error);
      }
      toast.success(t.added(name));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchPicker
        label={t.label}
        placeholder={t.placeholder}
        options={options}
        excludedIds={new Set([...inList, ...added])}
        onPick={(id) => add(id, options.find((o) => o.id === id)?.label ?? "")}
        onCreate={(query) => setCreating(query)}
        createLabel={(query) => (query ? t.createNamed(query) : t.create)}
        noResultLabel={t.noResult}
        allSelectedLabel={t.allIn}
        openOnFocus={false}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={onDone}
        >
          {t.close}
        </Button>
      </div>
      <CreateContactDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        name={creating ?? ""}
        roles={[]}
        onCreated={(id) => {
          const name = creating ?? "";
          setCreating(null);
          add(id, name);
        }}
      />
    </div>
  );
}
