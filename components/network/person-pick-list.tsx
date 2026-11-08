"use client";

import { useEffect, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CreateContactDialog } from "@/components/network/create-contact-dialog";
import type { PersonOption } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { PickList } from "@/components/ui/pick-list";
import { usePickListDone } from "@/components/ui/pick-list-context";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decisions } from "@/lib/i18n/fr/decisions";
import type { NetworkKind, NetworkRole } from "@/lib/network/types";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { decisions };

const t = fr.decisions.pick;

/**
 * « Changer » a person, saved at once (proto `pickerModal`): the same
 * options as `PersonPickerField` (`load`, the Réseau ordered by
 * `rankedNetwork`), people linked to the project first (`linkedIds`), then
 * the Réseau, searched as typed; « Créer un contact » adds to the Réseau
 * without leaving (then chooses them), « Garder seulement le nom » keeps
 * what is typed. Built on `PickList`; the module's actions save the choice.
 */
export function PersonPickList({
  load,
  linkedIds = [],
  selectedId,
  onChoose,
  onKeepName,
  createRoles,
  createKind = "person",
  refOfContact = (id) => id,
  done,
}: {
  load: (fresh?: boolean) => Promise<PersonOption[]>;
  linkedIds?: string[];
  selectedId?: string | null;
  onChoose: (id: string) => Promise<WriteResult>;
  // Absent: a contact is required (no name only).
  onKeepName?: (name: string) => Promise<WriteResult>;
  createRoles: NetworkRole[];
  createKind?: NetworkKind;
  // The option id of a contact just added to the Réseau.
  refOfContact?: (contactId: string) => string;
  done?: string;
}) {
  const closeHost = usePickListDone();
  const [options, setOptions] = useState<PersonOption[] | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [nameMissing, setNameMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(closeHost, done ?? t.done);

  useEffect(() => {
    void load().then(setOptions);
    // Loaded once, when the list opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!options)
    return <p className="text-caption text-muted-foreground">{t.loading}</p>;

  const row = (o: PersonOption) => ({
    id: o.id,
    label: o.label,
    detail: o.detail,
    avatar: { pictureUrl: null },
  });
  const linked = options.filter((o) => linkedIds.includes(o.id));
  const network = options.filter((o) => !linkedIds.includes(o.id));

  return (
    <>
      <PickList
        searchable
        groups={[
          { label: t.linked, options: linked.map(row) },
          { label: t.network, options: network.map(row) },
        ]}
        selectedId={selectedId}
        onChoose={onChoose}
        done={done}
        footer={(query) => (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setCreating(query.trim())}
              >
                {t.createContact}
              </Button>
              {onKeepName && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setNameMissing(!query.trim());
                    if (query.trim()) run(() => onKeepName(query.trim()));
                  }}
                >
                  {t.keepName}
                </Button>
              )}
            </div>
            {nameMissing && (
              <FormMessage kind="error">{t.nameRequired}</FormMessage>
            )}
            <FormMessage kind="error">{error}</FormMessage>
          </div>
        )}
      />
      <CreateContactDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        name={creating ?? ""}
        roles={createRoles}
        kind={createKind}
        onCreated={(id) => {
          setCreating(null);
          void load(true).then((list) => {
            setOptions(list);
            run(() => onChoose(refOfContact(id)));
          });
        }}
      />
    </>
  );
}
